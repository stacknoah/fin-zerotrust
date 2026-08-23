import { useNavigate } from 'react-router-dom'
import { useStore, detectCount, contentCount, teleStat, type EventKind } from '@/store'
import { BoundaryMap } from '@/features/map/BoundaryMap'
import { Button } from '@/components/ui/button'
import { Panel, Pill, DDay, Empty, MonoCode } from '@/components/salpi'
import { useWizard } from '@/features/wizard/RegisterDialog'
import { cn } from '@/lib/utils'
import { IconShieldCheck, IconChevronRight } from '@tabler/icons-react'

export const EV_KO: Record<EventKind, string> = { rogue: '발견', ai: 'AI', block: '차단', register: '등재', content: '검사', scan: '대조', sys: '상태', tele: '재택' }
export const EV_TONE: Record<EventKind, string> = { rogue: 'text-bad-fg', ai: 'text-primary', block: 'text-bad-fg', register: 'text-ok-fg', content: 'text-primary', scan: 'text-faint', sys: 'text-faint', tele: 'text-warn-fg' }

function Hero() {
  const ledger = useStore(s => s.ledger)
  const rogues = useStore(s => s.rogues)
  const scanned = useStore(s => s.scanned)
  const lastScan = useStore(s => s.lastScan)
  const contentLog = useStore(s => s.contentLog)
  const feed = useStore(s => s.feed)
  const startFeed = useStore(s => s.startFeed)
  const pauseFeed = useStore(s => s.pauseFeed)
  const saasDue = ledger.filter(c => c.review.soon && c.review.type.includes('반기')).length
  const reviewDue = ledger.filter(c => c.review.soon && !c.review.type.includes('반기')).length
  const detects = detectCount(contentLog)
  const tone = !scanned ? 'idle' : rogues.length ? 'bad' : 'ok'
  const stat = (n: string | number, l: string, cls = '') => (
    <div className="border-l px-6 first:border-l-0 first:pl-0"><b className={cn('mb-0.5 block text-xl font-semibold leading-6 tracking-tight tabular-nums text-ink', cls)}>{n}</b><span className="text-xs whitespace-nowrap text-faint">{l}</span></div>
  )
  return (
    <div className="flex items-center gap-7 pb-4">
      <div className="min-w-0">
        <div className="text-xs font-medium text-faint">망분리 경계 상태</div>
        <div className="flex items-center gap-2.5 text-[22px] font-semibold leading-7 tracking-tight text-ink whitespace-nowrap">
          <span className={cn('size-2 rounded-full', tone === 'bad' ? 'bg-bad' : tone === 'ok' ? 'bg-ok' : 'bg-dim')} />
          {tone === 'idle' ? '경계 실측 전' : tone === 'bad' ? <>경계 불일치, 미등록 <span className="text-bad-fg">{rogues.length}건</span></> : '경계 일치'}
        </div>
        {scanned && <div className="mt-0.5 text-[13px] text-body">마지막 대조 {lastScan}</div>}
      </div>
      <div className="ml-auto flex">
        {stat(ledger.length, '승인 통로')}
        {stat(saasDue, '반기 평가 예정', saasDue ? 'text-warn-fg' : '')}
        {stat(reviewDue, '재승인 필요', reviewDue ? 'text-warn-fg' : '')}
        {stat(scanned ? rogues.length : '-', '미등록 연결', rogues.length ? 'text-bad-fg' : '')}
        {stat(detects, '위반 탐지')}
      </div>
      {feed.on
        ? <Button variant="outline" className="h-9 px-4" onClick={pauseFeed}>일시정지</Button>
        : <Button className="h-9 px-4 font-medium" onClick={startFeed}>{feed.started ? '관측 재개' : '데모 실행'}</Button>}
    </div>
  )
}

function ObsBar() {
  const feed = useStore(s => s.feed)
  const rogues = useStore(s => s.rogues)
  if (!feed.started) return null
  const hosts = new Set(feed.lines.map(l => (l.match(/HOST=(\S+)/) || [])[1]))
  const Num = ({ n, l, unit }: { n: number; l: string; unit?: string }) => <span>{l} <b className="font-mono font-medium text-ink tabular-nums">{n}</b>{unit}</span>
  return (
    <div className="mb-2.5 flex items-center gap-5 rounded-lg border bg-card px-3.5 py-2 text-[12.5px] text-body">
      <span className={cn('inline-flex items-center gap-2 border-r pr-4 font-medium', feed.on ? 'text-ink' : 'text-faint')}>
        <i className={cn('size-[7px] rounded-full', feed.on ? 'bg-ok breathe' : 'bg-dim')} />{feed.on ? '관측 중' : '일시정지'}
      </span>
      <Num n={feed.received} l="수신" unit="줄" /><Num n={hosts.size} l="목적지" unit="곳" /><Num n={rogues.length} l="미등록" /><Num n={feed.aiCount} l="AI 분류" unit="건" />
      <span className="ml-auto text-xs text-dim">데모 피드(합성){feed.last ? `, 마지막 수신 ${feed.last}` : ''}</span>
    </div>
  )
}

