/*
 * 살피(SALPI) 결합 탐지 엔진
 *
 * 3층 구조
 *   1층 규칙   : 주민번호(체크섬)·카드(Luhn)·연락처. 결정적, 브라우저에서도 동작
 *   2층 식별정보: 이름 등 식별정보 후보 탐지
 *   3층 결합   : 식별정보 × 신용정보 문맥의 결합 판단
 *                - llm 모드   : 로컬 소형 LLM(Ollama)이 판단, 코드가 검증
 *                - heuristic  : LLM 없이 근접 규칙으로 근사 (데모 기본값)
 *
 * 원칙: LLM은 후보를 제시할 뿐 위반을 확정하지 않는다.
 *       확정은 confirm()의 결정적 규칙(신용정보법 제2조 대입)이 한다.
 *
 * 브라우저와 Node 양쪽에서 쓰인다. 데모(index.html)와 측정 하네스(eval/)가
 * 같은 엔진을 쓰게 해서 "시연한 것"과 "측정한 것"이 갈라지지 않게 한다.
 */
const SalpiEngine = (function () {
  'use strict';

  /* ────────── 1층: 결정적 규칙 ────────── */

  // 주민등록번호 검증. 앞 12자리 가중합의 검증값이 13번째 자리와 일치해야 한다
  function rrnValid(s) {
    const d = s.replace(/[^0-9]/g, '');
    if (d.length !== 13) return false;
    const w = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(d[i]) * w[i];
    return (11 - (sum % 11)) % 10 === Number(d[12]);
  }

  // 카드번호 Luhn 검증
  function luhnValid(s) {
    const d = s.replace(/[^0-9]/g, '');
    if (d.length < 13) return false;
    let sum = 0, alt = false;
    for (let i = d.length - 1; i >= 0; i--) {
      let n = Number(d[i]);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }

  const PAT = {
    rrn: /\d{6}[-\s]?[1-4]\d{6}/g,
    card: /\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}/g,
    phone: /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g,
    account: /\d{3,6}[-]\d{2,6}[-]\d{2,6}/g,
  };

  function ruleScan(text) {
    const hits = [];
    for (const m of text.matchAll(PAT.rrn)) {
      const ok = rrnValid(m[0]);
      hits.push({
        layer: 'rule', label: 'unique_id', tag: '고유식별정보', span: m[0], index: m.index,
        confidence: ok ? 'high' : 'medium',
        note: ok
          ? '주민등록번호 형식과 검증값 일치. 결합 여부와 무관하게 그 자체로 요건 저촉'
          : '주민등록번호 형식이나 검증값 불일치(합성 가능성). 위반 후보로 기록',
      });
    }
    for (const m of text.matchAll(PAT.card)) {
      const ok = luhnValid(m[0]);
      hits.push({
        layer: 'rule', label: ok ? 'unique_id' : 'identifier_only', tag: '카드번호', span: m[0], index: m.index,
        confidence: ok ? 'high' : 'low',
        note: ok ? 'Luhn 검증 통과. 실번호 가능성' : '카드번호 형식이나 Luhn 불일치(합성 가능성)',
      });
    }
    for (const m of text.matchAll(PAT.phone)) {
      hits.push({
        layer: 'rule', label: 'identifier_only', tag: '연락처', span: m[0], index: m.index,
        confidence: 'high',
        note: '식별정보. 단독으로는 위반이 아니며 신용정보와의 결합 여부가 확인 대상',
      });
    }
    return hits;
  }

  /* ────────── 2층: 식별정보(이름) 후보 ────────── */

  // "홍길동 고객", "김민수 님", "이수진씨" 같은 호칭 결합형
  const NAME_PAT = /([가-힣]{2,4})\s?(고객님|고객|과장|대리|차장|부장|팀장|님|씨)/g;

  // 호칭 앞에 오지만 이름이 아닌 지시어. "해당 고객은 연체 이력이 있음" 같은 문장에서
  // 지시어를 이름으로 잡으면 오탐이 된다. 실무 문서에 매우 흔한 표현이다
  const NAME_STOP = /^(해당|당해|위|본|상기|동일|각|매|신규|기존|담당|일부|전체|다수|주요|기타|모든|타|양|현|차)$/;

  function findNames(s) {
    const out = [];
    for (const m of s.matchAll(NAME_PAT)) {
      if (NAME_STOP.test(m[1])) continue;
      out.push({ name: m[1], full: m[0], index: m.index });
    }
    return out;
  }

  /* ────────── 3층: 결합 판단 ────────── */

  // 신용정보 문맥 어휘. 신용정보법 제2조의 "거래 내용·신용도·신용거래능력" 계열
  const CREDIT_KW = /(대출|여신|연체|채무|상환|미납|한도|담보|이자|금리|신용등급|신용도|잔액|예금|적금|계좌|카드|할부|보험금|보험료|청약|투자|매매|출금|입금|송금|압류|회생|파산|신용조회|재상담|상담이력)/;

  function splitUnits(text) {
    // 줄 단위로 자르되 빈 줄은 버린다. 회의록·보고서 형식에 맞는 단위
    const units = [];
    let offset = 0;
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed) {
        units.push({ text: trimmed, start: offset + line.indexOf(trimmed) });
      }
      offset += line.length + 1;
    }
    return units;
  }

  // LLM 없이 쓰는 근사 규칙. 같은 줄에 이름과 신용 어휘가 함께 있으면 결합으로 본다
  function heuristicCombine(text) {
    const hits = [];
    for (const u of splitUnits(text)) {
      const names = findNames(u.text);
      if (!names.length) continue;
      const who = names[0].name;
      if (CREDIT_KW.test(u.text)) {
        hits.push({
          layer: 'combine', mode: 'heuristic', label: 'combined', tag: '결합',
          span: u.text, index: u.start, confidence: 'medium',
          identifier: who,
          note: `식별정보(${who})가 신용정보 문맥과 같은 줄에서 결합. 개인신용정보에 해당(신용정보법 제2조)`,
        });
      } else {
        hits.push({
          layer: 'combine', mode: 'heuristic', label: 'identifier_only', tag: '식별정보',
          span: names[0].full, index: u.start, confidence: 'medium',
          identifier: who,
          note: '이름 단독. 다른 신용정보와 결합될 때에만 신용정보',
        });
      }
    }
    return hits;
  }

  /* ────────── LLM 결합 판단 ────────── */

  const SYSTEM_PROMPT = `너는 한국 신용정보법 제2조에 따라 텍스트에서 개인신용정보를 찾아내는 검사기다.

[판단 기준]
- 식별정보(이름, 연락처 등)가 신용정보(대출, 연체, 상환, 한도, 담보, 잔액, 카드, 예금, 보험 등)와
  결합되어 특정 개인의 신용 상태를 알 수 있으면 label은 "combined"
- 결합은 한 문장 안이 아니어도 된다. 앞 줄의 이름을 뒷 줄에서 "해당 고객", "이 고객"으로
  가리키며 신용 사실을 말하면 그것도 "combined"다
- 식별정보는 있으나 신용 맥락이 전혀 없으면 label은 "identifier_only"
- 주민등록번호, 여권번호, 운전면허번호, 외국인등록번호가 있으면 label은 "unique_id"
- 신용 맥락만 있고 누구의 것인지 알 수 없으면 보고하지 않는다

[출력 규칙]
- label은 반드시 "combined", "identifier_only", "unique_id" 셋 중 하나다. 다른 값을 쓰지 마라.
- evidence_span은 입력에 있는 문자열을 그대로 복사한다. 요약하거나 고치지 마라.
- label이 "combined"이면 identifier와 credit_context를 반드시 채운다. 빈 문자열은 안 된다.
- label이 "combined"이면 evidence_span 안에 그 사람 이름이 반드시 들어가야 한다.
  신용정보가 다른 줄에 있으면, 이름이 있는 줄을 evidence_span으로 복사하고
  신용정보는 credit_context에 적어라.
- 입력에서 찾은 것을 하나도 빠뜨리지 말고 전부 findings 배열에 담아라.
- 반드시 이 형태의 JSON 하나만 출력한다:
  {"findings":[{"label":"...","evidence_span":"...","identifier":"...","credit_context":"..."}]}
- 해당 없으면 {"findings":[]}

[예시 1] 한 줄 안의 결합
입력:
1. 박지현 고객 주택담보대출 연체 3개월 경과 건.
2. 신규 상품 한도 정책은 다음 회의에서 확정.
출력: {"findings":[{"label":"combined","evidence_span":"박지현 고객 주택담보대출 연체 3개월 경과","identifier":"박지현","credit_context":"주택담보대출 연체 3개월"}]}

[예시 2] 줄을 넘어가는 결합
입력:
3. 정해나 고객 재방문 상담 진행.
   - 해당 고객은 신용대출 상환 지연 이력이 있음.
출력: {"findings":[{"label":"combined","evidence_span":"정해나 고객 재방문 상담 진행","identifier":"정해나","credit_context":"신용대출 상환 지연"}]}

[예시 3] 이름만 있는 경우
입력: 4. 김민수 고객 방문 예정.
출력: {"findings":[{"label":"identifier_only","evidence_span":"김민수 고객 방문 예정","identifier":"김민수","credit_context":""}]}

[예시 4] 지시어로 이어지는 결합
입력:
5. 최윤호 님 재방문.
   - 해당 고객은 카드 대금 미납 이력이 있음.
출력: {"findings":[{"label":"combined","evidence_span":"최윤호 님 재방문","identifier":"최윤호","credit_context":"카드 대금 미납"}]}`;

  const LABELS = ['combined', 'identifier_only', 'unique_id', 'none'];

  function norm(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  /*
   * [시도했다가 되돌린 것] 모델이 identifier·credit_context를 비운 결합 판정을
   * 코드가 스팬·창에서 뽑아 채우는 보정을 넣어봤으나 측정 결과 악화되어 제거했다.
   * 30문서 기준 보정 7건이 전부 오탐이었고 재현율은 그대로, 정밀도만 86.4%→79.5%로 떨어졌다.
   * 원인: 모델이 "회의록 제목", "카드 재발급 요청 접수"처럼 사람이 없는 줄을 결합으로
   * 라벨링하는데, 보정이 같은 창의 무관한 줄에서 이름을 끌어와 붙였다.
   * 결론: 필드가 빈 결합 판정은 폐기가 맞다. 폐기 건수는 손실이 아니라 검증층의 작동 지표다.
   */

  // LLM 출력 검증. 환각을 구조적으로 걸러낸다
  // 결합 판단에 허용되는 문맥: 이름이 있는 줄과, 바로 아래 이어지는 부연 줄까지.
  // 부연 줄 = 새 항목 번호로 시작하지 않고 다른 사람 이름도 없는 줄. 그 밖의 줄에 있는
  // 신용 문맥을 끌어다 붙이면 결합 근거로 인정하지 않는다.
  function combinedContext(units, idIdx) {
    let ctx = units[idIdx].text;
    const next = units[idIdx + 1];
    if (next && !/^\d+[.)]/.test(next.text) && findNames(next.text).length === 0) ctx += ' ' + next.text;
    return ctx;
  }

  function verifyFinding(f, text) {
    if (!f || typeof f !== 'object') return { ok: false, reason: 'not_object' };
    if (!LABELS.includes(f.label)) return { ok: false, reason: 'bad_label' };
    if (f.label === 'none') return { ok: false, reason: 'label_none' };

    const span = norm(f.evidence_span);
    if (!span) return { ok: false, reason: 'empty_span' };
    // 근거 스팬이 원문에 실제로 존재해야 한다. 없으면 지어낸 것
    if (!norm(text).includes(span)) return { ok: false, reason: 'span_not_in_source' };

    if (f.label === 'combined') {
      const id = norm(f.identifier), cc = norm(f.credit_context);
      if (!id || !cc) return { ok: false, reason: 'combined_missing_parts' };
      // 지목한 사람이 근거 스팬 안에 있어야 한다. 창의 다른 줄에 있는 이름을 끌어다
      // 붙인 판정은 그 스팬을 개인신용정보라고 부를 근거가 없다
      if (!span.includes(id)) return { ok: false, reason: 'identifier_not_in_span' };
      // 식별자는 사람 이름이어야 한다. 번호를 이름 자리에 넣은 판정은 버린다
      if (/\d/.test(id)) return { ok: false, reason: 'identifier_not_a_name' };
      // 신용 문맥이 이름 줄 또는 바로 아래 부연 줄에 실제로 있어야 한다.
      // 창 안 무관한 줄의 신용 어휘를 끌어붙인 결합을 막는다
      const units = splitUnits(text);
      const idIdx = units.findIndex(u => u.text.includes(id));
      if (idIdx >= 0) {
        const ctx = norm(combinedContext(units, idIdx));
        if (!ctx.includes(cc) && !CREDIT_KW.test(ctx)) return { ok: false, reason: 'credit_not_adjacent' };
      }
    }
    if (f.label === 'unique_id') {
      // 스팬에 실제 고유식별번호 패턴이 있어야 한다. 이름뿐인 스팬을 막는다
      if (!/\d{6}[- ]?\d{7}/.test(span) && !/(?:\d[- ]?){15,16}/.test(span)) return { ok: false, reason: 'no_unique_id_pattern' };
    }
    return { ok: true };
  }

  // 결합 판정 보정. 모델이 근거 줄을 잘못 골랐을 때, 창 안에서 결정적으로 재구성한다.
  // 조건: 지목한 이름이 창의 어느 줄에 실제로 있고, 신용 문맥도 창에 실제로 있을 것.
  function repairCombined(f, chunk) {
    let id = norm(f.identifier);
    const units = splitUnits(chunk);
    if (!id) {
      // 이름이 비어 있으면 2층 후보 중 창에 있는 이름 하나로 채워본다
      const names = findNames(chunk);
      if (names.length !== 1) return null;
      id = names[0].name;
    }
    const idIdx = units.findIndex(u => u.text.includes(id));
    if (idIdx < 0) return null;
    const idUnit = units[idIdx];
    // 신용 문맥은 이름 줄과 바로 아래 부연 줄에서만 찾는다. 검증과 같은 기준
    const ctx = combinedContext(units, idIdx);
    const cc = norm(f.credit_context);
    if (cc && norm(ctx).includes(cc)) {
      return { label: 'combined', evidence_span: idUnit.text, identifier: id, credit_context: cc };
    }
    if (!CREDIT_KW.test(ctx)) return null;
    const m = ctx.match(CREDIT_KW);
    const creditLine = ctx === idUnit.text ? idUnit.text : ctx.slice(idUnit.text.length + 1);
    return { label: 'combined', evidence_span: idUnit.text, identifier: id, credit_context: creditLine || m[0] };
  }

  async function fetchJSON(url, body, timeoutMs) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl ? ctrl.signal : undefined,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /*
   * 기본 모델 선택 근거
   *   Kanana-2-3B (카카오, 2026.07)  국내 모델 중 가장 최신. Q4 2.2GB.
   *     강점이 한국어(HAE-RAE, KMMLU)와 코딩, 약점이 수학이라 이 과제와 방향이 맞는다.
   *     우리가 쓰는 능력은 한국어 문맥 이해와 스키마 준수·문자열 정확 복사이고 수학은 안 쓴다.
   *     크기가 작아 금융사 단말 배포 시나리오까지 그대로 이어진다.
   *     라이선스는 Kanana Open License. 자기 서비스 운영은 자유(4.2조),
   *     제3자에게 API·온프레미스·온디바이스로 재판매할 때만 별도 계약 필요(4.1조).
   *
   *   대조군  hf.co/mykor/Midm-2.0-Base-Instruct-gguf:Q4_K_M
   *           KT Mi:dm 2.0 Base 11.5B, MIT. Ko-IFEval 82로 지시 준수 근거가 있고
   *           Q4 7GB. 결합 판단에서 3B가 무너지면 이쪽으로 올린다.
   *
   * 주의: 브라우저에서 file://로 열면 Ollama가 요청을 막을 수 있다.
   *       OLLAMA_ORIGINS="*" ollama serve 로 띄우거나 로컬 서버로 데모를 열 것.
   */
  const DEFAULT_LLM = {
    endpoint: 'http://localhost:11434',
    model: 'hf.co/mradermacher/kanana-2-3b-instruct-GGUF:Q4_K_M',
    timeoutMs: 30000,
  };
  // 호출 시점 평가. 배포 데모는 window.SALPI_LLM_ENDPOINT로 원격 추론 서버를 지정한다
  function llmBase(o) {
    if (typeof window !== 'undefined' && window.SALPI_LLM_ENDPOINT) return window.SALPI_LLM_ENDPOINT;
    return o.endpoint;
  }

  async function llmAvailable(opts) {
    const o = Object.assign({}, DEFAULT_LLM, opts);
    try {
      const res = await fetch(llmBase(o) + '/api/tags');
      if (!res.ok) return { ok: false, reason: 'HTTP ' + res.status };
      const j = await res.json();
      const names = (j.models || []).map(m => m.name);
      return { ok: true, models: names, hasModel: names.some(n => n.startsWith(o.model.split(':')[0])) };
    } catch (e) {
      return { ok: false, reason: String(e && e.message || e) };
    }
  }

  // 문서를 통째로 넣으면 소형 모델이 앞의 몇 개만 보고하고 멈춘다.
  // 줄 단위로 자르되 겹치는 창으로 묶어 줄 넘김 결합도 볼 수 있게 한다.
  function makeWindows(text, size, stride) {
    const units = splitUnits(text);
    const wins = [];
    for (let i = 0; i < units.length; i += stride) {
      const chunk = units.slice(i, i + size);
      if (!chunk.length) break;
      wins.push(chunk.map(u => u.text).join('\n'));
      if (i + size >= units.length) break;
    }
    return wins.length ? wins : [text];
  }

  async function llmOnce(chunk, o, hint) {
    const out = await fetchJSON(llmBase(o) + '/api/generate', {
      model: o.model,
      prompt: SYSTEM_PROMPT + (hint ? '\n\n' + hint : '') + '\n\n입력:\n' + chunk + '\n출력:',
      format: 'json',
      stream: false,
      options: { temperature: 0, num_predict: 1024 },
    }, o.timeoutMs);
    return out.response;
  }

  async function llmCombine(text, opts) {
    const o = Object.assign({}, DEFAULT_LLM, opts);
    const emit = typeof o.onEvent === 'function' ? o.onEvent : null;
    const hits = [], rejected = [];
    const seen = new Set();
    let repaired = 0;

    const windows = makeWindows(text, 3, 2);
    if (emit) emit({ type: 'start', windows: windows.length, model: o.model });
    let wi = 0;
    for (const chunk of windows) {
      wi++;
      if (emit) emit({ type: 'window', i: wi, total: windows.length, chunk });
      const t0 = Date.now();
      const winEvents = [];
      // 2층이 찾은 인물 후보를 힌트로 준다. 모델이 이름을 놓치는 것을 줄인다
      const hintNames = [...new Set(findNames(chunk).map(n => n.name))];
      const hint = hintNames.length ? '[인물 후보] 이 입력에 등장하는 인물: ' + hintNames.join(', ') : '';
      let parsed = null;
      // JSON이 깨지면 한 번 더 시도한다
      for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
        let raw;
        try { raw = await llmOnce(chunk, o, hint); } catch (e) { rejected.push({ reason: 'call_failed' }); winEvents.push({ ok: false, reason: 'call_failed' }); break; }
        try { parsed = JSON.parse(raw); }
        catch (e) { if (attempt === 1) { rejected.push({ reason: 'invalid_json', raw: String(raw).slice(0, 160) }); winEvents.push({ ok: false, reason: 'invalid_json' }); } }
      }
      if (!parsed) { if (emit) emit({ type: 'result', i: wi, total: windows.length, ms: Date.now() - t0, accepted: [], dropped: winEvents }); continue; }

      const findings = Array.isArray(parsed.findings) ? parsed.findings
                     : Array.isArray(parsed) ? parsed : [];
      const winAccepted = [], winDropped = [];
      for (const raw0 of findings) {
        let f = raw0;
        let v = verifyFinding(f, chunk);
        // 결합 후보가 스팬 문제로 떨어지면 결정적 보정을 시도한다.
        // 이름과 신용 문맥이 창 안에 실제로 있을 때만, 이름이 있는 줄로 스팬을 재구성한다.
        if (!v.ok && f && f.label === 'combined' && (v.reason === 'span_not_in_source' || v.reason === 'identifier_not_in_span' || v.reason === 'combined_missing_parts')) {
          const r = repairCombined(f, chunk);
          if (r) { f = r; v = verifyFinding(f, chunk); if (v.ok) repaired++; }
        }
        if (!v.ok) {
          rejected.push({ reason: v.reason, label: f && f.label, span: norm(f && f.evidence_span).slice(0, 60) });
          if (v.reason !== 'label_none') winDropped.push({ ok: false, reason: v.reason, span: norm(f && f.evidence_span).slice(0, 40) });
          continue;
        }
        const span = norm(f.evidence_span);
        if (seen.has(f.label + '|' + span)) continue;   // 겹치는 창에서 중복 제거
        seen.add(f.label + '|' + span);
        winAccepted.push({ label: f.label, span: span.slice(0, 40) });
        hits.push({
          layer: 'combine', mode: 'llm', label: f.label,
          tag: f.label === 'combined' ? '결합' : f.label === 'unique_id' ? '고유식별정보' : '식별정보',
          span, index: norm(text).indexOf(span),
          identifier: norm(f.identifier), credit_context: norm(f.credit_context),
          confidence: 'high',
          note: f.label === 'combined'
            ? `식별정보(${norm(f.identifier)})와 신용정보(${norm(f.credit_context)})가 결합. 개인신용정보에 해당(신용정보법 제2조)`
            : '식별정보 단독. 다른 신용정보와 결합될 때에만 신용정보',
        });
      }
      if (emit) emit({ type: 'result', i: wi, total: windows.length, ms: Date.now() - t0, accepted: winAccepted, dropped: winDropped });
    }
    if (emit) emit({ type: 'done', windows: windows.length, accepted: hits.length, dropped: rejected.filter(r => r.reason !== 'label_none').length });
    return { hits, rejected, repaired };
  }

  /* ────────── 확정: 결정적 규칙이 최종 판단 ────────── */

  // LLM/휴리스틱이 낸 후보와 규칙층 결과를 합쳐 위반을 확정한다.
  // 심각도는 고정 표로 정한다. 모델이 정하지 않는다.
  const SEVERITY = { unique_id: 'violation', combined: 'violation', identifier_only: 'info' };

  function confirm(hits) {
    const seen = new Set();
    const out = [];
    for (const h of hits) {
      const key = h.label + '|' + h.span;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(Object.assign({}, h, { severity: SEVERITY[h.label] || 'info' }));
    }
    // 같은 위반을 규칙층과 모델이 서로 다른 길이의 스팬으로 보고하면 하나만 남긴다.
    // 같은 라벨에서 다른 스팬을 포함하는 더 긴 스팬이 중복이다
    const viol = out.filter(h => SEVERITY[h.label] === 'violation');
    const dedup = out.filter(h => {
      if (SEVERITY[h.label] !== 'violation') return true;
      return !viol.some(o => o !== h && o.label === h.label && o.span !== h.span && h.span.includes(o.span));
    });
    // 같은 스팬이 결합으로도 식별정보 단독으로도 잡히면 결합이 이긴다
    const combinedSpans = new Set(dedup.filter(h => h.label === 'combined').map(h => h.span));
    return dedup.filter(h => !(h.label === 'identifier_only' && [...combinedSpans].some(s => s.includes(h.span))));
  }

  /* ────────── 통합 스캔 ────────── */

  /**
   * @param {string} text
   * @param {{mode?: 'rules'|'heuristic'|'llm'|'hybrid', llm?: object}} opts
   * @returns {Promise<{hits: Array, mode: string, degraded?: string, rejected?: Array}>}
   */
  async function scan(text, opts) {
    const o = opts || {};
    const mode = o.mode || 'heuristic';
    const ruleHits = ruleScan(text);

    if (mode === 'rules') return { hits: confirm(ruleHits), mode: 'rules' };

    if (mode === 'llm' || mode === 'hybrid') {
      // llm    : 규칙 + LLM만. LLM 단독 기여를 분리해 재기 위한 측정용
      // hybrid : 규칙 + 휴리스틱 + LLM 합집합. 실서비스 구성
      //          휴리스틱은 같은 줄 결합에 강하고 LLM은 줄 넘김·지시어 결합에 강해 서로 보완한다
      const base = mode === 'hybrid' ? ruleHits.concat(heuristicCombine(text)) : ruleHits;
      try {
        const r = await llmCombine(text, o.llm);
        return { hits: confirm(base.concat(r.hits)), mode, rejected: r.rejected, repaired: r.repaired };
      } catch (e) {
        return {
          hits: confirm(ruleHits.concat(heuristicCombine(text))),
          mode: 'heuristic',
          degraded: 'LLM 호출 실패로 규칙 근사로 강등: ' + String(e && e.message || e),
        };
      }
    }

    return { hits: confirm(ruleHits.concat(heuristicCombine(text))), mode: 'heuristic' };
  }

  // 미확인 목적지 분류. 관측 사실만 주고 종류와 위험을 JSON으로 받는다. 출력은 길이와 문자만 검증
  const CLASSIFY_PROMPT = `너는 금융회사 망분리 경계 관제 담당자다. 내부 업무망에서 승인 대장에 없는 외부 목적지로 연결이 관측됐다.
먼저 도메인 이름을 단어로 쪼개 clue에 적고, 그 단어들로 서비스 종류를 추론한다.
종류는 다음 중 하나만 고른다: 생성형 AI 서비스, 협업 SaaS, 메신저, 원격제어 도구, 개인 클라우드 저장소, 파일 전송, 외부 웹메일, 소셜 미디어, 광고 추적, 미분류
risk는 clue에 맞게 새로 쓴다. 예시 문장을 베끼지 않는다.
saas_like는 업무용 SaaS로 등재 검토가 가능한 종류(협업 SaaS, 메신저, 생성형 AI 서비스, 개인 클라우드 저장소)면 true, 아니면 false.

예시
도메인: quickvnc.io → {"clue": "quick, vnc(원격 화면 제어)", "kind": "원격제어 도구", "saas_like": false, "risk": "외부에서 내부 단말 화면을 잡고 조작할 수 있음"}
도메인: gemini.google.com → {"clue": "gemini(구글 AI)", "kind": "생성형 AI 서비스", "saas_like": true, "risk": "입력한 업무 문서가 외부 AI 학습에 쓰일 수 있음"}
도메인: bigdisk.co.kr → {"clue": "big, disk(저장소)", "kind": "개인 클라우드 저장소", "saas_like": true, "risk": "업무 파일이 개인 저장 공간으로 흘러나갈 수 있음"}
도메인: fastmailer.net → {"clue": "fast, mailer(메일)", "kind": "외부 웹메일", "saas_like": false, "risk": "업무 문서를 첨부해 외부 메일로 보낼 수 있음"}
도메인: workchat.io → {"clue": "work, chat(대화)", "kind": "메신저", "saas_like": true, "risk": "대화와 파일 공유로 고객 정보가 나갈 수 있음"}
도메인: notion.so → {"clue": "notion(문서 협업 서비스)", "kind": "협업 SaaS", "saas_like": true, "risk": "승인 없이 쓰는 문서 협업. 고객 정보가 문서로 나갈 수 있음"}

반드시 JSON 한 개만 출력한다. 형식: {"clue": "...", "kind": "...", "saas_like": true 또는 false, "risk": "60자 이내 한 문장"}`;
  async function llmClassifyHost(host, obs, opts) {
    const o = Object.assign({}, DEFAULT_LLM, opts || {});
    const input = `도메인: ${host}\n관측: 접속 ${obs.count}회, 단말 ${obs.devices}대, 포트 ${obs.ports.join(',')}`;
    const out = await fetchJSON(llmBase(o) + '/api/generate', {
      model: o.model, prompt: CLASSIFY_PROMPT + '\n\n' + input + '\n출력:', format: 'json', stream: false,
      options: { temperature: 0, num_predict: 256 },
    }, o.timeoutMs);
    let j; try { j = JSON.parse(out.response); } catch (e) { return null; }
    const clean = v => String(v || '').replace(/[<>]/g, '').trim();
    const kind = clean(j.kind).slice(0, 20), risk = clean(j.risk).slice(0, 120);
    const clue = clean(j.clue).slice(0, 48);
    if (!kind || !risk || kind === '미분류') return null;
    return { kind, saasLike: !!j.saas_like, risk, ai: true, clue: clue || undefined };
  }

  return {
    scan, ruleScan, heuristicCombine, llmCombine, llmClassifyHost, llmAvailable, confirm,
    rrnValid, luhnValid, verifyFinding, splitUnits,
    SYSTEM_PROMPT, DEFAULT_LLM, CREDIT_KW, NAME_PAT, findNames,
  };
})();
export default SalpiEngine
