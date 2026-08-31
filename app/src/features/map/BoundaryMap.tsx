import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, teleStat, type TeleSession } from '@/store'
import { matchLedger, type Rogue } from '@/lib/reconcile'
import type { Conduit } from '@/data/ledger'
import { textW, ddayLabel } from '@/lib/format'
import { buildMap, core, bz, W, type MapNode } from './layout'
import { cn } from '@/lib/utils'
import { IconSun, IconMoon, IconMaximize, IconMinimize, IconBuildingBank, IconServer2, IconCloud, IconHome, IconDeviceDesktop, IconAlertTriangle } from '@tabler/icons-react'
import { Pill } from '@/components/salpi'

const SVGNS = 'http://www.w3.org/2000/svg'

/* 구역마다 성격을 드러내는 최소 아이콘 */
const ZONE_ICON: Record<string, typeof IconCloud> = {
  fin: IconBuildingBank, dmz: IconServer2, saas: IconCloud,
  tele: IconHome, remote: IconDeviceDesktop, rogue: IconAlertTriangle,
}

function fractionAt(path: SVGPathElement, x: number, y: number) {
  const L = path.getTotalLength(); let best = 0, bd = 1e9
  for (let i = 0; i <= 80; i++) { const p = path.getPointAtLength((L * i) / 80); const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i / 80 } }
  return best
}
/* 관측된 줄마다 점 하나가 허브와 목적지 사이를 선을 따라 간다 */
function runPacket(layer: SVGGElement, path: SVGPathElement, from: number, to: number, dur: number, rogue: boolean, delay: number) {
  const c = document.createElementNS(SVGNS, 'circle')
  c.setAttribute('r', '2.6')
  c.style.fill = rogue ? '#c4302b' : '#2157d1'; c.style.opacity = rogue ? '.8' : '.85'
  c.style.offsetPath = `path('${path.getAttribute('d')}')`; c.style.offsetRotate = '0deg'
  c.style.offsetDistance = from * 100 + '%'
  layer.appendChild(c)
  const anim = c.animate([{ offsetDistance: from * 100 + '%' }, { offsetDistance: to * 100 + '%' }], { duration: dur, delay, easing: 'linear', fill: 'forwards' })
  anim.onfinish = () => c.remove()
}

export interface MapData { ledger: Conduit[]; rogues: Rogue[]; tele: TeleSession[]; hit: { id: number; hosts: string[] }; live: boolean; scanned: boolean; lastScan: string | null }

