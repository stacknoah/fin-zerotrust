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
  { to: '/', t: '경계 지도', Icon: IconTopologyStar3 },
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
  const go = (id: string) => { setOpen(false); setQ(''); setSel(id); nav('/') }
  return (
    <div className="relative ml-2 w-[440px] max-w-[40vw]">
      <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8fa3b8]" stroke={1.75} />
      <input ref={ref} value={q} onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="통로, 도메인 검색" autoComplete="off"
        className="h-9 w-full rounded-md border border-white/10 bg-white/[.08] pr-3 pl-9 text-[13.5px] text-white placeholder:text-[#8fa3b8] outline-none transition focus:border-white/25 focus:bg-white/[.12]" />
      {open && ql && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-lg border bg-popover text-ink shadow-lg">
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
    <span className="ml-auto inline-flex items-center gap-2 text-[12.5px] text-faint">
      <span className={cn('size-2 rounded-full', detReady ? 'bg-ok' : 'bg-dim')} />
      {detReady ? 'AI 연결됨' : 'AI 미연결'}
      <span className="font-mono text-[11px] text-dim">Kanana-2-3B {window.SALPI_LLM_ENDPOINT ? '원격' : '로컬'}</span>
    </span>
  )
}

export function Shell() {
  const logout = useStore(s => s.logout)
  const rogues = useStore(s => s.rogues)
  const nav = useNavigate()
  const setSel = useStore(s => s.setSel)
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 flex h-[52px] items-center gap-4 bg-navy px-8 text-white">
        <button onClick={() => { setSel(null); nav('/') }} className="flex items-center text-base font-bold tracking-tight">
          <Mark className="mr-2 size-5" />살피<small className="ml-2 font-mono text-[8.5px] font-medium tracking-[.26em] text-[#adbdcc]">SALPI</small>
        </button>
        <span className="h-5 w-px bg-white/10" />
        <span className="text-sm font-medium text-[#adbdcc]">망분리 경계 관제</span>
        <Search />
        <span className="ml-auto flex items-center gap-1.5 text-[13px] text-[#adbdcc]">
          <span className="flex items-center gap-2 px-2.5 py-1.5"><span className="inline-flex size-[26px] items-center justify-center rounded-full bg-white/[.12] text-[11.5px] font-bold text-white">페</span>페이몬 정보보호팀</span>
          <button onClick={logout} className="rounded-md px-2.5 py-1.5 font-medium transition hover:bg-white/[.08] hover:text-white">로그아웃</button>
        </span>
      </header>
      <div className="sticky top-[52px] z-30 border-b bg-card">
        <div className="mx-auto flex h-11 max-w-[1440px] items-stretch gap-1 px-8">
          <nav className="flex gap-1">
            {TABS.map(({ to, t, Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cn('-mb-px inline-flex items-center gap-2 border-b-2 px-3 text-[13.5px] font-medium whitespace-nowrap transition', isActive ? 'border-ink text-ink' : 'border-transparent text-faint hover:text-ink')}>
                <Icon className="size-4" stroke={1.5} />{t}
                {to === '/logs' && rogues.length > 0 && <b className="ml-1 rounded-full bg-[rgba(175,184,193,.25)] px-1.5 text-xs font-medium leading-[18px]">{rogues.length}</b>}
              </NavLink>
            ))}
          </nav>
          <NavLink to="/workbench" className={({ isActive }) => cn('-mb-px ml-2 inline-flex items-center gap-2 border-l border-b-2 pl-4 pr-3 text-[13.5px] font-medium whitespace-nowrap transition', isActive ? 'border-b-ink text-ink' : 'border-b-transparent text-faint hover:text-ink')}>
            <IconChecklist className="size-4" stroke={1.5} />판정 워크벤치
          </NavLink>
          <AIStatus />
        </div>
      </div>
      <main className="mx-auto max-w-[1440px] px-8 pt-6 pb-14">
        <Outlet />
        <footer className="pt-8 text-xs text-dim">합성 데이터 기반 데모. 법적 판단을 대행하지 않습니다.</footer>
      </main>
    </div>
  )
}
