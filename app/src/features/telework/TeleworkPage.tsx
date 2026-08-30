import { useStore, teleStat, type TeleSession } from '@/store'
import { PageHeader, Panel, Pill, DDay, MonoCode } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

/* HH:MM → 분. 세션 띠의 가로 위치 계산용 */
const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

function Timeline({ sessions }: { sessions: TeleSession[] }) {
  const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes()
  const start = Math.min(...sessions.map(s => mins(s.since)), nowM - 60)
  const span = Math.max(nowM - start, 30)
  const pad = span * 0.06
  const x = (m: number) => ((m - start + pad) / (span + pad * 2)) * 100
  const ticks: number[] = []
  for (let m = Math.ceil(start / 60) * 60; m <= nowM; m += 60) ticks.push(m)
  const sorted = sessions.slice().sort((a, b) => (a.check === 'fail' ? -1 : 1) - (b.check === 'fail' ? -1 : 1) || mins(a.since) - mins(b.since))
  return (
    <div className="px-5 pb-4">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-[52px] left-[174px]">
          {ticks.map(m => <div key={m} className="absolute inset-y-0 border-l border-[rgba(19,23,34,.05)]" style={{ left: x(m) + '%' }} />)}
          <div className="absolute inset-y-0 w-[1.5px] bg-ink/70" style={{ left: x(nowM) + '%' }} />
        </div>
        {sorted.map(s => (
          <div key={s.id} className="flex h-[26px] items-center gap-3">
            <span className={cn('flex w-[64px] shrink-0 items-center gap-1.5 truncate text-[12px]', s.check === 'fail' ? 'font-medium text-bad-fg' : 'text-body')}>{s.check === 'fail' && <i className="size-1.5 shrink-0 rounded-full bg-bad" />}{s.user}</span>
            <span className="w-[86px] shrink-0 truncate text-[11.5px] text-dim">{s.dept}</span>
            <div className="relative h-full flex-1">
              <span className="absolute inset-x-0 top-1/2 h-[7px] -translate-y-1/2 rounded-full bg-[rgba(19,23,34,.035)]" />
              <span className={cn('absolute top-1/2 h-[7px] -translate-y-1/2 rounded-full', s.check === 'fail' ? 'bg-bad' : 'bg-[rgba(101,112,128,.55)]')}
                style={{ left: x(mins(s.since)) + '%', right: (100 - x(nowM)) + '%' }} />
              <span className={cn('absolute top-1/2 size-[5px] -translate-y-1/2 translate-x-[2px] rounded-full', s.check === 'fail' ? 'bg-bad' : 'bg-[#4a5566]')} style={{ left: `calc(${x(nowM)}% - 5px)` }} />
            </div>
            <span className="w-[40px] shrink-0 text-right font-mono text-[11px] text-dim nums">{s.since}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex pr-[52px] pl-[174px]">
        <div className="relative h-4 flex-1">
          {ticks.map(m => (
            <span key={m} className="absolute -translate-x-1/2 font-mono text-[10.5px] text-dim nums" style={{ left: x(m) + '%' }}>{String(Math.floor(m / 60)).padStart(2, '0')}:00</span>
          ))}
          <span className="absolute -translate-x-full font-mono text-[10.5px] font-medium text-ink" style={{ left: x(nowM) + '%' }}>지금</span>
        </div>
      </div>
    </div>
  )
}

export function TeleworkPage() {
  const ledger = useStore(s => s.ledger)
  const sessions = useStore(s => s.tele.sessions)
  const feed = useStore(s => s.feed)
  const startFeed = useStore(s => s.startFeed)
  const pauseFeed = useStore(s => s.pauseFeed)
  const c = ledger.find(x => x.zone === 'tele')!
  const ts = teleStat(sessions)
  const mfa = ts.n ? Math.round((sessions.filter(x => x.mfa).length / ts.n) * 100) : 0
  const sorted = sessions.slice().sort((a, b) => (a.check === 'fail' ? -1 : 1) - (b.check === 'fail' ? -1 : 1))
  return (
    <div className="view-in">
      <PageHeader title="재택근무" crumb="재택근무"
        lead={<span><b className="font-semibold text-ink nums">{ts.n}명</b> 접속 중{ts.fail ? <>, 단말 점검 미통과 <b className="font-semibold text-bad-fg nums">{ts.fail}명</b></> : ', 단말 점검 전원 통과'}, 다중인증 통과 {mfa}%</span>}
        actions={feed.on ? <Button variant="outline" onClick={pauseFeed}>일시정지</Button> : <Button onClick={startFeed}>{feed.started ? '관측 재개' : '데모 실행'}</Button>} />
      <Panel className="mb-4" title="세션 타임라인" count={ts.n} right={<span>제12조 보안대책 적용 단말의 원격접속, <MonoCode>{c.domains[0]} :{c.ports}</MonoCode></span>}>
        <Timeline sessions={sessions} />
      </Panel>
      <div className="grid grid-cols-[1fr_320px] items-start gap-4">
        <Panel title="세션" count={ts.n} className="overflow-hidden">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="h-10 pl-5 text-[12px] font-medium text-faint">사용자</TableHead><TableHead className="text-[12px] font-medium text-faint">부서</TableHead><TableHead className="text-[12px] font-medium text-faint">위치</TableHead><TableHead className="text-[12px] font-medium text-faint">접속</TableHead><TableHead className="text-[12px] font-medium text-faint">다중인증</TableHead><TableHead className="text-[12px] font-medium text-faint">단말 점검 (규정 제12조)</TableHead></TableRow></TableHeader>
            <TableBody>
              {sorted.map(x => (
                <TableRow key={x.id} className={cn(x.check === 'fail' && 'bg-[#fff8f8] hover:bg-[#fff2f2]')}>
                  <TableCell className="pl-5 text-ink">{x.user}</TableCell><TableCell className="text-body">{x.dept}</TableCell><TableCell className="text-body">{x.region}</TableCell><TableCell className="font-mono text-[12px] nums">{x.since}</TableCell>
                  <TableCell>{x.mfa ? <Pill tone="ok">통과</Pill> : <Pill tone="bad">실패</Pill>}</TableCell>
                  <TableCell>{x.check === 'ok' ? <Pill tone="ok">통과</Pill> : <span className="flex items-center gap-2"><Pill tone="bad">미통과</Pill><span className="text-xs text-body">{x.checkNote}</span></span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
        <Panel title={c.name} count={<span className="font-mono text-[12px]">{c.id}</span>} right={<DDay due={c.review.due} />}>
          <dl className="grid grid-cols-[84px_1fr] gap-x-4 gap-y-2 px-5 pb-5 text-[13px]">
            <dt className="text-faint">근거 조문</dt><dd className="text-ink">{c.basis}</dd>
            <dt className="text-faint">도메인</dt><dd className="text-ink"><MonoCode>{c.domains.join(', ')} :{c.ports}</MonoCode></dd>
            <dt className="text-faint">방향</dt><dd className="text-ink">{c.dir}</dd>
            <dt className="text-faint">승인</dt><dd className="text-ink">{c.approved}</dd>
            <dt className="text-faint">적용 통제</dt><dd className="text-ink">{c.controls}</dd>
            <dt className="text-faint">다음 의무</dt><dd className="text-ink">{c.review.type} {c.review.due}</dd>
            <dt className="text-faint">점검 출처</dt><dd className="text-ink">단말 관리(EDR, MDM) 연동. 데모는 합성 데이터</dd>
          </dl>
        </Panel>
      </div>
    </div>
  )
}
