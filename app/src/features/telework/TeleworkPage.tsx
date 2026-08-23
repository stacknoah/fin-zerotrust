import { useStore, teleStat } from '@/store'
import { StatStrip } from '@/components/StatStrip'
import { PageHeader, Panel, Pill, DDay, MonoCode } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export function TeleworkPage() {
  const ledger = useStore(s => s.ledger)
  const sessions = useStore(s => s.tele.sessions)
  const feed = useStore(s => s.feed)
  const startFeed = useStore(s => s.startFeed)
  const pauseFeed = useStore(s => s.pauseFeed)
  const c = ledger.find(x => x.zone === 'tele')!
  const ts = teleStat(sessions)
  const depts = new Set(sessions.map(x => x.dept)).size
  const mfa = ts.n ? Math.round((sessions.filter(x => x.mfa).length / ts.n) * 100) : 0
  const sorted = sessions.slice().sort((a, b) => (a.check === 'fail' ? -1 : 1) - (b.check === 'fail' ? -1 : 1))
  const Stat = ({ l, n, bad }: { l: string; n: string | number; bad?: boolean }) => (
    <div className="border-l px-5 py-2.5 first:border-l-0"><span className="block text-[12.5px] text-faint">{l}</span><b className={cn('block text-[26px] font-semibold leading-8 tracking-tight tabular-nums text-ink', bad && 'text-bad-fg')}>{n}</b></div>
  )
  return (
    <div className="view-in">
      <StatStrip />
      <PageHeader title="재택근무" crumb="재택근무" actions={feed.on ? <Button variant="outline" onClick={pauseFeed}>일시정지</Button> : <Button onClick={startFeed}>{feed.started ? '관측 재개' : '데모 실행'}</Button>} />
      <div className="mb-4 grid grid-cols-4 rounded-lg border bg-card px-2 py-1.5"><Stat l="접속 중" n={ts.n} /><Stat l="단말 점검 미통과" n={ts.fail} bad={ts.fail > 0} /><Stat l="다중인증 통과" n={mfa + '%'} /><Stat l="접속 부서" n={depts} /></div>
      <Panel className="mb-4" title={`${c.id} ${c.name}`} count={<Pill>{c.type}</Pill>} right={<DDay due={c.review.due} />}>
        <dl className="grid max-w-[860px] grid-cols-[120px_1fr] gap-x-5 gap-y-1.5 px-5 pb-5 text-sm">
          <dt className="text-faint">근거 조문</dt><dd className="text-ink">{c.basis}</dd>
          <dt className="text-faint">연결</dt><dd className="text-ink"><MonoCode>{c.domains.join(', ')} :{c.ports}</MonoCode> <span className="ml-1">{c.dir}</span></dd>
          <dt className="text-faint">승인</dt><dd className="text-ink">{c.approved}</dd>
          <dt className="text-faint">적용 통제</dt><dd className="text-ink">{c.controls}</dd>
          <dt className="text-faint">다음 의무</dt><dd className="text-ink">{c.review.type} {c.review.due}</dd>
        </dl>
      </Panel>
      <Panel title="세션" count={ts.n} className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="pl-5">사용자</TableHead><TableHead>부서</TableHead><TableHead>위치</TableHead><TableHead>접속</TableHead><TableHead>다중인증</TableHead><TableHead>단말 점검 (규정 제12조)</TableHead></TableRow></TableHeader>
          <TableBody>
            {sorted.map(x => (
              <TableRow key={x.id} className={cn(x.check === 'fail' && 'bg-[#fff7f7] hover:bg-[#fff1f1]')}>
                <TableCell className="pl-5 text-ink">{x.user}</TableCell><TableCell>{x.dept}</TableCell><TableCell>{x.region}</TableCell><TableCell className="font-mono">{x.since}</TableCell>
                <TableCell>{x.mfa ? <Pill tone="ok">통과</Pill> : <Pill tone="bad">실패</Pill>}</TableCell>
                <TableCell>{x.check === 'ok' ? <Pill tone="ok">통과</Pill> : <span className="flex items-center gap-2"><Pill tone="bad">미통과</Pill><span className="text-xs text-body">{x.checkNote}</span></span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </div>
  )
}
