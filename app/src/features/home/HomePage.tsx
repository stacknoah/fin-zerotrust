import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, detectCount, contentCount, type EventKind } from '@/store'
import { BoundaryMap } from '@/features/map/BoundaryMap'
import { Button } from '@/components/ui/button'
import { Pill, DDay, Empty, MonoCode } from '@/components/salpi'
import { useWizard } from '@/features/wizard/RegisterDialog'
import { today } from '@/lib/format'
import { cn } from '@/lib/utils'
import { IconShieldCheck, IconArrowRight, IconPlayerPlay, IconPlayerPause, IconX } from '@tabler/icons-react'

export const EV_KO: Record<EventKind, string> = { rogue: '발견', ai: 'AI', block: '차단', register: '등재', content: '검사', scan: '대조', sys: '상태', tele: '재택' }
export const EV_TONE: Record<EventKind, string> = { rogue: 'text-bad-fg', ai: 'text-primary', block: 'text-bad-fg', register: 'text-ok-fg', content: 'text-primary', scan: 'text-faint', sys: 'text-faint', tele: 'text-warn-fg' }

/* 머리: 한 문장 판정과 실행 버튼 */
function Head() {
  const rogues = useStore(s => s.rogues)
  const scanned = useStore(s => s.scanned)
  const lastScan = useStore(s => s.lastScan)
  const feed = useStore(s => s.feed)
  const startFeed = useStore(s => s.startFeed)
  const pauseFeed = useStore(s => s.pauseFeed)
  const tone = !scanned ? 'idle' : rogues.length ? 'bad' : 'ok'
  return (
    <div className="flex items-end gap-6 pb-5">
      <div>
        <div className="mb-2 font-mono text-[11px] tracking-[.02em] text-dim">망분리 경계 상태 {today()}{scanned && <>, 마지막 대조 {lastScan}</>}</div>
        <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.025em] text-ink">
          <span className={cn('mr-3 inline-block size-2.5 -translate-y-[3px] rounded-full', tone === 'bad' ? 'bg-bad' : tone === 'ok' ? 'bg-ok' : 'bg-dim', feed.on && tone !== 'idle' && 'breathe')} />
          {tone === 'idle' ? <>경계 실측 전<span className="font-normal text-dim">, 데모를 실행하면 관측이 시작됩니다</span></>
            : tone === 'bad' ? <>경계 불일치<span className="font-normal text-dim">, 승인 대장에 없는 연결 <span className="font-semibold text-bad-fg nums">{rogues.length}건</span></span></>
            : <>경계 일치<span className="font-normal text-dim">, 관측된 연결 전부 승인 통로</span></>}
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {feed.on
          ? <Button variant="outline" className="h-10 rounded-full px-4" onClick={pauseFeed}><IconPlayerPause className="size-4" stroke={1.75} />일시정지</Button>
          : <Button className="h-10 rounded-full bg-ink px-5 text-[14px] font-medium text-white hover:bg-ink/90" onClick={startFeed}><IconPlayerPlay className="size-4" stroke={1.75} />{feed.started ? '관측 재개' : '데모 실행'}</Button>}
      </div>
    </div>
  )
}