/* data를 주면 스토어 대신 그 값으로 그린다 (랜딩 미리보기). 없으면 콘솔 스토어 */
export function BoundaryMap({ data, compact }: { data?: MapData; compact?: boolean }) {
  const st = useStore()
  const ledger = data ? data.ledger : st.ledger
  const rogues = data ? data.rogues : st.rogues
  const tele = data ? data.tele : st.tele.sessions
  const live = data ? data.live : st.feed.on
  const hit = data ? data.hit : st.hitHosts
  const scanned = data ? data.scanned : st.scanned
  const lastScan = data ? data.lastScan : st.lastScan
  const sel = data ? null : st.sel
  const setSel = st.setSel
  const freshHosts = data ? [] : st.freshHosts
  const nav = useNavigate()
  const ts = useMemo(() => teleStat(tele), [tele])
  const model = useMemo(() => buildMap(ledger, rogues, ts), [ledger, rogues, ts])
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pktRef = useRef<SVGGElement>(null)
  const [hover, setHover] = useState<{ key: string; x: number; y: number } | null>(null)
  const [dark, setDark] = useState(false)
  const [fs, setFs] = useState(false)
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])
  const toggleFs = () => {
    const el = wrapRef.current; if (!el) return
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else el.requestFullscreen().catch(() => {})
  }

  // 관측 점 흐름
  useEffect(() => {
    const svg = svgRef.current, layer = pktRef.current
    if (!svg || !layer || !hit.hosts.length) return
    hit.hosts.forEach((h, i) => {
      const delay = i * 260
      const c = matchLedger(ledger, h)
      if (c) {
        const p = svg.querySelector<SVGPathElement>(`path[data-edge="${c.id}"]`); if (!p) return
        if (c.zone === 'tele') runPacket(layer, p, 0, 1, 1100, false, delay); else runPacket(layer, p, 1, 0, 1100, false, delay)
        return
      }
      const k = rogues.findIndex(r => r.host === h); if (k < 0) return
      const n = rogues.length, trunk = svg.querySelector<SVGPathElement>(`path[data-edge="R-${n - 1}"]`); if (!trunk) return
      if (k === n - 1) { runPacket(layer, trunk, 0, 1, 1300, true, delay); return }
      const stub = svg.querySelector<SVGPathElement>(`path[data-edge="R-${k}"]`); if (!stub) return
      const sp = stub.getPointAtLength(0), f = fractionAt(trunk, sp.x, sp.y)
      runPacket(layer, trunk, 0, f, 900 * f + 300, true, delay)
      runPacket(layer, stub, 0, 1, 350, true, delay + 900 * f + 300)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hit.id])

  const onClick = (key: string) => {
    if (data) return
    const c = ledger.find(x => x.id === key)
    if (c?.zone === 'tele') { setSel(null); nav('/telework'); return }
    setSel(sel === key ? null : key)
  }
  const onEnter = (key: string, e: React.MouseEvent<SVGGElement>) => {
    if (data) return
    const wr = wrapRef.current?.getBoundingClientRect(); if (!wr) return
    const nr = (e.currentTarget as SVGGElement).getBoundingClientRect()
    setHover({ key, x: nr.left - wr.left, y: nr.bottom - wr.top + 8 })
  }

  const chipW = 44
  return (
    <div ref={wrapRef} className={cn('map-wrap relative overflow-hidden', compact ? '' : 'surface-float', live && 'map-live', dark && 'map-dark', fs && 'flex flex-col justify-center')}
      style={dark ? { background: '#0e1420' } : undefined}>
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(var(--m-dot) 1px, transparent 1.2px)', backgroundSize: '22px 22px', opacity: .7 }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 55%, var(--m-veil) 0%, var(--m-veil2) 45%, transparent 75%)' }} />
      <svg ref={svgRef} viewBox={`0 0 ${W} ${model.H}`} width="100%" className={cn('relative block', compact ? '' : 'px-3 pt-2')} style={{ fontFamily: 'var(--font-sans)' }}>
        {/* 면: 구역과 경계 */}
        {model.zones.map(z => <rect key={z.key} className={cn('map-zone', z.key === 'rogue' && 'bad')} x={z.x} y={z.y} width={z.w} height={z.h} rx="14" />)}
        <rect className="map-bz" x={bz.x} y={bz.y} width={bz.w} height={bz.h} rx="16" />
        <text x={bz.x + bz.w - 14} y={bz.y + bz.h - 12} fontSize="11" fontWeight="500" fill="var(--m-bz-text)" letterSpacing=".01em" textAnchor="end">내부 업무망 경계</text>
        {/* 선 */}
        {model.edges.map(e => (
          <g key={e.key}>
            {sel === e.key && <path className="map-halo" d={e.d} />}
            <path className="map-hit" d={e.d} onClick={() => onClick(e.key)} />
            <path data-edge={e.key} className={cn('map-edge', e.kind, sel === e.key && 'sel', e.kind === 'rogue' && freshHosts.length && 'enter')} d={e.d} />
          </g>
        ))}
        <g ref={pktRef} />
        {/* 구역 제목과 상태 */}
        {model.zones.map(z => {
          const tw = z.st ? z.st.t.replace(/\s/g, '').length * 8.6 + (z.st.t.split(' ').length - 1) * 4 : 0
          return (
            <g key={z.key + '-t'} style={{ pointerEvents: 'none' }}>
              {(() => { const I = ZONE_ICON[z.key]; return I ? <I x={z.x + 15} y={z.y + 10} width={14} height={14} stroke={1.8} color={z.key === 'rogue' ? '#c4302b' : 'var(--m-sub)'} /> : null })()}
              <text x={z.x + 36} y={z.y + 22} fontSize="12" fontWeight="600" fill="var(--m-text)" letterSpacing="-.01em">{z.title}</text>
              <text x={z.x + 36 + textW(z.title, 12) + 8} y={z.y + 22} fontSize="11" fontWeight="500" fill="var(--m-sub)" fontFamily="var(--font-mono)">{z.n}</text>
              {z.st && <>
                <circle cx={z.x + z.w - 16 - tw - 9} cy={z.y + 18} r="3" fill={z.st.cls === 'ok' ? '#1a7f37' : z.st.cls === 'soon' ? '#b26a00' : '#c4302b'} />
                <text x={z.x + z.w - 16} y={z.y + 22} fontSize="11" fontWeight="500" fill={z.st.cls === 'ok' ? 'var(--m-dim)' : z.st.cls === 'soon' ? '#b7791f' : '#d0574f'} textAnchor="end">{z.st.t}</text>
              </>}
            </g>
          )
        })}
        {/* 노드 */}
        {model.nodes.map(n => <Node key={n.key} n={n} sel={sel === n.key} enter={n.rogue && freshHosts.includes(n.name)} ai={n.rogue && !!rogues.find(r => r.host === n.name)?.cls.ai} onClick={() => onClick(n.key)} onEnter={e => onEnter(n.key, e)} onLeave={() => setHover(null)} />)}
        {/* 허브 */}
        <Hub rogues={rogues.length} ledgerN={ledger.length} scanned={scanned} lastScan={lastScan} />
        {/* 경계 통과 알약 */}
        {model.edges.filter(e => e.chip).map(e => {
          const c = e.chip!, w = chipW
          return (
            <g key={'chip-' + e.key} className={cn('map-chip', e.kind === 'rogue' ? 'over' : e.kind, sel === e.key && 'sel')} onClick={() => onClick(e.key)}>
              <rect className="cut" x={c.x - w / 2} y={c.y - 9} width={w} height="18" rx="9" />
              <rect className="pill" x={c.x - w / 2} y={c.y - 9} width={w} height="18" rx="9" />
              <text className="t" x={c.x} y={c.y + 3.5} textAnchor="middle">{c.label}</text>
            </g>
          )
        })}
      </svg>
      {!compact && <Legend dark={dark} fs={fs} onDark={() => setDark(v => !v)} onFs={toggleFs} />}
      {hover && !data && <Popover hoverKey={hover.key} x={hover.x} y={hover.y} wrap={wrapRef.current} />}
    </div>
  )
}

