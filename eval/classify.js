/*
 * 목적지 분류 측정: 정적 카테고리 목록(유명 서비스만 아는 상용 DB를 흉내) 대 로컬 LLM.
 * 무명 도메인은 이름을 지어 만들었고, 정답 라벨은 이름 설계 의도.
 * 사용: node eval/classify.js
 */
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');

// [도메인, 정답 종류, 무명 여부]
const SET = [
  ['chatgpt.com', '생성형 AI 서비스', false], ['claude.ai', '생성형 AI 서비스', false], ['gemini.google.com', '생성형 AI 서비스', false],
  ['notion.so', '협업 SaaS', false], ['slack.com', '협업 SaaS', false], ['trello.com', '협업 SaaS', false],
  ['anydesk.com', '원격제어 도구', false], ['teamviewer.com', '원격제어 도구', false],
  ['dropbox.com', '개인 클라우드 저장소', false], ['box.com', '개인 클라우드 저장소', false],
  ['wetransfer.com', '파일 전송', false], ['gmail.com', '외부 웹메일', false],
  ['facebook.com', '소셜 미디어', false], ['doubleclick.net', '광고 추적', false],
  ['pcshare.kr', '원격제어 도구', true], ['screenhand.io', '원격제어 도구', true], ['pc-remote24.net', '원격제어 도구', true],
  ['webmail.daehanpost.kr', '외부 웹메일', true], ['mail.bizpost.kr', '외부 웹메일', true],
  ['mydrive24.kr', '개인 클라우드 저장소', true], ['diskbox.io', '개인 클라우드 저장소', true], ['cloudkeep.net', '개인 클라우드 저장소', true],
  ['fastsend.co.kr', '파일 전송', true], ['sendbig.io', '파일 전송', true], ['filedrop24.com', '파일 전송', true],
  ['talkline.io', '메신저', true], ['chatroom24.kr', '메신저', true],
  ['docsbase.io', '협업 SaaS', true], ['wikiteam.kr', '협업 SaaS', true], ['projecthub.co.kr', '협업 SaaS', true],
  ['aiwriter.kr', '생성형 AI 서비스', true], ['gptdesk.io', '생성형 AI 서비스', true], ['llmchat24.net', '생성형 AI 서비스', true],
  ['socialfeed.io', '소셜 미디어', true], ['adtracker24.net', '광고 추적', true], ['pixelads.io', '광고 추적', true],
];

// 정적 목록 기준선: 유명 서비스만 안다. 목록 밖은 미분류
const LOOKUP = Object.fromEntries(SET.filter(([, , u]) => !u).map(([d, k]) => [d, k]));

(async () => {
  const Engine = (await import(pathToFileURL(path.join(__dirname, '..', 'app', 'src', 'lib', 'engine.js')).href)).default;
  const rows = [];
  for (const [host, gold, unknown] of SET) {
    const base = LOOKUP[host] || '미분류';
    let ai = '미분류';
    try { const r = await Engine.llmClassifyHost(host, { count: 3, devices: 1, ports: ['443'] }); if (r) ai = r.kind; } catch (e) {}
    rows.push({ host, gold, unknown, base, ai, baseOk: base === gold, aiOk: ai === gold });
    console.log(`${host.padEnd(24)} 정답:${gold.padEnd(12)} 목록:${base === gold ? 'O' : 'X'} AI:${ai === gold ? 'O' : 'X'} (${ai})`);
  }
  const acc = (xs, f) => xs.length ? (xs.filter(f).length / xs.length * 100).toFixed(1) : '-';
  const unk = rows.filter(r => r.unknown), known = rows.filter(r => !r.unknown);
  const summary = {
    total: rows.length, unknownCount: unk.length,
    baseAll: acc(rows, r => r.baseOk), aiAll: acc(rows, r => r.aiOk),
    baseKnown: acc(known, r => r.baseOk), aiKnown: acc(known, r => r.aiOk),
    baseUnknown: acc(unk, r => r.baseOk), aiUnknown: acc(unk, r => r.aiOk),
  };
  console.log('\n전체        목록 ' + summary.baseAll + '%  AI ' + summary.aiAll + '%');
  console.log('유명 도메인  목록 ' + summary.baseKnown + '%  AI ' + summary.aiKnown + '%');
  console.log('무명 도메인  목록 ' + summary.baseUnknown + '%  AI ' + summary.aiUnknown + '%');
  fs.writeFileSync(path.join(__dirname, 'classify-run.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summary, rows }, null, 1));
})();