/* 실황 띠: 장부 지표와 관측 수치를 한 줄에 */
function Ticker() {
  const ledger = useStore(s => s.ledger)
  const rogues = useStore(s => s.rogues)
  const scanned = useStore(s => s.scanned)
  const contentLog = useStore(s => s.contentLog)
  const feed = useStore(s => s.feed)
  const saasDue = ledger.filter(c => c.review.soon && c.review.type.includes('반기')).length
  const reviewDue = ledger.filter(c => c.review.soon && !c.review.type.includes('반기')).length
  const hosts = new Set(feed.lines.map(l => (l.match(/HOST=(\S+)/) || [])[1]))
  const Item = ({ l, n, tone }: { l: string; n: string | number; tone?: string }) => (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap"><span className="text-[12px] text-faint">{l}</span><b className={cn('font-mono text-[13px] font-medium text-ink nums', tone)}>{n}</b></span>
  )
  return (
    <div className="mb-3 flex h-10 items-center gap-5 surface px-4 text-[12.5px]">
      <span className={cn('flex items-center gap-2 pr-4 font-medium', feed.on ? 'text-ink' : 'text-faint')}>
        <i className={cn('size-[7px] rounded-full', feed.on ? 'bg-ok breathe' : feed.started ? 'bg-warn' : 'bg-dim')} />{feed.on ? '관측 중' : feed.started ? '일시정지' : '대기'}
      </span>
      <span className="h-4 w-px bg-[rgba(19,23,34,.1)]" />
      <Item l="승인 통로" n={ledger.length} />
      <Item l="반기 평가 예정" n={saasDue} />
      <Item l="재승인 필요" n={reviewDue} tone={reviewDue ? 'text-warn-fg' : ''} />
      <Item l="미등록 연결" n={scanned ? rogues.length : '-'} tone={rogues.length ? 'text-bad-fg' : ''} />
      <Item l="위반 탐지" n={detectCount(contentLog)} />
      {feed.started && <>
        <span className="h-4 w-px bg-[rgba(19,23,34,.1)]" />
        <Item l="수신" n={feed.received + '줄'} />
        <Item l="목적지" n={hosts.size + '곳'} />
        <Item l="AI 분류" n={feed.aiCount + '건'} />
      </>}
      <span className="ml-auto font-mono text-[11px] text-dim">{feed.started ? `데모 피드(합성)${feed.last ? ', 마지막 수신 ' + feed.last : ''}` : '합성 데이터'}</span>
    </div>
  )
}

export function EventRow({ e, full }: { e: { t: string; kind: EventKind; text: string }; full?: boolean }) {
  return (
    <div className="grid grid-cols-[52px_34px_1fr] items-baseline gap-2.5 px-5 py-[6px] text-[12.5px] leading-[18px] text-body">
      <span className="font-mono text-[11px] text-dim nums">{e.t}</span>
      <span className={cn('text-[11px] font-semibold', EV_TONE[e.kind])}>{EV_KO[e.kind]}</span>
      <span className={cn('text-ink', !full && 'line-clamp-2')}>{e.text}</span>
    </div>
  )
}

/* 관측 피드는 단말 화면처럼, AI 활동은 목록으로 */
function ActivityPanels() {
  const feed = useStore(s => s.feed)
  const events = useStore(s => s.events)
  const detReady = useStore(s => s.detReady)
  const ledger = useStore(s => s.ledger)
  const nav = useNavigate()
  const lines = feed.lines.slice(-6)
  const evs = events.slice(-5).reverse()
  const Head = ({ t, dark }: { t: string; dark?: boolean }) => (
    <button onClick={() => nav('/activity')} className={cn('flex w-full items-center gap-2.5 px-5 pt-4 pb-3 text-left', dark ? 'text-white' : 'text-ink')}>
      <span className="text-[14px] font-semibold">{t}</span><span className={cn('ml-auto inline-flex items-center gap-0.5 text-[12.5px] font-medium', dark ? 'text-white/50' : 'text-faint')}>전체 보기<IconArrowRight className="size-3.5" stroke={1.75} /></span>
    </button>
  )
  const Line = ({ l }: { l: string }) => {
    const m = l.match(/^(\S+ \S+) SRC=(\S+) HOST=(\S+) DPT=(\S+) ACTION=(\S+)/)
    if (!m) return <div className="truncate text-white/60">{l}</div>
    const known = ledger.some(c => c.domains.some(d => m[3] === d || m[3].endsWith('.' + d)))
    return (
      <div className="flex gap-4 whitespace-nowrap">
        <span className="w-[62px] text-white/40">{m[1].slice(11)}</span><span className="w-[88px] text-white/55">{m[2]}</span>
        <span className={cn('w-[170px] truncate', known ? 'text-[#9ec0ff]' : 'text-[#ff9a93]')}>{m[3]}</span><span className="w-[40px] text-white/40">:{m[4]}</span><span className="text-white/40">{m[5]}</span>
      </div>
    )
  }
  return (
    <div className="mt-4 grid grid-cols-[7fr_5fr] gap-4">
      <section className="overflow-hidden rounded-[14px] bg-[#131722] shadow-[var(--shadow-card)]">
        <Head t="관측 피드" dark />
        <div className="min-h-[150px] px-5 pt-1 pb-4 font-mono text-[11.5px] leading-[21px]">
          {lines.length ? lines.map((l, i) => <Line key={i} l={l} />) : <div className="text-[12.5px] text-white/40">수신 없음. 데모를 실행하면 합성 피드가 들어옵니다</div>}
        </div>
      </section>
      <section className="surface overflow-hidden">
        <Head t="AI 활동" />
        <div className="min-h-[150px] pt-0.5 pb-2">
          {evs.length ? evs.map(e => <EventRow key={e.id} e={e} />) : <div className="px-5 text-[12.5px] text-dim">기록 없음{detReady ? '' : ', AI 미연결'}</div>}
        </div>
      </section>
    </div>
  )
}

