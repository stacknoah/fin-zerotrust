/*
 * 결계 WARD 콘텐트 스크립트 — 입력 시점 탐지
 *
 * SaaS 웹 입력창(textarea, contenteditable)을 감시하다가 개인신용정보의
 * 결합이 나타나면 전송 전에 경고한다. 해설서 6장 "데이터 입력 시 사전에 필터 적용"의
 * 보완통제 구현이다.
 *
 * 원칙
 * - 모든 판단은 이 브라우저 안에서 끝난다. 네트워크 전송이 없다 (v1은 규칙+휴리스틱).
 * - 차단하지 않고 경고한다. 업무를 멈추는 도구가 아니라 알아채게 하는 도구다.
 * - 기록은 마스킹해서 남긴다. 감시 도구가 민감정보를 축적하면 자기모순이다.
 */
'use strict';

(function () {
  const DEBOUNCE_MS = 600;
  const MAX_LOG = 200;
  const timers = new WeakMap();
  let banner = null;

  /* 리포트와 같은 마스킹 규칙: 긴 숫자열은 끝 4자리, 이름은 가운데 글자 */
  function mask(s) {
    return String(s)
      .replace(/\d[\d\s-]{4,}\d/g, run => {
        const total = (run.match(/\d/g) || []).length;
        if (total < 5) return run;
        let seen = 0;
        return run.split('').reverse().map(ch => {
          if (!/\d/.test(ch)) return ch;
          seen++;
          return seen <= 4 ? ch : '*';
        }).reverse().join('');
      })
      .replace(/([가-힣])[가-힣]([가-힣]?)(\s?(고객님|고객|님|씨))/g, '$1*$2$3');
  }

  function getText(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || '';
    if (el.isContentEditable) return el.innerText || '';
    return '';
  }

  function isWatchable(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search' || !el.type)) return true;
    return !!el.isContentEditable;
  }

  function log(violations) {
    const items = violations.map(v => ({
      t: Date.now(),
      host: location.host,
      tag: v.tag,
      masked: mask(v.span).slice(0, 80),
    }));
    chrome.storage.local.get({ wardLog: [] }, data => {
      const next = data.wardLog.concat(items).slice(-MAX_LOG);
      chrome.storage.local.set({ wardLog: next });
    });
  }

  function showBanner(violations) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'ward-banner';
      banner.style.cssText = [
        'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483647',
        'max-width:360px', 'background:#fff', 'color:#1b1e24',
        'border:1.5px solid #a83226', 'border-left:5px solid #a83226',
        'padding:12px 14px', 'font:13px/1.5 "Apple SD Gothic Neo",sans-serif',
        'box-shadow:0 4px 18px rgba(0,0,0,.18)', 'border-radius:6px',
      ].join(';');
      document.documentElement.appendChild(banner);
    }
    const rows = violations.slice(0, 3).map(v =>
      `<div style="margin-top:6px"><b style="color:#a83226">[${v.tag}]</b> ${mask(v.span).slice(0, 48)}</div>`
    ).join('');
    banner.innerHTML =
      `<div style="font-weight:800">결계 WARD: 개인신용정보 입력 감지</div>${rows}` +
      `<div style="margin-top:8px;font-size:11.5px;color:#5d6068">이 SaaS는 개인신용정보를 처리하지 않는 조건으로 승인되었다(시행세칙 제2조의3). 전송 전에 해당 내용을 지우거나 마스킹할 것.</div>`;
    banner.style.display = 'block';
  }

  function hideBanner() {
    if (banner) banner.style.display = 'none';
  }

  async function check(el) {
    const text = getText(el);
    if (!text.trim()) { el.style.outline = ''; hideBanner(); return; }

    const res = await WardEngine.scan(text, { mode: 'heuristic' });
    const violations = res.hits.filter(h => h.severity === 'violation');

    if (violations.length) {
      el.style.outline = '2px solid #a83226';
      el.style.outlineOffset = '1px';
      showBanner(violations);
      log(violations);
    } else {
      el.style.outline = '';
      hideBanner();
    }
  }

  document.addEventListener('input', e => {
    const el = e.target;
    if (!isWatchable(el)) return;
    clearTimeout(timers.get(el));
    timers.set(el, setTimeout(() => check(el), DEBOUNCE_MS));
  }, true);
})();
