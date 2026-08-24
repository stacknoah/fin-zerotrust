import { useState } from 'react'
import { useStore, type EventKind } from '@/store'
import { PageHeader, Panel } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { EventRow, FeedLine } from '@/features/home/HomePage'
import { cn } from '@/lib/utils'

const FILTERS: { key: string; label: string; kinds: EventKind[] | null }[] = [
  { key: 'all', label: '전체', kinds: null },
  { key: 'ai', label: 'AI', kinds: ['ai', 'content'] },
  { key: 'found', label: '발견', kinds: ['rogue', 'scan', 'tele'] },
  { key: 'action', label: '조치', kinds: ['block', 'register'] },
]

export function ActivityPage() {
  const feed = useStore(s => s.feed)
  const events = useStore(s => s.events)
  const detReady = useStore(s => s.detReady)
  const ledger = useStore(s => s.ledger)
  const startFeed = useStore(s => s.startFeed)
  const pauseFeed = useStore(s => s.pauseFeed)
  const [f, setF] = useState('all')
  const kinds = FILTERS.find(x => x.key === f)?.kinds ?? null
  const evs = events.slice().reverse().filter(e => !kinds || kinds.includes(e.kind))
  const lines = feed.lines.slice().reverse()
  const counts = (ks: EventKind[] | null) => ks ? events.filter(e => ks.includes(e.kind)).length : events.length
  return (
    <div className="view-in">
      <PageHeader title="활동 기록" crumb="활동 기록"  actions={feed.on ? <Button variant="outline" onClick={pauseFeed}>일시정지</Button> : <Button onClick={startFeed}>{feed.started ? '관측 재개' : '데모 실행'}</Button>} />
      <div className="grid grid-cols-[7fr_5fr] items-start gap-4">
        <Panel title="AI 활동" right={detReady ? <span className="inline-flex items-center gap-1.5 font-mono text-[11px]"><i className="size-1.5 rounded-full bg-ok" />Kanana 2 3B, {window.SALPI_LLM_ENDPOINT ? '원격' : '로컬'} 추론</span> : 'AI 미연결'} className="bg-[#f7faff] shadow-[0_0_0_1px_rgba(33,87,209,.14),var(--shadow-card)]">
          <div className="flex gap-1.5 px-5 pb-3">
            {FILTERS.map(x => (
              <button key={x.key} onClick={() => setF(x.key)} className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors', f === x.key ? 'bg-accent font-semibold text-primary' : 'text-faint hover:bg-[rgba(19,23,34,.05)] hover:text-ink')}>
                {x.label}<span className={cn('font-mono text-[11px] nums', 'text-dim')}>{counts(x.kinds)}</span>
              </button>
            ))}
          </div>
          <div className="max-h-[560px] overflow-auto border-t border-[rgba(19,23,34,.06)] pt-1 pb-2">
            {evs.length ? evs.map(e => <EventRow key={e.id} e={e} full />) : <div className="px-5 py-3 text-[13px] text-dim">기록 없음{f !== 'all' && `, ${FILTERS.find(x => x.key === f)?.label} 유형`}</div>}
          </div>
        </Panel>
        <Panel title="관측 피드" count={`${lines.length}줄`} right={`데모 피드(합성)${feed.last ? `, 마지막 수신 ${feed.last}` : ''}`}>
          <div className="max-h-[560px] min-h-[200px] overflow-auto px-5 pt-1 pb-4 font-mono text-[11.5px] leading-[21px]">
            {lines.length ? lines.map((l, i) => <FeedLine key={i} l={l} ledger={ledger} />) : <div className="text-[12.5px] text-dim">수신 없음</div>}
          </div>
        </Panel>
      </div>
    </div>
  )
}
