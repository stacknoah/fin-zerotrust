import type { ScanHit } from './engine'
import { mask } from './format'

export interface Fix { from: string; to: string; why: string }
export interface Remedy { text: string; fixes: Fix[]; kept: string[] }

const TITLE = '(고객님|고객|과장|대리|차장|부장|팀장|님|씨)'
const PHONE = /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const alias = (i: number) => String.fromCharCode(65 + (i % 26))

/* 위반 구간만 손대고 나머지 문장은 그대로 둔다.
   신용정보와 결합된 이름은 가명으로, 고유식별번호는 끝 네 자리만 남긴다.
   이름 단독은 위반이 아니므로 건드리지 않는다 (신용정보법 제2조) */
export function remedy(text: string, hits: ScanHit[]): Remedy {
  const fixes: Fix[] = []
  const names: string[] = []
  for (const h of hits) if (h.severity === 'violation' && h.label === 'combined' && h.identifier && !names.includes(h.identifier)) names.push(h.identifier)
  const lines = text.split('\n')
  const hot = new Set<number>()
  lines.forEach((l, i) => { if (names.some(n => l.includes(n))) hot.add(i) })

  let out = lines.map((l, i) => {
    let s = l
    names.forEach((name, ni) => {
      const a = alias(ni)
      s = s.replace(new RegExp(esc(name) + '\\s?' + TITLE + '?', 'g'), (_m, t?: string) => {
        const to = !t ? a : t === '고객' || t === '고객님' ? '고객 ' + a : t === '님' || t === '씨' ? a + '씨' : a + ' ' + t
        if (!fixes.some(f => f.from === name)) fixes.push({ from: name, to, why: '신용정보와 결합된 이름. 가명으로 치환' })
        return to
      })
    })
    if (hot.has(i)) s = s.replace(PHONE, m => { const to = mask(m); if (!fixes.some(f => f.from === m)) fixes.push({ from: m, to, why: '결합 문맥의 연락처. 끝 네 자리만 유지' }); return to })
    return s
  }).join('\n')

  for (const h of hits) {
    if (h.severity !== 'violation' || h.label !== 'unique_id') continue
    const to = mask(h.span)
    if (to === h.span) continue
    out = out.split(h.span).join(to)
    if (!fixes.some(f => f.from === h.span)) fixes.push({ from: h.span, to, why: `${h.tag}. 끝 네 자리만 유지` })
  }

  const kept: string[] = []
  for (const h of hits) if (h.label === 'identifier_only' && h.identifier && !names.includes(h.identifier) && !kept.includes(h.identifier)) kept.push(h.identifier)
  return { text: out, fixes, kept }
}