export function EventRow({ e, full }: { e: { t: string; kind: EventKind; text: string }; full?: boolean }) {
  return (
    <div className="grid grid-cols-[64px_36px_1fr] items-baseline gap-2.5 px-5 py-[5px] text-[12.5px] leading-[18px] text-body">
      <span className="font-mono text-[11px] text-dim">{e.t}</span>
      <span className={cn('text-[11px] font-semibold', EV_TONE[e.kind])}>{EV_KO[e.kind]}</span>
      <span className={cn('text-ink', !full && 'truncate')}>{e.text}</span>
    </div>
  )
}

function ActivityPanels() {
  const feed = useStore(s => s.feed)
  const events = useStore(s => s.events)
  const detReady = useStore(s => s.detReady)
  const nav = useNavigate()
  const lines = feed.lines.slice(-5)
  const evs = events.slice(-6).reverse()
  const Head = ({ t }: { t: string }) => (
    <button onClick={() => nav('/activity')} className="flex w-full items-center gap-2.5 px-5 pt-4 pb-3 text-left transition hover:bg-muted/60">
      <span className="text-[15px] font-semibold text-ink">{t}</span><span className="ml-auto inline-flex items-center text-[13px] text-primary">전체 보기<IconChevronRight className="size-3.5" /></span>
    </button>
  )
  return (
    <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border bg-card">
      <section>
        <Head t="관측 피드" />
        <div className="min-h-[116px] px-5 pt-1.5 pb-3 font-mono text-[11.5px] leading-5 text-body">
          {lines.length ? lines.map((l, i) => <div key={i} className="truncate">{l}</div>) : <div className="text-[13px] text-dim">수신 없음</div>}
        </div>
      </section>
      <section className="border-l">
        <div className="flex items-center"><Head t="AI 활동" /><span className="absolute" /></div>
        <div className="min-h-[116px] pt-1 pb-2">
          {evs.length ? evs.map(e => <EventRow key={e.id} e={e} />) : <div className="px-5 text-[13px] text-dim">기록 없음{detReady ? '' : ', AI 미연결'}</div>}
        </div>
      </section>
    </div>
  )
}

