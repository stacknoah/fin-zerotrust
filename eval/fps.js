// 오탐 사례 덤프: 합집합 방법으로 30문서를 돌려 정답에 없는 위반 예측을 출력
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');
const { generate } = require('./generate.js');
(async () => {
  const Engine = (await import(pathToFileURL(path.join(__dirname, '..', 'app', 'src', 'lib', 'engine.js')).href)).default;
  const docs = generate(30, 20260810);
  for (const doc of docs) {
    const res = await Engine.scan(doc.text, { mode: 'hybrid', llm: {} });
    const goldPos = doc.gold.filter(g => g.label === 'combined' || g.label === 'unique_id');
    const predViol = res.hits.filter(h => h.severity === 'violation');
    const matched = new Set();
    for (const g of goldPos) for (let pi = 0; pi < predViol.length; pi++) {
      if (!matched.has(pi) && g.anchor && String(predViol[pi].span || '').includes(g.anchor)) { matched.add(pi); break; }
    }
    predViol.forEach((p, pi) => {
      if (matched.has(pi)) return;
      console.log(`[doc ${doc.id}] ${p.mode}${p.repairedFrom ? '(보정)' : ''} ${p.label} | ${p.span} | id=${p.identifier} cc=${p.credit_context || ''}`);
    });
  }
})();
