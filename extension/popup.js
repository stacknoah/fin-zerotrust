'use strict';

function render(items) {
  const list = document.getElementById('list');
  const count = document.getElementById('count');
  count.textContent = items.length ? `${items.length}건` : '';
  if (!items.length) {
    list.innerHTML = '<div class="empty">탐지 기록 없음</div>';
    return;
  }
  list.innerHTML = items.slice().reverse().map(x => `
    <div class="row">
      <span class="tag">[${x.tag}]</span>
      <span class="meta">${new Date(x.t).toLocaleString('ko-KR')} · ${x.host}</span><br>
      <span class="span">${x.masked}</span>
    </div>`).join('');
}

chrome.storage.local.get({ wardLog: [] }, data => render(data.wardLog));

document.getElementById('clear').onclick = () => {
  chrome.storage.local.set({ wardLog: [] }, () => render([]));
};

document.getElementById('export').onclick = () => {
  chrome.storage.local.get({ wardLog: [] }, data => {
    const lines = ['시각,호스트,유형,내용(마스킹)'];
    for (const x of data.wardLog) {
      lines.push(`"${new Date(x.t).toLocaleString('ko-KR')}","${x.host}","${x.tag}","${x.masked.replace(/"/g, '""')}"`);
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ward-탐지기록-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
};