function Detail() {
  const sel = useStore(s => s.sel)
  const ledger = useStore(s => s.ledger)
  const rogues = useStore(s => s.rogues)
  const contentLog = useStore(s => s.contentLog)
  const quickBlock = useStore(s => s.quickBlock)
  const open = useWizard(s => s.open)
  const nav = useNavigate()
  if (!sel) return null
  if (sel.startsWith('R-')) {
    const r = rogues[Number(sel.slice(2))]; if (!r) return null
    return (
      <Panel className="mt-4" title={<span className="font-mono text-[13px]">{r.host}</span>} right={<Pill tone="bad">미등록 연결</Pill>}>
        <div className="px-5 pb-5">
          <dl className="grid max-w-[860px] grid-cols-[120px_1fr] gap-x-5 gap-y-1.5 text-sm">
            <dt className="text-faint">관측</dt><dd className="text-ink">{r.info.count}회, 단말 {r.info.srcs.size}대, 포트 {[...r.info.ports].join(', ')}</dd>
            <dt className="text-faint">분류</dt><dd className="text-ink">{r.cls.kind}{r.cls.ai && <span className="ml-2 text-xs text-primary">AI 분류</span>}</dd>
            <dt className="text-faint">판정</dt><dd className="text-ink">승인 대장에 없음</dd>
          </dl>
          <div className="mt-3 max-w-[828px] rounded-md border border-[rgba(255,129,130,.4)] bg-[#ffebe9] px-4 py-3 text-sm text-ink"><b className="mb-0.5 block font-semibold text-bad-fg">위험 요약</b>{r.cls.risk}</div>
          <div className="mt-3 flex gap-2">
            {r.cls.saasLike && <Button size="sm" onClick={() => open({ host: r.host, name: r.host, fromRogue: true, cls: r.cls })}>판정하기 (등재 절차)</Button>}
            <Button size="sm" variant="destructive" onClick={() => quickBlock(r.host)}>차단 확정</Button>
          </div>
        </div>
      </Panel>
    )
  }
  const c = ledger.find(x => x.id === sel); if (!c) return null
  const n = contentCount(contentLog, c.id)
  return (
    <Panel className="mt-4">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <span className={cn('inline-flex size-7 items-center justify-center rounded-lg text-[13px] font-bold', c.zone === 'saas' ? 'bg-accent text-primary' : 'bg-secondary text-body')}>{c.name.replace(/^NHN |^Microsoft /, '')[0]}</span>
        <span className="text-base font-semibold text-ink">{c.id} {c.name}</span><Pill>{c.type}</Pill>
        <span className="ml-auto flex items-center gap-2"><DDay due={c.review.due} />{c.zone === 'saas' && <Button size="sm" variant="outline" onClick={() => nav('/content?target=' + c.id)}>이 통로 내용 검사</Button>}</span>
      </div>
      <div className="px-5 pb-5">
        <dl className="grid max-w-[860px] grid-cols-[120px_1fr] gap-x-5 gap-y-1.5 text-sm">
          <dt className="text-faint">근거 조문</dt><dd className="text-ink">{c.basis}</dd>
          <dt className="text-faint">연결</dt><dd className="text-ink"><MonoCode>{c.domains.join(', ')} :{c.ports}</MonoCode> <span className="ml-1">{c.dir}</span></dd>
          <dt className="text-faint">승인</dt><dd className="text-ink">{c.approved}</dd>
          <dt className="text-faint">적용 통제</dt><dd className="text-ink">{c.controls}{c.pendingRisks ? <b className="ml-1 font-semibold text-warn-fg">미해소 {c.pendingRisks}건</b> : null}</dd>
          <dt className="text-faint">다음 의무</dt><dd className="text-ink">{c.review.type} {c.review.due}</dd>
        </dl>
        {c.zone === 'saas' && <div className="mt-3 max-w-[828px] rounded-md border border-[rgba(74,194,107,.4)] bg-[#dafbe1] px-4 py-3 text-sm text-ink">내용검사 기록 <b className="font-semibold">{n}건</b></div>}
      </div>
    </Panel>
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
    <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border bg-card">
      <section>
        <header className="px-5 pt-4 pb-3 text-[15px] font-semibold text-ink">다가오는 의무</header>
        {due.length ? due.map(c => (
          <div key={c.id} className="flex items-center gap-3 border-t px-5 py-2.5 text-sm text-body"><span><b className="font-semibold text-ink">{c.id}</b> {c.review.type.replace(' (제4항)', '')}</span><span className="ml-auto flex items-center gap-2"><span className="font-mono text-xs font-semibold text-warn-fg">{c.review.due.slice(5)}</span><DDay due={c.review.due} /></span></div>
        )) : <div className="px-5 py-3 text-sm text-dim">없음</div>}
      </section>
      <section className="border-l">
        <header className="px-5 pt-4 pb-3 text-[15px] font-semibold text-ink">미등록 연결 조치</header>
        {rogues.length ? rogues.map(r => (
          <div key={r.host} className="flex items-center gap-3 border-t px-5 py-2.5 text-sm"><span className="font-mono text-[13px] font-semibold text-bad-fg">{r.host}</span><span className="ml-auto flex gap-1.5">
            {r.cls.saasLike && <Button size="sm" onClick={() => open({ host: r.host, name: r.host, fromRogue: true, cls: r.cls })}>판정</Button>}
            <Button size="sm" variant="destructive" onClick={() => quickBlock(r.host)}>차단</Button></span></div>
        )) : <Empty action={!scanned ? <Button size="sm" variant="outline" onClick={startFeed}>데모 실행</Button> : undefined}><IconShieldCheck className="mx-auto mb-2 size-9 text-[#aab6c4]" stroke={1.4} />{scanned ? '조치할 미등록 연결 없음' : '대조 결과 없음'}</Empty>}
      </section>
    </div>
  )
}

export function HomePage() {
  return (
    <div className="view-in">
      <Hero />
      <ObsBar />
      <BoundaryMap />
      <Detail />
      <ActivityPanels />
      <Bottom />
    </div>
  )
}