function Node({ n, sel, enter, ai, onClick, onEnter, onLeave }: { n: MapNode; sel: boolean; enter: boolean; ai: boolean; onClick: () => void; onEnter: (e: React.MouseEvent<SVGGElement>) => void; onLeave: () => void }) {
  const dot = n.st === 'ok' ? '#1a7f37' : n.st === 'soon' ? '#b26a00' : '#c4302b'
  return (
    <g className={cn('map-node cursor-pointer', sel && 'sel', n.rogue && 'rogue', enter && 'enter')} onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <rect x={n.x} y={n.y + 1} width={n.w} height="44" rx="8" fill="var(--m-zone-line)" />
      <rect className="bg" x={n.x} y={n.y} width={n.w} height="44" rx="8" />
      <circle cx={n.x + 16} cy={n.y + 22} r="3" fill={dot} />
      <text x={n.x + 28} y={n.y + 26.5} fontSize={n.rogue && n.name.length > 15 ? 10.5 : 13} fontWeight="500" fill={n.rogue ? 'var(--m-rogue-text, #a3261f)' : 'var(--m-text)'} letterSpacing="-.01em" fontFamily={n.rogue ? 'var(--font-mono)' : undefined} style={{ pointerEvents: 'none' }}>{n.name}</text>
      {n.aux && <text x={n.x + n.w - 14} y={n.y + 26.5} fontSize="12" fontWeight="500" fill="var(--m-chip-text)" textAnchor="end" fontFamily="var(--font-mono)" style={{ pointerEvents: 'none' }}>{n.aux}</text>}
      {n.rogue && ai && <g style={{ pointerEvents: 'none' }}><rect x={n.x + n.w - 62} y={n.y + 13} width="48" height="18" rx="9" fill="var(--m-ai-chip, #eaf0fd)" /><text x={n.x + n.w - 38} y={n.y + 25.5} fontSize="9.5" fontWeight="600" fill="var(--m-ai-text, #2157d1)" textAnchor="middle">AI 분류</text></g>}
    </g>
  )
}

