import { useStore } from '@/store'
import { StatStrip } from '@/components/StatStrip'
import { PageHeader, Panel } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { EventRow } from '@/features/home/HomePage'

export function ActivityPage() {
  const feed = useStore(s => s.feed)
  const events = useStore(s => s.events)
  const detReady = useStore(s => s.detReady)
  const startFeed = useStore(s => s.startFeed)
  const pauseFeed = useStore(s => s.pauseFeed)
  const lines = feed.lines.slice().reverse()
  const evs = events.slice().reverse()
  return (
    <div className="view-in">
      <StatStrip />
      <PageHeader title="활동 기록" crumb="활동 기록" actions={feed.on ? <Button variant="outline" onClick={pauseFeed}>일시정지</Button> : <Button onClick={startFeed}>{feed.started ? '관측 재개' : '데모 실행'}</Button>} />
      <Panel title="AI 활동" count={`${evs.length}건`} right={detReady ? 'Kanana-2-3B' : 'AI 미연결'} className="mb-4">
        <div className="pb-2">{evs.length ? evs.map(e => <EventRow key={e.id} e={e} full />) : <div className="px-5 pb-3 text-[13px] text-dim">기록 없음</div>}</div>
      </Panel>
      <Panel title="관측 피드" count={`${lines.length}줄`} right={`데모 피드(합성)${feed.last ? ', 마지막 수신 ' + feed.last : ''}`}>
        <div className="max-h-[520px] overflow-auto px-5 pt-1 pb-3 font-mono text-[11.5px] leading-5 text-body">
          {lines.length ? lines.map((l, i) => <div key={i} className="whitespace-nowrap">{l}</div>) : <div className="text-[13px] text-dim">수신 없음</div>}
        </div>
      </Panel>
    </div>
  )
}
