#!/usr/bin/env node
/*
 * 살피 배치 스캐너 — 저장 문서 주기 점검 + 반기 자체평가 증적 리포트
 *
 * 해설서 6장 "(중요정보 입력 점검) SaaS 이용 로그를 주기적으로 점검하여
 * 입력 제한 데이터가 저장·처리되었는지 점검"의 구현체다.
 * 실시간(브라우저 확장)이 놓친 유입을 사후에 잡는 두 번째 그물이기도 하다.
 *
 * 사용법
 *   node scan.js <파일|폴더> [...]              스캔하고 리포트 생성
 *   node scan.js docs/ --llm                    로컬 LLM 결합 판단 포함 (Ollama 필요)
 *   node scan.js docs/ --out report/            리포트 저장 위치 지정 (기본 salpi-report/)
 *   node scan.js docs/ --ext txt,md,csv,log     스캔할 확장자 (기본 txt,md,csv,log)
 *
 * 리포트의 민감정보 처리
 *   발견 내역의 스팬은 마스킹해서 기록한다. 위반을 찾는 도구가 위반 내용을
 *   평문으로 축적하면 그 리포트가 새 위험이 되기 때문이다. 원문 위치는
 *   파일 경로·줄 번호·해시로 특정하므로 담당자가 원본에서 확인할 수 있다.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Engine = require(path.join(__dirname, 'engine.js'));

const argv = process.argv.slice(2);
function flag(name) { return argv.includes('--' + name); }
function opt(name, def) {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
}

const targets = argv.filter(a => !a.startsWith('--') && a !== opt('out', null) && a !== opt('ext', null));
const OUT = opt('out', 'salpi-report');
const EXTS = new Set(opt('ext', 'txt,md,csv,log').split(',').map(s => '.' + s.trim().replace(/^\./, '')));
const useLLM = flag('llm');

if (!targets.length) {
  console.log('사용법: node scan.js <파일|폴더> [...] [--llm] [--out 위치] [--ext txt,md]');
  process.exit(1);
}

/* ── 파일 수집 ── */
function collect(p, acc) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(p)) {
      if (name.startsWith('.') || name === 'node_modules' || name === OUT) continue;
      collect(path.join(p, name), acc);
    }
  } else if (EXTS.has(path.extname(p).toLowerCase())) {
    acc.push(p);
  }
  return acc;
}

/* ── 마스킹: 이름은 가운데를, 긴 숫자열은 끝 4자리만 남기고 가린다 ── */
function mask(s) {
  let out = String(s)
    // 하이픈·공백 섞인 숫자열(카드, 주민번호, 전화)을 통째로 잡아 끝 4자리만 남긴다
    .replace(/\d[\d\s-]{4,}\d/g, run => {
      const total = (run.match(/\d/g) || []).length;
      if (total < 5) return run;             // 날짜·개월수 같은 짧은 숫자는 그대로
      let seen = 0;
      return run.split('').reverse().map(ch => {
        if (!/\d/.test(ch)) return ch;
        seen++;
        return seen <= 4 ? ch : '*';
      }).reverse().join('');
    })
    .replace(/([가-힣])[가-힣]([가-힣]?)(\s?(고객님|고객|님|씨))/g, '$1*$2$3'); // 이름 가운데
  return out;
}

function lineOf(text, index) {
  if (index == null || index < 0) return null;
  return text.slice(0, index).split('\n').length;
}