function Hub({ rogues, ledgerN, scanned, lastScan }: { rogues: number; ledgerN: number; scanned: boolean; lastScan: string | null }) {
  const row = (dy: number, k: string, v: string | number, cls = 'var(--m-text)') => (
    <g key={k}>
      <text x={core.x + 20} y={core.y + dy} fontSize="12" fill="var(--m-dim)">{k}</text>
      <text x={core.x + core.w - 20} y={core.y + dy} fontSize="12.5" fontWeight="500" fill={cls} textAnchor="end" fontFamily="var(--font-mono)">{v}</text>
    </g>
  )
  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <radialGradient id="hubShadow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#131722" stopOpacity=".14" /><stop offset=".6" stopColor="#131722" stopOpacity=".04" /><stop offset="1" stopColor="#131722" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x={core.x - 24} y={core.y - 8} width={core.w + 48} height={core.h + 44} rx="36" fill="url(#hubShadow)" />
      <rect x={core.x} y={core.y} width={core.w} height={core.h} rx="12" fill="var(--m-hub)" stroke="var(--m-hub-line)" strokeWidth="1.5" />
      <text x={core.x + 20} y={core.y + 27} fontSize="14" fontWeight="600" fill="var(--m-text)" letterSpacing="-.01em">내부업무망</text>
      <text x={core.x + core.w - 20} y={core.y + 27} fontSize="11" fontWeight="500" fill="var(--m-sub)" textAnchor="end" fontFamily="var(--font-mono)">단말 152대</text>
      <line x1={core.x + 16} y1={core.y + 41.5} x2={core.x + core.w - 16} y2={core.y + 41.5} stroke="var(--m-hub-div)" />
      {row(63, '승인 연결', ledgerN)}
      {row(87, '미승인 연결', scanned ? rogues : '-', scanned ? (rogues ? '#d0574f' : '#2f9e5c') : 'var(--m-sub)')}
    </g>
  )
}

function Legend({ dark, fs, onDark, onFs }: { dark: boolean; fs: boolean; onDark: () => void; onFs: () => void }) {
  const Line = ({ cls }: { cls: string }) => <i className={cn('mr-2 inline-block w-4 align-[3px] border-t', cls)} />
  const Ctl = ({ on, title, children }: { on?: boolean; title: string; children: React.ReactNode }) => (
    <button onClick={title === '전체화면' || title === '전체화면 나가기' ? onFs : onDark} title={title}
      className="inline-flex size-7 items-center justify-center rounded-md transition-colors"
      style={{ color: on ? 'var(--m-text)' : 'var(--m-sub)', background: on ? 'rgba(125,140,170,.16)' : 'transparent' }}>{children}</button>
  )
  return (
    <div className="relative flex items-center gap-5 px-5 py-2 text-xs" style={{ borderTop: '1px solid var(--m-zone-line)', color: 'var(--m-dim)' }}>
      <span className="flex items-center gap-4"><span className="font-mono text-[10.5px] tracking-[.04em]" style={{ color: 'var(--m-sub)' }}>연결</span><span><Line cls="border-t-[1.25px]" />승인</span><span><Line cls="border-[#c4302b] border-dashed border-t-[1.5px]" />미승인</span></span>
      <span className="ml-4 flex items-center gap-4 pl-5" style={{ borderLeft: '1px solid var(--m-zone-line)' }}><span className="font-mono text-[10.5px] tracking-[.04em]" style={{ color: 'var(--m-sub)' }}>기한</span><span><i className="mr-1.5 inline-block size-1.5 rounded-full bg-ok" />정상</span><span><i className="mr-1.5 inline-block size-1.5 rounded-full bg-warn" />임박</span><span><i className="mr-1.5 inline-block size-1.5 rounded-full bg-bad" />경과</span></span>
      <span className="ml-auto flex items-center gap-0.5">
        <Ctl on={dark} title="어둡게 보기">{dark ? <IconSun className="size-4" stroke={1.7} /> : <IconMoon className="size-4" stroke={1.7} />}</Ctl>
        <Ctl on={fs} title={fs ? '전체화면 나가기' : '전체화면'}>{fs ? <IconMinimize className="size-4" stroke={1.7} /> : <IconMaximize className="size-4" stroke={1.7} />}</Ctl>
      </span>
    </div>
  )
}