function Detail() {
  const sel = useStore(s => s.sel)
  const setSel = useStore(s => s.setSel)
  const ledger = useStore(s => s.ledger)
  const rogues = useStore(s => s.rogues)
  const contentLog = useStore(s => s.contentLog)
  const quickBlock = useStore(s => s.quickBlock)
  const open = useWizard(s => s.open)
  const nav = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (sel) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [sel])
  if (!sel) return null
  const Close = () => <button onClick={() => setSel(null)} className="ml-2 inline-flex size-7 items-center justify-center rounded-full text-dim transition hover:bg-muted hover:text-ink"><IconX className="size-4" stroke={1.75} /></button>
  if (sel.startsWith('R-')) {
    const r = rogues[Number(sel.slice(2))]; if (!r) return null
    return (
      <div ref={ref} className="detail-in mt-4 grid grid-cols-[1fr_320px] overflow-hidden surface">
        <div className="px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[16px] font-semibold text-ink">{r.host}</span><Pill tone="bad">미등록 연결</Pill>{r.cls.ai && <Pill tone="blue">AI 분류</Pill>}
          </div>
          <dl className="mt-4 grid max-w-[720px] grid-cols-[96px_1fr] gap-x-5 gap-y-2 text-[13.5px]">
            <dt className="text-faint">관측</dt><dd className="text-ink nums">{r.info.count}회, 단말 {r.info.srcs.size}대, 포트 {[...r.info.ports].join(', ')}</dd>
            <dt className="text-faint">분류</dt><dd className="text-ink">{r.cls.kind}</dd>
            <dt className="text-faint">판정</dt><dd className="text-ink">승인 대장에 없음</dd>
          </dl>
          <div className="mt-4 flex gap-2">
            {r.cls.saasLike && <Button size="sm" className="h-9 rounded-full bg-ink px-4 text-white hover:bg-ink/90" onClick={() => open({ host: r.host, name: r.host, fromRogue: true, cls: r.cls })}>판정하기 (등재 절차)</Button>}
            <Button size="sm" variant="outline" className="h-9 rounded-full px-4 text-bad-fg hover:text-bad-fg" onClick={() => quickBlock(r.host)}>차단 확정</Button>
          </div>
        </div>
        <div className="relative border-l border-[rgba(19,23,34,.07)] bg-bad-bg/60 px-6 py-5">
          <div className="absolute top-3 right-3"><Close /></div>
          <div className="text-[12px] font-semibold text-bad-fg">위험 요약</div>
          <p className="mt-1.5 text-[13.5px] leading-[21px] text-ink">{r.cls.risk}</p>
        </div>
      </div>
    )
  }
  const c = ledger.find(x => x.id === sel); if (!c) return null
  const n = contentCount(contentLog, c.id)
  return (
    <div ref={ref} className="detail-in mt-4 overflow-hidden surface">
      <div className="flex items-center gap-3 px-6 pt-5 pb-3">
        <span className={cn('inline-flex size-8 items-center justify-center rounded-lg text-[13px] font-semibold', c.zone === 'saas' ? 'bg-accent text-primary' : 'bg-[rgba(19,23,34,.06)] text-body')}>{c.name.replace(/^NHN |^Microsoft /, '')[0]}</span>
        <span className="text-[16px] font-semibold text-ink">{c.name}</span><span className="font-mono text-[12px] text-dim">{c.id}</span><Pill>{c.type}</Pill>
        <span className="ml-auto flex items-center gap-2"><DDay due={c.review.due} />{c.zone === 'saas' && <Button size="sm" variant="outline" className="h-8 rounded-full px-3.5" onClick={() => nav('/content?target=' + c.id)}>이 통로 내용 검사</Button>}<Close /></span>
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-x-10 px-6 pb-5">
        <dl className="grid grid-cols-[96px_1fr] gap-x-5 gap-y-2 text-[13.5px]">
          <dt className="text-faint">근거 조문</dt><dd className="text-ink">{c.basis}</dd>
          <dt className="text-faint">연결</dt><dd className="text-ink"><MonoCode>{c.domains.join(', ')} :{c.ports}</MonoCode> <span className="ml-1">{c.dir}</span></dd>
          <dt className="text-faint">승인</dt><dd className="text-ink">{c.approved}</dd>
        </dl>
        <dl className="grid grid-cols-[96px_1fr] gap-x-5 gap-y-2 text-[13.5px]">
          <dt className="text-faint">적용 통제</dt><dd className="text-ink">{c.controls}{c.pendingRisks ? <b className="ml-1 font-semibold text-warn-fg">미해소 {c.pendingRisks}건</b> : null}</dd>
          <dt className="text-faint">다음 의무</dt><dd className="text-ink">{c.review.type} {c.review.due}</dd>
          {c.zone === 'saas' && <><dt className="text-faint">내용검사</dt><dd className="text-ink nums">{n}건 기록</dd></>}
        </dl>
      </div>
    </div>
  )
}

