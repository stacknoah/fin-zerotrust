import { useStore, detectCount } from '@/store'
import { cn } from '@/lib/utils'

function Donut({ groups }: { groups: Record<string, number> }) {
  const colors = ['#2157d1', '#7fa6ef', '#bcd0f5', '#84d59b', '#f3d27f']
  const total = Object.values(groups).reduce((a, b) => a + b, 0) || 1
  const R = 15, C = 2 * Math.PI * R
  let off = 0
  return (
    <svg width="38" height="38" viewBox="0 0 38 38">
      {Object.values(groups).map((n, i) => {
        const len = (n / total) * C
        const el = <circle key={i} r={R} cx="19" cy="19" fill="none" stroke={colors[i % colors.length]} strokeWidth="7" strokeDasharray={`${Math.max(len - 1.6, 0.5)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 19 19)" />
        off += len
        return el
      })}
    </svg>
  )
}

export function StatStrip() {
  const ledger = useStore(s => s.ledger)
  const rogues = useStore(s => s.rogues)
  const blocked = useStore(s => s.blocked)
  const scanned = useStore(s => s.scanned)
  const contentLog = useStore(s => s.contentLog)
  const saasDue = ledger.filter(c => c.review.soon && c.review.type.includes('반기')).length
  const reviewDue = ledger.filter(c => c.review.soon && !c.review.type.includes('반기')).length
  const detects = detectCount(contentLog)
  const groups: Record<string, number> = {}
  for (const c of ledger) groups[c.type] = (groups[c.type] || 0) + 1
  const items: { l: string; n: string | number; tone?: string; viz?: React.ReactNode }[] = [
    { l: '승인된 통로', n: ledger.length, viz: <Donut groups={groups} /> },
    { l: '반기 평가 예정', n: saasDue, tone: saasDue ? 'text-warn-fg' : '' },
    { l: '재승인 필요', n: reviewDue, tone: reviewDue ? 'text-warn-fg' : '' },
    { l: '미등록 연결', n: scanned ? rogues.length : '-', tone: rogues.length ? 'text-bad-fg' : '' },
    { l: '위반 탐지', n: detects, tone: detects ? 'text-ok-fg' : '' },
  ]
  if (blocked.length) items.push({ l: '차단 확정', n: blocked.length })
  return (
    <div className="mb-4 grid rounded-lg border bg-card px-2 py-1.5" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it, i) => (
        <div key={it.l} className={cn('flex items-center gap-3 px-4 py-2.5', i > 0 && 'border-l')}>
          <span className="min-w-0">
            <span className="block text-[12.5px] text-faint whitespace-nowrap">{it.l}</span>
            <b className={cn('block text-[26px] font-semibold leading-8 tracking-tight tabular-nums text-ink', it.tone)}>{it.n}</b>
          </span>
          {it.viz && <span className="ml-auto shrink-0">{it.viz}</span>}
        </div>
      ))}
    </div>
  )
}
