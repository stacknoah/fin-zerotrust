/*
 * 살피 탐지 성능 측정 하네스
 *
 * 합성 문서(정답 포함)를 만들어 방법별로 스캔하고 정밀도·재현율을 낸다.
 * 방법: rules(규칙층만) / heuristic(규칙 근사) / llm(로컬 소형 LLM)
 *
 * 사용법
 *   node eval/run.js                      규칙층·휴리스틱만 측정
 *   node eval/run.js --llm                Ollama가 떠 있으면 LLM까지 측정
 *   node eval/run.js --llm --models kanana태그,midm태그       여러 모델 한 번에 비교
 *
 * 측정 대상은 "위반 탐지"다. 위반 = combined(결합) 또는 unique_id(고유식별정보).
 * 식별정보 단독(identifier_only)은 위반이 아니므로 정답에서 음성으로 취급한다.
 */
'use strict';

const path = require('path');
const Engine = require(path.join(__dirname, '..', 'engine.js'));
const { generate } = require(path.join(__dirname, 'generate.js'));

const argv = process.argv.slice(2);
function arg(name, def) {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
}
const useLLM = argv.includes('--llm');
const MODEL = arg('model', 'hf.co/mradermacher/kanana-2-3b-instruct-GGUF:Q4_K_M');
// --models a,b 로 여러 모델을 한 번에 비교한다
const MODELS = arg('models', MODEL).split(',').map(s => s.trim()).filter(Boolean);
// hf.co/org/repo-GGUF:Q4_K_M 같은 긴 태그를 표에 넣을 짧은 이름으로
function shortName(tag) {
  const base = tag.split(':')[0].split('/').pop().replace(/-GGUF$/i, '').replace(/-gguf$/, '');
  return base.length > 28 ? base.slice(0, 28) : base;
}
const ENDPOINT = arg('endpoint', 'http://localhost:11434');
const DOCS = Number(arg('docs', 30));
const SEED = Number(arg('seed', 20260810));

function isViolationGold(g) { return g.label === 'combined' || g.label === 'unique_id'; }

// 예측이 정답을 맞혔는지: 예측 스팬이 정답 앵커를 포함하면 매칭
function matches(pred, gold) {
  if (!gold.anchor) return false;
  return String(pred.span || '').includes(gold.anchor);
}

function scoreDoc(doc, hits) {
  const goldPos = doc.gold.filter(isViolationGold);
  const predViol = hits.filter(h => h.severity === 'violation');

  const matchedGold = new Set();
  const matchedPred = new Set();
  goldPos.forEach((g, gi) => {
    predViol.forEach((p, pi) => {
      if (matchedPred.has(pi)) return;
      if (matches(p, g)) { matchedGold.add(gi); matchedPred.add(pi); }
    });
  });

  const tp = matchedGold.size;
  const fn = goldPos.length - tp;
  const fp = predViol.length - matchedPred.size;

  const perType = {};
  goldPos.forEach((g, gi) => {
    perType[g.type] = perType[g.type] || { total: 0, hit: 0 };
    perType[g.type].total++;
    if (matchedGold.has(gi)) perType[g.type].hit++;
  });

  return { tp, fp, fn, perType };
}

function pct(x) { return (x * 100).toFixed(1) + '%'; }

function summarize(name, agg) {
  const p = agg.tp + agg.fp ? agg.tp / (agg.tp + agg.fp) : 0;
  const r = agg.tp + agg.fn ? agg.tp / (agg.tp + agg.fn) : 0;
  const f1 = p + r ? 2 * p * r / (p + r) : 0;
  return { name, tp: agg.tp, fp: agg.fp, fn: agg.fn, precision: p, recall: r, f1 };
}

async function runMethod(name, docs, opts) {
  const agg = { tp: 0, fp: 0, fn: 0 };
  const perType = {};
  const rejected = [];
  let repaired = 0;   // 보정은 제거됐으나 출력 형식 호환을 위해 유지
  const t0 = Date.now();

  for (const doc of docs) {
    const res = await Engine.scan(doc.text, opts);
    if (res.degraded) throw new Error(res.degraded);
    if (res.rejected && res.rejected.length) rejected.push(...res.rejected);
    repaired += res.repaired || 0;
    const s = scoreDoc(doc, res.hits);
    agg.tp += s.tp; agg.fp += s.fp; agg.fn += s.fn;
    for (const [k, v] of Object.entries(s.perType)) {
      perType[k] = perType[k] || { total: 0, hit: 0 };
      perType[k].total += v.total; perType[k].hit += v.hit;
    }
  }
  const elapsed = (Date.now() - t0) / 1000;
  return { summary: summarize(name, agg), perType, rejected, elapsed, repaired };
}