function Popover({ hoverKey, x, y, wrap }: { hoverKey: string; x: number; y: number; wrap: HTMLDivElement | null }) {
  const ledger = useStore(s => s.ledger)
  const rogues = useStore(s => s.rogues)
  const tele = useStore(s => s.tele.sessions)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })
  useEffect(() => {
    const el = ref.current, wr = wrap?.getBoundingClientRect(); if (!el || !wr) return
    let left = x, top = y
    if (left + el.offsetWidth > wr.width - 12) left = wr.width - el.offsetWidth - 12
    if (top + el.offsetHeight > wr.height - 12) top = y - el.offsetHeight - 60
    setPos({ left, top })
  }, [x, y, wrap])
  const c = ledger.find(v => v.id === hoverKey)
  let body: React.ReactNode
  if (c && c.zone === 'tele') {
    const ts = teleStat(tele), recent = tele.slice(-3).reverse()
    body = <>
      <div className="mb-1 flex items-center gap-2 text-ink"><b className="font-semibold">{c.name}</b><span className="font-mono text-[11px] text-dim">{c.id}</span></div>
      <div className="flex gap-3.5"><span>접속 중 <b className="font-semibold text-ink">{ts.n}</b>명</span><span>{ts.fail ? <>단말 점검 미통과 <b className="font-semibold text-bad-fg">{ts.fail}</b></> : '단말 점검 전원 통과'}</span></div>
      <div className="mt-1.5 flex flex-col border-t pt-1.5 text-ink">{recent.map(s => <span key={s.id}>{s.user}<i className="ml-1.5 not-italic text-dim">{s.dept} {s.since}</i></span>)}</div>
      <div className="mt-1.5 text-[11.5px] text-primary">클릭하면 세션 상세</div>
    </>
  } else if (c) {
    body = <>
      <div className="mb-1 flex items-center gap-2 text-ink"><b className="font-semibold">{c.name}</b><span className="font-mono text-[11px] text-dim">{c.id}</span></div>
      <div>{c.basis}</div>
      <div className="flex items-center gap-3">{c.review.type} {c.review.due}<span className="font-mono text-[11px] text-faint">{ddayLabel(c.review.due)}</span></div>
    </>
  } else {
    const k = hoverKey.startsWith('R-') ? Number(hoverKey.slice(2)) : rogues.findIndex(r => r.host === hoverKey)
    const r = rogues[k]; if (!r) return null
    body = <>
      <div className="mb-1 flex items-center gap-2 text-ink"><b className="font-mono font-semibold">{r.host}</b><Pill tone="bad">미승인</Pill>{r.cls.ai && <Pill tone="blue">AI 분류</Pill>}</div>
      <div className="flex gap-3.5"><span>{r.cls.kind}</span><span>{r.info.count}회, 단말 {r.info.srcs.size}대</span></div>
      <div className="mt-1 text-body">{r.cls.risk}</div>
    </>
  }
  return <div ref={ref} className="pointer-events-none absolute z-10 min-w-[240px] max-w-[320px] surface-float px-3.5 py-3 text-[12.5px] leading-[18px] text-body" style={{ left: pos.left, top: pos.top }}>{body}</div>
}