function Bottom() {
  const ledger = useStore(s => s.ledger)
  const rogues = useStore(s => s.rogues)
  const scanned = useStore(s => s.scanned)
  const quickBlock = useStore(s => s.quickBlock)
  const startFeed = useStore(s => s.startFeed)
  const open = useWizard(s => s.open)
  const due = ledger.filter(c => c.review.soon)
  return (
    <div className="mt-4 grid grid-cols-2 overflow-hidden surface">
      <section>
        <header className="flex items-center px-5 pt-4 pb-2 text-[14px] font-semibold text-ink">다가오는 의무<span className="ml-2 font-mono text-[12px] font-normal text-dim nums">{due.length}</span></header>
        {due.length ? due.map(c => (
          <div key={c.id} className="flex items-center gap-3 border-t border-[rgba(19,23,34,.06)] px-5 py-2.5 text-[13px] text-body"><span className="font-mono text-[11.5px] text-dim">{c.id}</span><span className="text-ink">{c.name}</span><span className="text-faint">{c.review.type.replace(' (제4항)', '')}</span><span className="ml-auto flex items-center gap-2"><span className="font-mono text-xs text-faint nums">{c.review.due}</span><DDay due={c.review.due} /></span></div>
        )) : <div className="px-5 py-3 text-sm text-dim">없음</div>}
      </section>
      <section className="border-l border-[rgba(19,23,34,.07)]">
        <header className="flex items-center px-5 pt-4 pb-2 text-[14px] font-semibold text-ink">미등록 연결 조치<span className="ml-2 font-mono text-[12px] font-normal text-dim nums">{rogues.length}</span></header>
        {rogues.length ? rogues.map(r => (
          <div key={r.host} className="flex items-center gap-3 border-t border-[rgba(19,23,34,.06)] px-5 py-2 text-sm"><span className="font-mono text-[13px] font-medium text-bad-fg">{r.host}</span><span className="text-[12px] text-faint">{r.cls.kind}</span><span className="ml-auto flex gap-1.5">
            {r.cls.saasLike && <Button size="sm" className="h-7 rounded-full bg-ink px-3 text-[12px] text-white hover:bg-ink/90" onClick={() => open({ host: r.host, name: r.host, fromRogue: true, cls: r.cls })}>판정</Button>}
            <Button size="sm" variant="outline" className="h-7 rounded-full px-3 text-[12px] text-bad-fg hover:text-bad-fg" onClick={() => quickBlock(r.host)}>차단</Button></span></div>
        )) : <Empty action={!scanned ? <Button size="sm" variant="outline" className="rounded-full" onClick={startFeed}>데모 실행</Button> : undefined}><IconShieldCheck className="mx-auto mb-2 size-8 text-dim" stroke={1.4} />{scanned ? '조치할 미등록 연결 없음' : '대조 결과 없음'}</Empty>}
      </section>
    </div>
  )
}

export function HomePage() {
  return (
    <div className="view-in">
      <Head />
      <Ticker />
      <BoundaryMap />
      <Detail />
      <ActivityPanels />
      <Bottom />
    </div>
  )
}
