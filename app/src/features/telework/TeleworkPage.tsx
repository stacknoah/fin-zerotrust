import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useStore, teleStat, type TeleSession } from '@/store'
import { PageHeader, Panel, Pill, DDay, MonoCode, PageIntro } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

/* HH:MM → 분. 세션 띠의 가로 위치 계산용 */
const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

type Hover = { s: TeleSession; x: number; y: number }

/* 상태별 색: 정상 파랑, 다중인증 대기 주황, 단말 점검 미통과 빨강 */
const barTone = (s: TeleSession) => s.check === 'fail' ? 'bg-bad' : !s.mfa ? 'bg-warn' : 'bg-[rgba(33,87,209,.42)]'
const dotTone = (s: TeleSession) => s.check === 'fail' ? 'bg-bad' : !s.mfa ? 'bg-warn' : 'bg-[#2157d1]'
const stateOrder = (s: TeleSession) => s.check === 'fail' ? 0 : !s.mfa ? 1 : 2

function Timeline({ sessions }: { sessions: TeleSession[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<Hover | null>(null)
  const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes()
  const start = Math.min(...sessions.map(s => mins(s.since)), nowM - 60)
  const span = Math.max(nowM - start, 30)
  const pad = span * 0.06
  const x = (m: number) => ((m - start + pad) / (span + pad * 2)) * 100
  const ticks: number[] = []
  for (let m = Math.ceil(start / 60) * 60; m <= nowM; m += 60) ticks.push(m)
  const sorted = sessions.slice().sort((a, b) => stateOrder(a) - stateOrder(b) || mins(a.since) - mins(b.since))
  const onMove = (s: TeleSession) => (e: React.MouseEvent<HTMLDivElement>) => {
    const wr = wrapRef.current?.getBoundingClientRect(); if (!wr) return
    setHover({ s, x: Math.min(e.clientX - wr.left + 12, wr.width - 250), y: e.clientY - wr.top + 14 })
  }
  const dur = (since: string) => { const d = nowM - mins(since); return d >= 60 ? `${Math.floor(d / 60)}시간 ${d % 60}분` : `${Math.max(d, 0)}분` }
  return (
    <div ref={wrapRef} className="relative px-5 pb-4">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-[52px] left-[174px]">
          {ticks.map(m => <div key={m} className="absolute inset-y-0 border-l border-[rgba(19,23,34,.05)]" style={{ left: x(m) + '%' }} />)}
          <div className="absolute inset-y-0 w-[1.5px] bg-ink/70" style={{ left: x(nowM) + '%' }} />
        </div>
        {sorted.map(s => (
          <div key={s.id} className="group flex h-[26px] items-center gap-3 rounded-md transition-colors hover:bg-[rgba(19,23,34,.03)]"
            onMouseMove={onMove(s)} onMouseLeave={() => setHover(null)}>
            <span className={cn('flex w-[64px] shrink-0 items-center gap-1.5 truncate text-[12px]', s.check === 'fail' ? 'font-medium text-bad-fg' : !s.mfa ? 'font-medium text-warn-fg' : 'text-body')}>{stateOrder(s) < 2 && <i className={cn('size-1.5 shrink-0 rounded-full', dotTone(s))} />}{s.user}</span>
            <span className="w-[86px] shrink-0 truncate text-[11.5px] text-dim">{s.dept}</span>
            <div className="relative h-full flex-1">
              <span className="absolute inset-x-0 top-1/2 h-[7px] -translate-y-1/2 rounded-full bg-[rgba(19,23,34,.035)]" />
              <span className={cn('absolute top-1/2 h-[7px] -translate-y-1/2 rounded-full', barTone(s))}
                style={{ left: x(mins(s.since)) + '%', right: (100 - x(nowM)) + '%' }} />
              <span className={cn('absolute top-1/2 size-[5px] -translate-y-1/2 translate-x-[2px] rounded-full', dotTone(s))} style={{ left: `calc(${x(nowM)}% - 5px)` }} />
            </div>
            <span className="w-[40px] shrink-0 text-right font-mono text-[11px] text-dim nums">{s.since}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-center pr-[52px] pl-[174px]">
        <div className="relative h-4 flex-1">
          {ticks.map(m => (
            <span key={m} className="absolute -translate-x-1/2 font-mono text-[10.5px] text-dim nums" style={{ left: x(m) + '%' }}>{String(Math.floor(m / 60)).padStart(2, '0')}:00</span>
          ))}
          <span className="absolute -translate-x-full font-mono text-[10.5px] font-medium text-ink" style={{ left: x(nowM) + '%' }}>지금</span>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-4 border-t border-[rgba(19,23,34,.06)] pt-2.5 text-[11.5px] text-faint">
        <span className="flex items-center gap-1.5"><i className="inline-block h-[5px] w-4 rounded-full bg-[rgba(33,87,209,.42)]" />접속 중, 이상 없음</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-[5px] w-4 rounded-full bg-warn" />다중인증 재인증 대기</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-[5px] w-4 rounded-full bg-bad" />단말 점검 미통과</span>
      </div>
      {hover && (
        <div className="pointer-events-none absolute z-10 w-[240px] surface-float p-3.5 text-[12.5px] leading-[19px]" style={{ left: hover.x, top: hover.y }}>
          <div className="flex items-baseline gap-2"><b className="text-[13px] font-semibold text-ink">{hover.s.user}</b><span className="text-[11.5px] text-dim">{hover.s.dept}, {hover.s.region}</span></div>
          <div className="mt-1 text-body">접속 {hover.s.since}, 경과 {dur(hover.s.since)}</div>
          <div className="mt-1.5 flex gap-1.5">
            {hover.s.mfa ? <Pill tone="ok">다중인증 통과</Pill> : <Pill tone="warn">재인증 대기</Pill>}
            {hover.s.check === 'ok' ? <Pill tone="ok">단말 점검 통과</Pill> : <Pill tone="bad">점검 미통과</Pill>}
          </div>
          {hover.s.check === 'fail' && <div className="mt-1.5 text-[12px] text-bad-fg">{hover.s.checkNote}</div>}
        </div>
      )}
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
  const logEvent = useStore(s => s.logEvent)
  const [asked, setAsked] = useState<Record<string, boolean>>({})
  const ask = (x: TeleSession) => { setAsked(p => ({ ...p, [x.id]: true })); logEvent('tele', `점검 요구 발송: ${x.user}(${x.dept}), ${x.checkNote}`); toast(`${x.user} 단말 점검 요구 발송`) }
  return (
    <div className="view-in">
      <PageHeader title="재택근무" crumb="재택근무"
        lead={<span><b className="font-semibold text-ink nums">{ts.n}명</b> 접속 중{ts.fail ? <>, 단말 점검 미통과 <b className="font-semibold text-bad-fg nums">{ts.fail}명</b></> : ', 단말 점검 전원 통과'}, 다중인증 통과 {mfa}%</span>}
        actions={feed.on ? <Button variant="outline" onClick={pauseFeed}>일시정지</Button> : <Button onClick={startFeed}>{feed.started ? '관측 재개' : '데모 실행'}</Button>} />
      <PageIntro id="telework" title="재택 세션을 한 줄씩 봅니다" tryText="빨간 줄에 마우스를 올려 사유를 보고, 아래 표에서 [점검 요구]를 눌러 보세요.">
        누가 언제부터 접속했고 다중인증과 단말 점검을 통과했는지 표시합니다. 빨간 줄이 조치가 필요한 세션입니다.
      </PageIntro>
      <Panel className="mb-4" title="세션 타임라인" count={ts.n} right={<span>근거 ①항 2호, 단말 보호대책은 제12조, <MonoCode>{c.domains[0]} :{c.ports}</MonoCode></span>}>
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
                  <TableCell>{x.check === 'ok' ? <Pill tone="ok">통과</Pill> : <span className="flex items-center gap-2"><Pill tone="bad">미통과</Pill><span className="text-xs text-body">{x.checkNote}</span>{asked[x.id] ? <span className="text-[11px] text-faint">점검 요구됨</span> : <Button size="sm" variant="outline" onClick={() => ask(x)}>점검 요구</Button>}</span>}</TableCell>
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
