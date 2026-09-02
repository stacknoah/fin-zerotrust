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
  { to: '/map', t: '관제 화면', Icon: IconTopologyStar3 },
  { to: '/ledger', t: '연결 대장', Icon: IconListDetails },
  { to: '/content', t: '내용 검사', Icon: IconFileSearch },
  { to: '/report', t: '반기 보고', Icon: IconReport },
  { to: '/logs', t: '로그 대조', Icon: IconGitCompare },
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
    ...rogues.filter(r => r.host.includes(ql)).map((r, i) => ({ id: 'R-' + rogues.indexOf(r), name: r.host, host: '미승인', rogue: true, i })),
  ].slice(0, 8)
  const go = (id: string) => { setOpen(false); setQ(''); setSel(id); nav('/map') }
  return (
    <div className="relative w-[clamp(140px,15vw,250px)] shrink">
      <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-[15px] -translate-y-1/2 text-[#8a94a8]" stroke={1.75} />
      <input ref={ref} value={q} onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="연결, 도메인 검색" autoComplete="off"
        className="h-8 w-full rounded-full bg-white/8 pr-9 pl-8 text-[13px] text-white shadow-[0_0_0_1px_rgba(255,255,255,.1)] outline-none transition placeholder:text-[#8a94a8] focus:bg-white/12 focus:shadow-[0_0_0_1px_rgba(125,163,240,.7)]" />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-white/15 bg-white/8 px-1 font-mono text-[10px] text-[#8a94a8]">/</kbd>
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
  const [open, setOpen] = useState(false)
  useEffect(() => { probe(); const t = setInterval(probe, 30000); return () => clearInterval(t) }, [probe])
  const ep = window.SALPI_LLM_ENDPOINT
  return (
    <span className="relative">
      <button onClick={() => setOpen(o => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full bg-white/8 pr-3 pl-2.5 text-[12.5px] font-medium whitespace-nowrap text-[#dfe5f0] shadow-[0_0_0_1px_rgba(255,255,255,.1)] transition hover:bg-white/12">
        <span className={cn('size-1.5 rounded-full', detReady ? 'bg-ok' : 'bg-dim')} />
        {detReady ? 'AI 연결됨' : 'AI 미연결'}
        <span className="font-mono text-[11px] font-normal text-[#8a94a8] max-[1560px]:hidden">Kanana 2 3B {ep ? '원격' : '로컬'}</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 z-50 mt-1.5 w-[320px] surface-float p-4 text-left">
          <div className="text-[13px] font-semibold text-ink">추론 런타임</div>
          <dl className="mt-2 grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
            <dt className="text-faint">엔진</dt><dd className="text-ink">Ollama, 온프레미스</dd>
            <dt className="text-faint">모델</dt><dd className="font-mono text-[11px] break-all text-ink">kanana-2-3b-instruct Q4_K_M (2.2GB)</dd>
            <dt className="text-faint">위치</dt><dd className="font-mono text-[11px] break-all text-ink">{ep ? new URL(ep).host : 'localhost:11434'}</dd>
            <dt className="text-faint">외부 API</dt><dd className="text-ink">호출 없음. 로그와 문서는 망 밖으로 나가지 않음</dd>
          </dl>
        </div>
      )}
    </span>
  )
}

function Tab({ to, t, Icon, badge }: { to: string; t: string; Icon: typeof IconSearch; badge?: number }) {
  return (
    <NavLink to={to} end={to === '/map'} className={({ isActive }) => cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150', isActive ? 'bg-white/12 text-white' : 'text-[#9aa4b8] hover:bg-white/7 hover:text-white')}>
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
      <header className="sticky top-0 z-40 bg-[#151a26] text-white shadow-[0_1px_0_rgba(255,255,255,.06),0_2px_10px_rgba(11,13,24,.25)]">
        <div className="mx-auto flex h-[60px] max-w-[1440px] flex-nowrap items-center gap-3 px-8 max-[1200px]:gap-2 max-[1200px]:px-5">
          <button onClick={() => { setSel(null); nav('/map') }} className="mr-3 flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white">
            <Mark className="size-[22px]" />살피
          </button>
          <nav className="flex shrink-0 items-center gap-0.5">
            {TABS.map(t => <Tab key={t.to} {...t} badge={t.to === '/logs' ? rogues.length : 0} />)}
            <span className="mx-2 h-4 w-px bg-white/15" />
            <Tab to="/workbench" t="SaaS 도입 판정" Icon={IconChecklist} />
          </nav>
          <span className="ml-auto flex min-w-0 items-center gap-2.5">
            <Search />
            <AIStatus />
            <button onClick={logout} title="로그아웃" className="ml-1 inline-flex size-8 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-ink transition hover:opacity-85">와</button>
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-8 pt-5 pb-16">
        <Outlet />
        <footer className="flex items-center pt-10 text-xs text-dim"><span className="ml-auto font-mono text-[11px]">전자금융감독규정 시행세칙 제2조의3</span></footer>
      </main>
    </div>
  )
}