(async function main() {
  const docs = generate(DOCS, SEED);
  const goldCount = docs.reduce((n, d) => n + d.gold.filter(isViolationGold).length, 0);
  console.log(`합성 문서 ${docs.length}건, 위반 정답 ${goldCount}건 (seed=${SEED})\n`);

  const methods = [
    { name: '규칙층만', opts: { mode: 'rules' } },
    { name: '규칙+휴리스틱', opts: { mode: 'heuristic' } },
  ];

  if (useLLM) {
    for (const model of MODELS) {
      const av = await Engine.llmAvailable({ endpoint: ENDPOINT, model });
      if (!av.ok) {
        console.log(`LLM 사용 불가 (${av.reason}). Ollama가 떠 있는지 확인: OLLAMA_ORIGINS="*" ollama serve\n`);
        break;
      }
      if (!av.hasModel) {
        console.log(`모델 없음: ${model}`);
        console.log(`  ollama pull ${model}\n`);
        continue;
      }
      methods.push({
        name: `LLM단독: ${shortName(model)}`,
        opts: { mode: 'llm', llm: { endpoint: ENDPOINT, model } },
      });
      methods.push({
        name: `합집합: ${shortName(model)}`,
        opts: { mode: 'hybrid', llm: { endpoint: ENDPOINT, model } },
      });
    }
  }

  const results = [];
  for (const m of methods) {
    process.stdout.write(`측정 중: ${m.name} ... `);
    try {
      const r = await runMethod(m.name, docs, m.opts);
      results.push(r);
      console.log(`완료 (${r.elapsed.toFixed(1)}초)`);
    } catch (e) {
      console.log(`실패: ${e.message}`);
    }
  }

  console.log('\n' + '='.repeat(78));
  console.log('위반 탐지 성능 (위반 = 결합 또는 고유식별정보)');
  console.log('='.repeat(78));
  console.log(pad('방법', 26) + pad('정밀도', 10) + pad('재현율', 10) + pad('F1', 10) + pad('TP', 6) + pad('FP', 6) + 'FN');
  console.log('-'.repeat(78));
  for (const r of results) {
    const s = r.summary;
    console.log(
      pad(s.name, 26) + pad(pct(s.precision), 10) + pad(pct(s.recall), 10) +
      pad(pct(s.f1), 10) + pad(String(s.tp), 6) + pad(String(s.fp), 6) + String(s.fn)
    );
  }

  console.log('\n' + '='.repeat(78));
  console.log('케이스 유형별 재현율 — 놓친 유형이 다음 세대 생성 목표가 된다');
  console.log('='.repeat(78));
  const allTypes = new Set();
  results.forEach(r => Object.keys(r.perType).forEach(t => allTypes.add(t)));
  console.log(pad('유형', 24) + results.map(r => pad(r.summary.name, 20)).join(''));
  console.log('-'.repeat(78));
  for (const t of allTypes) {
    let line = pad(t, 24);
    for (const r of results) {
      const v = r.perType[t];
      line += pad(v ? `${pct(v.hit / v.total)} (${v.hit}/${v.total})` : '-', 20);
    }
    console.log(line);
  }

  const withRepaired = results.filter(r => r.repaired);
  if (withRepaired.length) {
    console.log('\n코드 보정(모델이 필드를 비운 것을 스팬에서 직접 추출해 채움):');
    for (const r of withRepaired) console.log(`  ${r.summary.name}: ${r.repaired}건`);
  }

  const withRejected = results.filter(r => r.rejected.length);
  if (withRejected.length) {
    console.log('\n환각 차단(검증 실패로 폐기된 LLM 출력):');
    for (const r of withRejected) {
      const byReason = {};
      r.rejected.forEach(x => { byReason[x.reason] = (byReason[x.reason] || 0) + 1; });
      console.log(`  ${r.summary.name}: ${JSON.stringify(byReason)}`);
      if (argv.includes('--dump')) {
        for (const x of r.rejected.slice(0, 8)) {
          console.log(`      [${x.reason}] label=${x.label} span="${x.span}"`);
        }
      }
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    seed: SEED, docs: docs.length, goldViolations: goldCount,
    results: results.map(r => ({ ...r.summary, perType: r.perType, elapsedSec: r.elapsed, rejectedCount: r.rejected.length, repaired: r.repaired })),
  };
  require('fs').writeFileSync(path.join(__dirname, 'last-run.json'), JSON.stringify(out, null, 2));
  console.log('\n결과 저장: eval/last-run.json');
})();

function pad(s, n) {
  s = String(s);
  let w = 0;
  for (const ch of s) w += /[가-힣]/.test(ch) ? 2 : 1;
  return s + ' '.repeat(Math.max(1, n - w));
}
