import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, teleStat } from '@/store'
import { matchLedger } from '@/lib/reconcile'
import { textW, ddayLabel } from '@/lib/format'
import { buildMap, core, bz, W, type MapNode } from './layout'
import { cn } from '@/lib/utils'
import { Pill } from '@/components/salpi'

const SVGNS = 'http://www.w3.org/2000/svg'

function fractionAt(path: SVGPathElement, x: number, y: number) {
  const L = path.getTotalLength(); let best = 0, bd = 1e9
  for (let i = 0; i <= 80; i++) { const p = path.getPointAtLength((L * i) / 80); const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i / 80 } }
  return best
}
/* 관측된 줄마다 점 하나가 허브와 목적지 사이를 선을 따라 간다 */
function runPacket(layer: SVGGElement, path: SVGPathElement, from: number, to: number, dur: number, rogue: boolean, delay: number) {
  const c = document.createElementNS(SVGNS, 'circle')
  c.setAttribute('r', '2.2'); c.setAttribute('class', 'pkt-dot')
  c.style.fill = rogue ? '#c53030' : '#2157d1'; c.style.opacity = rogue ? '.75' : '.8'
  c.style.offsetPath = `path('${path.getAttribute('d')}')`; c.style.offsetRotate = '0deg'
  c.style.offsetDistance = from * 100 + '%'
  layer.appendChild(c)
  const anim = c.animate([{ offsetDistance: from * 100 + '%' }, { offsetDistance: to * 100 + '%' }], { duration: dur, delay, easing: 'linear', fill: 'forwards' })
  anim.onfinish = () => c.remove()
}