/* ── 스캔 ── */
(async function main() {
  const files = [];
  for (const t of targets) {
    if (!fs.existsSync(t)) { console.error('없음:', t); process.exit(1); }
    collect(path.resolve(t), files);
  }
  if (!files.length) { console.log('스캔 대상 파일이 없다. --ext 로 확장자를 지정해봐라.'); process.exit(0); }

  let mode = 'heuristic';
  if (useLLM) {
    const av = await Engine.llmAvailable();
    if (av.ok && av.hasModel) mode = 'hybrid';
    else console.log(`로컬 모델 미연결(${av.ok ? '모델 없음' : av.reason}) — 규칙+휴리스틱으로 진행\n`);
  }

  console.log(`스캔 시작: 파일 ${files.length}건, 모드 ${mode === 'hybrid' ? '규칙+휴리스틱+LLM' : '규칙+휴리스틱'}\n`);

  const findings = [];
  const errors = [];
  let scannedBytes = 0;
  const t0 = Date.now();

  for (const f of files) {
    let text;
    try { text = fs.readFileSync(f, 'utf-8'); } catch (e) { errors.push({ file: f, error: String(e.message) }); continue; }
    scannedBytes += Buffer.byteLength(text);
    const res = await Engine.scan(text, { mode });
    for (const h of res.hits) {
      const rel = path.relative(process.cwd(), f);
      findings.push({
        file: rel.startsWith('..') ? f : rel,
        line: lineOf(text, h.index),
        severity: h.severity, tag: h.tag, label: h.label,
        maskedSpan: mask(h.span),
        spanHash: crypto.createHash('sha256').update(h.span).digest('hex').slice(0, 12),
        layer: h.layer, mode: h.mode || 'rule', note: h.note,
      });
    }
    process.stdout.write(`  ${path.basename(f)}: 위반 ${res.hits.filter(h => h.severity === 'violation').length} / 확인대상 ${res.hits.filter(h => h.severity !== 'violation').length}\n`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const viol = findings.filter(x => x.severity === 'violation');
  const info = findings.filter(x => x.severity !== 'violation');
  const byTag = {};
  for (const v of viol) byTag[v.tag] = (byTag[v.tag] || 0) + 1;

  /* ── 리포트 생성 ── */
  fs.mkdirSync(OUT, { recursive: true });
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const md = `# 내부업무망 SaaS 입력 제한 데이터 점검 리포트

전자금융감독규정 시행세칙 제2조의3 제4항의 반기 자체평가 및 금융보안원 보안해설서 6장
"SaaS 이용 로그를 주기적으로 점검하여 입력 제한 데이터가 저장·처리되었는지 점검" 요구의 이행 증적.

| 항목 | 내용 |
|---|---|
| 점검 일시 | ${now.toLocaleString('ko-KR')} |
| 점검 방법 | 살피(SALPI) 배치 스캔 · ${mode === 'hybrid' ? '규칙 + 휴리스틱 + 로컬 LLM' : '규칙 + 휴리스틱'} |
| 대상 | 파일 ${files.length}건 (${(scannedBytes / 1024).toFixed(1)}KB) · 소요 ${elapsed}초 |
| 위반 | ${viol.length}건 ${Object.entries(byTag).map(([k, v]) => `${k} ${v}`).join(', ') || ''} |
| 확인 대상 | ${info.length}건 (식별정보 단독 등, 위반 아님) |

발견 내역의 원문은 마스킹되어 있다. 원본 확인은 파일 경로·줄 번호로 하고,
해시는 재점검 시 동일 항목 여부 대조용이다.

## 위반 (조치 필요)

${viol.length ? '| 파일 | 줄 | 유형 | 내용(마스킹) | 해시 |\n|---|---|---|---|---|\n' + viol.map(v =>
  `| ${v.file} | ${v.line ?? '-'} | ${v.tag} | ${v.maskedSpan} | ${v.spanHash} |`).join('\n') : '없음'}

## 확인 대상 (위반 아님 · 결합 여부 관찰)

${info.length ? '| 파일 | 줄 | 유형 | 내용(마스킹) |\n|---|---|---|---|\n' + info.map(v =>
  `| ${v.file} | ${v.line ?? '-'} | ${v.tag} | ${v.maskedSpan} |`).join('\n') : '없음'}

${errors.length ? '## 읽기 실패\n\n' + errors.map(e => `- ${e.file}: ${e.error}`).join('\n') + '\n' : ''}
## 조치 지침

위반 항목은 해설서 6장에 따라 처리한다: 해당 데이터 삭제 또는 마스킹, 유입 경로 확인,
입력 제한 기준·필터 보강. 조치 결과는 본 리포트와 함께 반기 자체평가에 첨부한다.

| 확인 | 서명 |
|---|---|
| 점검자 | |
| 정보보호최고책임자(CISO) | |

본 리포트는 살피(SALPI)가 생성한 초안이며 법적 판단을 대행하지 않는다.
`;

  const mdPath = path.join(OUT, `점검리포트-${stamp}.md`);
  fs.writeFileSync(mdPath, md);
  fs.writeFileSync(path.join(OUT, `점검리포트-${stamp}.json`), JSON.stringify({
    generatedAt: now.toISOString(), mode, files: files.length, bytes: scannedBytes,
    violations: viol, review: info, errors,
  }, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log(`위반 ${viol.length}건 · 확인 대상 ${info.length}건 · ${elapsed}초`);
  for (const [k, v] of Object.entries(byTag)) console.log(`  ${k}: ${v}건`);
  console.log('='.repeat(60));
  console.log(`증적 리포트: ${mdPath}`);
  process.exit(viol.length ? 2 : 0);   // CI·크론에서 위반 시 비정상 종료코드
})();
