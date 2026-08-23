import { CLASSIFY, UNKNOWN_CLS, type Classification, type Conduit } from '@/data/ledger'

export interface HostInfo { count: number; srcs: Set<string>; ports: Set<string> }
export interface Rogue { host: string; info: HostInfo; cls: Classification }
export interface Blocked { host: string; kind: string; reason: string }
export type LogRow =
  | { host: string; info: HostInfo; status: 'ok'; conduit: Conduit }
  | { host: string; info: HostInfo; status: 'blocked'; blk: Blocked }
  | { host: string; info: HostInfo; status: 'rogue'; rogue: Rogue }

export function parseLog(text: string) {
  const agg: Record<string, HostInfo> = {}
  for (const line of text.split('\n')) {
    const h = /HOST=(\S+)/.exec(line), s = /SRC=(\S+)/.exec(line), p = /DPT=(\S+)/.exec(line)
    if (!h) continue
    const host = h[1].toLowerCase()
    agg[host] = agg[host] || { count: 0, srcs: new Set(), ports: new Set() }
    agg[host].count++
    if (s) agg[host].srcs.add(s[1])
    if (p) agg[host].ports.add(p[1])
  }
  return agg
}

export const matchLedger = (ledger: Conduit[], host: string) =>
  ledger.find(c => c.domains.some(d => host === d || host.endsWith('.' + d)))

export function classifyBuiltin(host: string): Classification {
  const base = Object.keys(CLASSIFY).find(k => host === k || host.endsWith('.' + k))
  return base ? CLASSIFY[base] : UNKNOWN_CLS
}

/* 집합 연산이라 같은 입력에 언제나 같은 결과 */
export function reconcile(text: string, ledger: Conduit[], blocked: Blocked[]) {
  const agg = parseLog(text)
  const rows: LogRow[] = [], rogues: Rogue[] = []
  for (const [host, info] of Object.entries(agg)) {
    const hit = matchLedger(ledger, host)
    if (hit) { rows.push({ host, info, status: 'ok', conduit: hit }); continue }
    const blk = blocked.find(b => b.host === host)
    if (blk) { rows.push({ host, info, status: 'blocked', blk }); continue }
    const rogue: Rogue = { host, info, cls: classifyBuiltin(host) }
    rows.push({ host, info, status: 'rogue', rogue })
    rogues.push(rogue)
  }
  rows.sort((a, b) => (a.status === 'rogue' ? -1 : 1) - (b.status === 'rogue' ? -1 : 1) || b.info.count - a.info.count)
  return { rows, rogues }
}
