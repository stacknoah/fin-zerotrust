import type { Conduit } from '@/data/ledger'
import type { Rogue } from '@/lib/reconcile'
import { dueState, type DueState } from '@/lib/format'

export const W = 1400
const R = 8, PITCH = 52, ZT = 36, ZB = 16, FP = 22, H_N = 44
export const core = { x: W / 2 - 130, y: 292, w: 260, h: 104 }
export const bz = { x: core.x - 48, y: core.y - 40, w: core.w + 96, h: core.h + 80 }
const RZ = W - 36 - 252, RN = RZ + 16
const DY = 420, RY = 372, RMY = 228

export type EdgeKind = DueState | 'rogue'
export interface MapNode { key: string; x: number; y: number; w: number; name: string; rogue: boolean; st: DueState | 'rogue'; aux?: string; zone: string }
export interface MapEdge { key: string; d: string; kind: EdgeKind; chip?: { x: number; y: number; label: string }; inbound?: boolean }
export interface MapZone { key: string; x: number; y: number; w: number; h: number; title: string; n: string; st?: { cls: 'ok' | 'soon' | 'bad'; t: string } }
export interface MapModel { H: number; nodes: MapNode[]; edges: MapEdge[]; zones: MapZone[]; trunkKey?: string }

const stOf = (c: Conduit) => dueState(c.review.due, c.review.soon)
const zoneSt = (list: Conduit[]): MapZone['st'] => {
  const over = list.filter(c => stOf(c) === 'over').length, soon = list.filter(c => stOf(c) === 'soon').length
  return over ? { cls: 'bad', t: '기한 경과 ' + over } : soon ? { cls: 'soon', t: '점검 임박 ' + soon } : { cls: 'ok', t: '정상' }
}

/* 직각 배선. 바깥 노드일수록 바깥 버스라 수평 구간이 다른 버스를 가로지르지 않는다 */
function edgeH(x1: number, y1: number, x2: number, y2: number, k: number, n: number, outerFirst = true) {
  const dir = x2 > x1 ? 1 : -1
  if (y1 === y2) return `M${x1} ${y1} H${x2}`
  const sy = y2 > y1 ? 1 : -1, r = Math.min(R, Math.abs(y2 - y1) / 2)
  const xm = x1 + dir * (44 + (outerFirst ? n - 1 - k : k) * 12)
  const s1 = dir * sy > 0 ? 1 : 0
  return `M${x1} ${y1} H${xm - dir * r} a${r} ${r} 0 0 ${s1} ${dir * r} ${sy * r} V${y2 - sy * r} a${r} ${r} 0 0 ${1 - s1} ${dir * r} ${sy * r} H${x2}`
}
function edgeV(x1: number, y1: number, x2: number, y2: number, yj: number) {
  const sy = y2 > y1 ? 1 : -1
  if (x1 === x2) return `M${x1} ${y1} V${y2}`
  const dir = x2 > x1 ? 1 : -1, r = Math.min(R, Math.abs(x2 - x1) / 2)
  const s1 = dir * sy > 0 ? 0 : 1
  return `M${x1} ${y1} V${yj - sy * r} a${r} ${r} 0 0 ${s1} ${dir * r} ${sy * r} H${x2 - dir * r} a${r} ${r} 0 0 ${1 - s1} ${dir * r} ${sy * r} V${y2}`
}