export function BoundaryMap() {
  const ledger = useStore(s => s.ledger)
  const rogues = useStore(s => s.rogues)
  const tele = useStore(s => s.tele.sessions)
  const sel = useStore(s => s.sel)
  const setSel = useStore(s => s.setSel)
  const live = useStore(s => s.feed.on)
  const freshHosts = useStore(s => s.freshHosts)
  const hit = useStore(s => s.hitHosts)
  const nav = useNavigate()
  const ts = useMemo(() => teleStat(tele), [tele])
  const model = useMemo(() => buildMap(ledger, rogues, ts), [ledger, rogues, ts])
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pktRef = useRef<SVGGElement>(null)
  const [hover, setHover] = useState<{ key: string; x: number; y: number } | null>(null)

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
    const c = ledger.find(x => x.id === key)
    if (c?.zone === 'tele') { setSel(null); nav('/telework'); return }
    setSel(key)
  }
  const onEnter = (key: string, e: React.MouseEvent<SVGGElement>) => {
    const wr = wrapRef.current?.getBoundingClientRect(); if (!wr) return
    const nr = (e.currentTarget as SVGGElement).getBoundingClientRect()
    setHover({ key, x: nr.left - wr.left, y: nr.bottom - wr.top + 8 })
  }

  const chipW = 44
  return (
    <div ref={wrapRef} className={cn('relative overflow-hidden rounded-lg border bg-card', live && 'map-live')}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${model.H}`} width="100%" className="block px-3 pt-2" style={{ fontFamily: 'var(--font-sans)' }}>
        {/* 면: 구역과 경계 */}
        {model.zones.map(z => <rect key={z.key} className="map-zone" x={z.x} y={z.y} width={z.w} height={z.h} rx="12" />)}
        <rect className="map-bz" x={bz.x} y={bz.y} width={bz.w} height={bz.h} rx="14" />
        <text x={bz.x + 16} y={bz.y + 22} fontSize="11" fontWeight="500" fill="#5b7393" letterSpacing=".04em">내부 업무망 경계</text>
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
          const tw = z.st ? z.st.t.replace(/\s/g, '').length * 9 + (z.st.t.split(' ').length - 1) * 4 : 0
          return (
            <g key={z.key + '-t'} style={{ pointerEvents: 'none' }}>
              <text x={z.x + 16} y={z.y + 22} fontSize="12" fontWeight="500" fill="#425466">{z.title}</text>
              <text x={z.x + 16 + textW(z.title, 12) + 8} y={z.y + 22} fontSize="11" fontWeight="500" fill="#697386" fontFamily="var(--font-mono)">{z.n}</text>
              {z.st && <>
                <circle cx={z.x + z.w - 16 - tw - 9} cy={z.y + 18} r="3" fill={z.st.cls === 'ok' ? '#1f8a4c' : z.st.cls === 'soon' ? '#b7791f' : '#c53030'} />
                <text x={z.x + z.w - 16} y={z.y + 22} fontSize="11" fontWeight="500" fill="#697386" textAnchor="end">{z.st.t}</text>
              </>}
            </g>
          )
        })}
        {/* 노드 */}
        {model.nodes.map(n => <Node key={n.key} n={n} sel={sel === n.key} enter={n.rogue && freshHosts.includes(n.name)} onClick={() => onClick(n.key)} onEnter={e => onEnter(n.key, e)} onLeave={() => setHover(null)} />)}
        {/* 허브 */}
        <Hub rogues={rogues.length} />
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
      <Legend live={live} />
      {hover && <Popover hoverKey={hover.key} x={hover.x} y={hover.y} wrap={wrapRef.current} />}
    </div>
  )
}

function Node({ n, sel, enter, onClick, onEnter, onLeave }: { n: MapNode; sel: boolean; enter: boolean; onClick: () => void; onEnter: (e: React.MouseEvent<SVGGElement>) => void; onLeave: () => void }) {
  const dot = n.st === 'ok' ? '#1f8a4c' : n.st === 'soon' ? '#b7791f' : '#c53030'
  return (
    <g className={cn('map-node cursor-pointer', sel && 'sel', n.rogue && 'rogue', enter && 'enter')} onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <rect className="bg" x={n.x} y={n.y} width={n.w} height="44" rx="6" />
      {n.rogue && <rect x={n.x} y={n.y} width={n.w} height="44" rx="6" fill="rgba(197,48,48,.05)" />}
      <circle cx={n.x + 16} cy={n.y + 22} r="3" fill={dot} />
      <text x={n.x + 28} y={n.y + 26.5} fontSize="13" fontWeight="500" fill="#0a2540" letterSpacing="-.01em" fontFamily={n.rogue ? 'var(--font-mono)' : undefined} style={{ pointerEvents: 'none' }}>{n.name}</text>
      {n.aux && <text x={n.x + n.w - 14} y={n.y + 26.5} fontSize="12" fontWeight="500" fill="#425466" textAnchor="end" fontFamily="var(--font-mono)" style={{ pointerEvents: 'none' }}>{n.aux}</text>}
      {n.rogue && <path d={`M${n.x + n.w - 18} ${n.y + 17} l5 5 -5 5`} fill="none" stroke="#697386" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />}
    </g>
  )
}

function Hub({ rogues }: { rogues: number }) {
  const ledger = useStore(s => s.ledger)
  const scanned = useStore(s => s.scanned)
  const lastScan = useStore(s => s.lastScan)
  const row = (dy: number, k: string, v: string | number, cls = '#0a2540') => (
    <g key={k}>
      <text x={core.x + 20} y={core.y + dy} fontSize="12" fill="#697386">{k}</text>
      <text x={core.x + core.w - 20} y={core.y + dy} fontSize="12.5" fontWeight="500" fill={cls} textAnchor="end" fontFamily="var(--font-mono)">{v}</text>
    </g>
  )
  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <radialGradient id="hubShadow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#0a2540" stopOpacity=".10" /><stop offset=".6" stopColor="#0a2540" stopOpacity=".03" /><stop offset="1" stopColor="#0a2540" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x={core.x - 20} y={core.y - 8} width={core.w + 40} height={core.h + 40} rx="32" fill="url(#hubShadow)" />
      <rect x={core.x} y={core.y} width={core.w} height={core.h} rx="10" fill="#fff" stroke="#0a2540" strokeWidth="1.25" />
      <text x={core.x + 20} y={core.y + 26} fontSize="14" fontWeight="600" fill="#0a2540">내부업무망</text>
      <text x={core.x + core.w - 20} y={core.y + 26} fontSize="11" fontWeight="500" fill="#697386" textAnchor="end" fontFamily="var(--font-mono)">단말 152대</text>
      <line x1={core.x + 16} y1={core.y + 40.5} x2={core.x + core.w - 16} y2={core.y + 40.5} stroke="#e3e8ee" />
      {row(62, '승인 통로', ledger.length)}
      {row(86, '미등록 연결', scanned ? rogues : '-', scanned ? (rogues ? '#a41c1c' : '#05690d') : '#8792a2')}
      {row(110, '마지막 대조', lastScan || '-', lastScan ? '#0a2540' : '#8792a2')}
    </g>
  )
}

function Legend({ live }: { live: boolean }) {
  const lastScan = useStore(s => s.lastScan)
  const scanned = useStore(s => s.scanned)
  const Line = ({ cls }: { cls: string }) => <i className={cn('mr-2 inline-block w-4 align-[3px] border-t', cls)} />
  return (
    <div className="flex items-center gap-5 border-t px-5 py-2.5 text-xs text-faint">
      <span className="flex items-center gap-4"><span className="text-[11px] font-medium text-dim">통로</span><span><Line cls="border-[#5d85df] border-t-[1.25px]" />승인</span><span><Line cls="border-[#b7791f]" />기한 임박</span><span><Line cls="border-[#c53030] border-dashed border-t-[1.5px]" />미등록</span></span>
      <span className="ml-4 flex items-center gap-4 border-l pl-5"><span className="text-[11px] font-medium text-dim">기한</span><span><i className="mr-1.5 inline-block size-1.5 rounded-full bg-ok" />정상</span><span><i className="mr-1.5 inline-block size-1.5 rounded-full bg-[#b7791f]" />임박</span><span><i className="mr-1.5 inline-block size-1.5 rounded-full bg-bad" />경과</span></span>
      {scanned && <span className="ml-auto font-mono text-[11px] text-dim">{live ? '관측 중, ' : ''}마지막 대조 {lastScan}</span>}
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
      <div className="mb-1 flex items-center gap-2 text-ink"><b className="font-mono font-semibold">{r.host}</b><Pill tone="bad">미등록</Pill></div>
      <div className="flex gap-3.5"><span>{r.cls.kind}</span><span>{r.info.count}회, 단말 {r.info.srcs.size}대</span></div>
      <div className="mt-1 text-body">{r.cls.risk}</div>
    </>
  }
  return <div ref={ref} className="pointer-events-none absolute z-10 min-w-[240px] max-w-[320px] rounded-lg border bg-popover px-3 py-2.5 text-[12.5px] leading-[18px] text-body shadow-lg" style={{ left: pos.left, top: pos.top }}>{body}</div>
}
