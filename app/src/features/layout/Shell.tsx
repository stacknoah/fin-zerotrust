import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { IconTopologyStar3, IconListDetails, IconGitCompare, IconFileSearch, IconReport, IconActivity, IconChecklist, IconSearch } from '@tabler/icons-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <circle cx="10.5" cy="12" r="7" /><path d="M10.5 12H22" /><circle cx="17.5" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

const TABS = [
  { to: '/map', t: '경계 지도', Icon: IconTopologyStar3 },
  { to: '/ledger', t: '통로 대장', Icon: IconListDetails },
  { to: '/logs', t: '로그 대조', Icon: IconGitCompare },
  { to: '/content', t: '내용 검사', Icon: IconFileSearch },
  { to: '/report', t: '반기 보고', Icon: IconReport },
  { to: '/activity', t: '활동 기록', Icon: IconActivity },
]

function Search() {
  const ledger = useStore(s => s.ledger)
  const rogues = useStore(s => s.rogues)
  const setSel = useStore(s => s.setSel)
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !/input|textarea|select/i.test((document.activeElement as HTMLElement)?.tagName || '')) { e.preventDefault(); ref.current?.focus() }
      if (e.key === 'Escape') { setOpen(false); ref.current?.blur() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  const ql = q.trim().toLowerCase()
  const hits = !ql ? [] : [
    ...ledger.filter(c => c.name.toLowerCase().includes(ql) || c.id.toLowerCase().includes(ql) || c.domains.some(d => d.includes(ql))).map(c => ({ id: c.id, name: c.name, host: c.domains[0], rogue: false })),
    ...rogues.filter(r => r.host.includes(ql)).map((r, i) => ({ id: 'R-' + rogues.indexOf(r), name: r.host, host: '미등록', rogue: true, i })),
  ].slice(0, 8)
  const go = (id: string) => { setOpen(false); setQ(''); setSel(id); nav('/map') }
  return (
    <div className="relative w-[clamp(140px,15vw,250px)] shrink">
      <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-[15px] -translate-y-1/2 text-dim" stroke={1.75} />
      <input ref={ref} value={q} onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="통로, 도메인 검색" autoComplete="off"
        className="h-8 w-full rounded-full bg-card pr-9 pl-8 text-[13px] text-ink shadow-[var(--shadow-ring)] outline-none transition placeholder:text-dim focus:shadow-[0_0_0_1px_rgba(33,87,209,.6)]" />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border bg-muted px-1 font-mono text-[10px] text-dim">/</kbd>
      {open && ql && (
        <div className="absolute top-full right-0 z-50 mt-1.5 w-[360px] overflow-hidden surface-float text-ink">
          {hits.length ? hits.map(h => (
            <button key={h.id + h.name} onMouseDown={() => go(h.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] hover:bg-muted">
              <span className={cn('w-10 font-mono text-[11px]', h.rogue ? 'text-bad-fg' : 'text-faint')}>{h.rogue ? '!' : h.id}</span>
              <span className="font-medium">{h.name}</span>
              <span className="ml-auto font-mono text-[11px] text-faint">{h.host}</span>
            </button>
          )) : <div className="px-3 py-2.5 text-[13px] text-faint">검색 결과 없음</div>}
        </div>
      )}
    </div>
  )
}

function AIStatus() {
  const detReady = useStore(s => s.detReady)
  const probe = useStore(s => s.probeAI)
  useEffect(() => { probe(); const t = setInterval(probe, 30000); return () => clearInterval(t) }, [probe])
  return (
    <span className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full bg-card pr-3 pl-2.5 text-[12.5px] font-medium whitespace-nowrap text-body shadow-[var(--shadow-ring)]" title={`Kanana 2 3B ${window.SALPI_LLM_ENDPOINT ? '원격' : '로컬'}`}>
      <span className={cn('size-1.5 rounded-full', detReady ? 'bg-ok' : 'bg-dim')} />
      {detReady ? 'AI 연결됨' : 'AI 미연결'}
      <span className="font-mono text-[11px] font-normal text-dim max-[1560px]:hidden">Kanana 2 3B {window.SALPI_LLM_ENDPOINT ? '원격' : '로컬'}</span>
    </span>
  )
}

function Tab({ to, t, Icon, badge }: { to: string; t: string; Icon: typeof IconSearch; badge?: number }) {
  return (
    <NavLink to={to} end={to === '/map'} className={({ isActive }) => cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150', isActive ? 'bg-[rgba(19,23,34,.06)] text-ink' : 'text-faint hover:bg-[rgba(19,23,34,.04)] hover:text-ink')}>
      <Icon className="size-[15px] max-[1460px]:hidden" stroke={1.6} />{t}
      {badge ? <b className="ml-0.5 rounded-full bg-bad px-1.5 text-[10.5px] font-semibold leading-4 text-white nums">{badge}</b> : null}
    </NavLink>
  )
}

export function Shell() {
  const logout = useStore(s => s.logout)
  const rogues = useStore(s => s.rogues)
  const nav = useNavigate()
  const setSel = useStore(s => s.setSel)
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 bg-[rgba(247,248,250,.92)] backdrop-blur-md">
        <div className="mx-auto flex h-[60px] max-w-[1440px] flex-nowrap items-center gap-3 px-8 max-[1200px]:gap-2 max-[1200px]:px-5">
          <button onClick={() => { setSel(null); nav('/map') }} className="mr-3 flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
            <Mark className="size-[22px]" />살피
          </button>
          <nav className="flex shrink-0 items-center gap-0.5">
            {TABS.map(t => <Tab key={t.to} {...t} badge={t.to === '/logs' ? rogues.length : 0} />)}
            <span className="mx-2 h-4 w-px bg-[rgba(19,23,34,.1)]" />
            <Tab to="/workbench" t="판정 워크벤치" Icon={IconChecklist} />
          </nav>
          <span className="ml-auto flex min-w-0 items-center gap-2.5">
            <Search />
            <AIStatus />
            <button onClick={logout} title="로그아웃" className="ml-1 inline-flex size-8 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white transition hover:opacity-80">페</button>
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-8 pt-5 pb-16">
        <Outlet />
        <footer className="flex items-center gap-4 pt-10 text-xs text-dim"><span>합성 데이터 기반 데모. 법적 판단을 대행하지 않습니다.</span><span className="ml-auto font-mono text-[11px]">전자금융감독규정 시행세칙 제2조의3</span></footer>
      </main>
    </div>
  )
}