export function buildMap(ledger: Conduit[], rogues: Rogue[], tele: { n: number; fail: number }): MapModel {
  const zoneOf = (z: string) => ledger.filter(c => c.zone === z)
  const fin = zoneOf('fin'), saas = zoneOf('saas'), remote = zoneOf('remote'), dmz = zoneOf('dmz'), teleC = zoneOf('tele')
  const nodes: MapNode[] = [], edges: MapEdge[] = [], zones: MapZone[] = []
  const H = Math.max(DY + ZT + dmz.length * PITCH + 32, RY + ZT + rogues.length * PITCH + 32, 560)

  // 외부기관 (좌상)
  zones.push({ key: 'fin', x: 36, y: 116, w: 252, h: ZT + fin.length * PITCH + ZB, title: '외부기관', n: String(fin.length), st: zoneSt(fin) })
  fin.forEach((c, k) => {
    const y = 116 + ZT + k * PITCH, y2 = core.y + 20 + k * FP
    nodes.push({ key: c.id, x: 52, y, w: 220, name: c.name, rogue: false, st: stOf(c), zone: 'fin' })
    edges.push({ key: c.id, d: edgeH(272, y + 22, core.x, y2, k, fin.length), kind: stOf(c), chip: { x: bz.x, y: y2, label: c.id } })
  })
  // DMZ, 계열사 (좌하): 경계 아래 변으로 진입
  zones.push({ key: 'dmz', x: 36, y: DY, w: 252, h: ZT + dmz.length * PITCH + ZB, title: 'DMZ / 계열사', n: String(dmz.length), st: zoneSt(dmz) })
  dmz.forEach((c, k) => {
    const y = DY + ZT + k * PITCH + 22, xe = core.x + 36 + k * 56
    nodes.push({ key: c.id, x: 52, y: y - 22, w: 220, name: c.name, rogue: false, st: stOf(c), zone: 'dmz' })
    edges.push({ key: c.id, d: `M272 ${y} H${xe - R} a${R} ${R} 0 0 0 ${R} ${-R} V${core.y + core.h}`, kind: stOf(c), chip: { x: xe, y: bz.y + bz.h, label: c.id } })
  })
  // SaaS (상)
  const sw = Math.max(2, saas.length) * 206, sx = core.x + core.w / 2 - sw / 2
  zones.push({ key: 'saas', x: sx - 18, y: 36, w: sw + 36, h: ZT + H_N + ZB, title: 'SaaS', n: String(saas.length), st: zoneSt(saas) })
  saas.forEach((c, k) => {
    const x = sx + k * 206, xc = x + 94, xe = Math.min(core.x + core.w - 30, Math.max(core.x + 30, xc))
    nodes.push({ key: c.id, x, y: 36 + ZT, w: 188, name: c.name, rogue: false, st: stOf(c), zone: 'saas' })
    edges.push({ key: c.id, d: edgeV(xc, 36 + ZT + H_N, xe, core.y, bz.y - 26), kind: stOf(c), chip: { x: xe, y: bz.y, label: c.id } })
  })
  // 재택근무 (우상): 인바운드
  zones.push({ key: 'tele', x: RZ, y: 116, w: 252, h: ZT + teleC.length * PITCH + ZB, title: '재택근무', n: tele.n + '명 접속', st: tele.fail ? { cls: 'bad', t: '단말 점검 미통과 ' + tele.fail } : { cls: 'ok', t: '정상' } })
  const rightAll = [...teleC, ...remote]
  teleC.forEach((c, k) => {
    const y = 116 + ZT + k * PITCH, y2 = core.y + 20 + k * FP, st: DueState = tele.fail ? 'over' : stOf(c)
    nodes.push({ key: c.id, x: RN, y, w: 220, name: c.name, rogue: false, st, aux: String(tele.n), zone: 'tele' })
    edges.push({ key: c.id, d: edgeH(RN, y + 22, core.x + core.w, y2, k, rightAll.length), kind: st, chip: { x: bz.x + bz.w, y: y2, label: c.id }, inbound: true })
  })
  // 원격접속 (우중)
  zones.push({ key: 'remote', x: RZ, y: RMY, w: 252, h: ZT + remote.length * PITCH + ZB, title: '원격접속', n: String(remote.length), st: zoneSt(remote) })
  remote.forEach((c, k) => {
    const y = RMY + ZT + k * PITCH, kk = k + teleC.length, y2 = core.y + 20 + kk * FP
    nodes.push({ key: c.id, x: RN, y, w: 220, name: c.name, rogue: false, st: stOf(c), zone: 'remote' })
    edges.push({ key: c.id, d: edgeH(RN, y + 22, core.x + core.w, y2, kk, rightAll.length), kind: stOf(c), chip: { x: bz.x + bz.w, y: y2, label: c.id } })
  })
  // 미등록 (우하): 허브에서 줄기 하나로 나가 경계를 한 번 뚫고 버스에서 갈라진다
  let trunkKey: string | undefined
  if (rogues.length) {
    zones.push({ key: 'rogue', x: RZ, y: RY, w: 252, h: ZT + rogues.length * PITCH + ZB, title: '미등록 목적지', n: String(rogues.length), st: { cls: 'bad', t: '조치 필요' } })
    const yt = core.y + core.h - 28, bx = RN - 44 - 12
    const ys = rogues.map((_, k) => RY + ZT + k * PITCH + 22)
    const last = ys[ys.length - 1]
    trunkKey = 'R-' + (rogues.length - 1)
    edges.push({ key: trunkKey, d: `M${core.x + core.w} ${yt} H${bx - R} a${R} ${R} 0 0 1 ${R} ${R} V${last - R} a${R} ${R} 0 0 0 ${R} ${R} H${RN}`, kind: 'rogue', chip: { x: bz.x + bz.w, y: yt, label: '미등록' } })
    rogues.forEach((r, k) => {
      nodes.push({ key: 'R-' + k, x: RN, y: RY + ZT + k * PITCH, w: 220, name: r.host, rogue: true, st: 'rogue', zone: 'rogue' })
      if (k < rogues.length - 1) edges.push({ key: 'R-' + k, d: `M${bx} ${ys[k]} H${RN}`, kind: 'rogue' })
    })
  }
  return { H, nodes, edges, zones, trunkKey }
}
