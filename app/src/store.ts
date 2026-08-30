import { create } from 'zustand'
import { toast } from 'sonner'
import { INITIAL_LEDGER, CLASSIFY, UNKNOWN_CLS, type Conduit, type Classification } from '@/data/ledger'
import { reconcile, matchLedger, type Rogue, type Blocked } from '@/lib/reconcile'
import { Engine } from '@/lib/engineLoad'
import { now, hhmm, today } from '@/lib/format'
import type { Verdict } from '@/lib/judge'

export type EventKind = 'rogue' | 'ai' | 'block' | 'register' | 'content' | 'scan' | 'sys' | 'tele'
export interface ActivityEvent { id: number; t: string; kind: EventKind; text: string }
export interface ContentRecord { t: number; tag: string; masked: string }
export interface TeleSession { id: string; user: string; dept: string; region: string; since: string; mfa: boolean; check: 'ok' | 'fail'; checkNote: string }

const TELE_NAMES0 = ['김서연','박준호','이지우','최민재','정하윤','강도현','윤서아','임태양','한예린','오승민','신유진','조현우','배소율','권지훈','송나래','황민서','문채원','류시우','전다은','홍재민','노아인','서지안','백현준','안소현','장우진','구하은','남도윤','심예나','유건우','곽지민','마서진','표준서','엄채은','탁시현','변하람','원지호','길다인','방수아','석준영','피서윤']
// 관제 화면에는 실명 대신 가운데를 가린 이름만 노출한다
const TELE_NAMES = TELE_NAMES0.map(n => n[0] + '○' + n.slice(2))
const TELE_DEPTS = ['영업2팀','여신심사팀','IT운영팀','준법감시팀','고객지원팀','리스크관리팀','상품개발팀']
const TELE_REGIONS = ['서울','경기','인천','부산','대전']
const TELE_FAIL = ['백신 정의 갱신 3일 경과', 'OS 보안 패치 미적용', '화면 캡처 차단 에이전트 미실행']
const FEED_ROGUE_AT: Record<number, string> = { 4: 'chatgpt.com', 10: 'notion.so', 17: 'anydesk.com', 24: 'webmail.daehanpost.kr', 31: 'pcshare.kr' }

function teleInit(): TeleSession[] {
  const t0 = Date.now()
  return Array.from({ length: 23 }, (_, i) => ({
    id: 's' + i, user: TELE_NAMES[i], dept: TELE_DEPTS[i % TELE_DEPTS.length], region: TELE_REGIONS[i % 5],
    since: new Date(t0 - (20 + Math.floor(Math.random() * 180)) * 60000).toTimeString().slice(0, 5), mfa: true, check: 'ok', checkNote: '',
  }))
}

interface State {
  authed: boolean
  ledger: Conduit[]
  nextId: number
  sel: string | null
  scanned: boolean
  lastScan: string | null
  rogues: Rogue[]
  blocked: Blocked[]
  contentLog: Record<string, ContentRecord[]>
  detReady: boolean
  detMode: 'heuristic' | 'hybrid'
  feed: { on: boolean; started: boolean; lines: string[]; received: number; tick: number; last: string | null; aiCount: number }
  events: ActivityEvent[]
  tele: { sessions: TeleSession[]; next: number }
  freshHosts: string[]          // 이번 틱에 새로 잡힌 미등록 (등장 애니메이션)
  hitHosts: { id: number; hosts: string[] }   // 이번 틱에 관측된 줄의 목적지 (점 흐름)
  quiet: boolean
  // actions
  login: () => void
  logout: () => void
  setSel: (s: string | null) => void
  setDetMode: (m: 'heuristic' | 'hybrid') => void
  probeAI: () => Promise<boolean>
  logEvent: (kind: EventKind, text: string) => void
  runScan: (text: string) => ReturnType<typeof reconcile>
  quickBlock: (host: string) => void
  register: (w: { name: string; host: string; saasKey: string | null; fromRogue: boolean; verdict: Verdict }) => string
  blockFromWizard: (host: string, kind: string, reason: string) => void
  addContentLog: (id: string, recs: ContentRecord[]) => void
  startFeed: () => Promise<void>
  pauseFeed: () => void
  feedTick: () => void
}

let timer: ReturnType<typeof setInterval> | null = null
let evSeq = 0, hitSeq = 0

export const useStore = create<State>((set, get) => ({
  authed: sessionStorage.getItem('salpi_auth') === '1',
  ledger: INITIAL_LEDGER.map(c => ({ ...c })),
  nextId: 10,
  sel: null,
  scanned: false,
  lastScan: null,
  rogues: [],
  blocked: [],
  contentLog: {},
  detReady: false,
  detMode: 'heuristic',
  feed: { on: false, started: false, lines: [], received: 0, tick: 0, last: null, aiCount: 0 },
  events: [],
  tele: { sessions: teleInit(), next: 23 },
  freshHosts: [],
  hitHosts: { id: 0, hosts: [] },
  quiet: false,

  login: () => { sessionStorage.setItem('salpi_auth', '1'); set({ authed: true }) },
  logout: () => { sessionStorage.removeItem('salpi_auth'); if (timer) clearInterval(timer); timer = null; set({ authed: false }) },
  setSel: sel => set({ sel }),
  setDetMode: detMode => set({ detMode }),

  probeAI: async () => {
    const av = await Engine.llmAvailable()
    const ok = !!(av.ok && av.hasModel)
    // AI가 처음 연결되면 정밀 검사를 기본값으로
    set(st => ({ detReady: ok, detMode: ok && !st.detReady && st.detMode === 'heuristic' ? 'hybrid' : st.detMode }))
    return ok
  },

  logEvent: (kind, text) => set(s => ({ events: [...s.events.slice(-199), { id: ++evSeq, t: now(), kind, text }] })),

  runScan: text => {
    const s = get()
    const rec = reconcile(text, s.ledger, s.blocked)
    set({ rogues: rec.rogues, scanned: true, lastScan: hhmm() })
    get().logEvent('scan', `수동 대조: 목적지 ${rec.rows.length}곳, 미승인 ${rec.rogues.length}건`)
    toast(`대조 완료: 목적지 ${rec.rows.length}곳, 미승인 ${rec.rogues.length}건`)
    return rec
  },

  quickBlock: host => {
    const r = get().rogues.find(x => x.host === host); if (!r) return
    set(s => ({ blocked: [...s.blocked, { host, kind: r.cls.kind, reason: r.cls.risk }], rogues: s.rogues.filter(x => x.host !== host), sel: null }))
    get().logEvent('block', `${host} 차단 요청 기록, 방화벽 정책 반영 대기`)
    toast.error(`${host} 차단 요청 기록`)
  },

  register: w => {
    const s = get()
    const id = 'C-' + String(s.nextId).padStart(2, '0')
    const due = new Date(); due.setMonth(due.getMonth() + 6)
    const v = w.verdict
    const c: Conduit = {
      id, name: w.name, type: 'SaaS', basis: '제2조의3 ①항 3호', zone: 'saas', saasKey: w.saasKey || undefined,
      domains: [w.host || w.name.toLowerCase()], ports: '443', dir: '아웃바운드',
      approved: `${today()} 위원회 상정 대기, 판정 ${v.grade === 'ok' ? '적합' : '조건부'}`,
      controls: v.grade === 'cond' ? `살피 판정 조건부 (${v.risks.length}건 부기) + 살피 내용검사 보완통제` : '별표7 SaaS 10개 통제',
      review: { type: '반기 자체평가 (제4항)', due: due.toISOString().slice(0, 7), soon: false },
      pendingRisks: v.risks.length,
    }
    set(st => ({ ledger: [...st.ledger, c], nextId: st.nextId + 1, rogues: w.fromRogue ? st.rogues.filter(r => r.host !== w.host) : st.rogues }))
    get().logEvent('register', `${id} ${w.name} 등재, 판정 ${v.grade === 'ok' ? '적합' : '조건부'}`)
    toast.success(`${id} ${w.name} 등재됨, 위원회 상정 대기`)
    return id
  },

  blockFromWizard: (host, kind, reason) => {
    set(s => ({ blocked: [...s.blocked, { host, kind, reason }], rogues: s.rogues.filter(r => r.host !== host) }))
    get().logEvent('block', `${host} 차단 요청 기록, 방화벽 정책 반영 대기`)
    toast.error(`${host} 차단 요청 기록`)
  },

  addContentLog: (id, recs) => set(s => ({ contentLog: { ...s.contentLog, [id]: [...(s.contentLog[id] || []), ...recs].slice(-100) } })),

  startFeed: async () => {
    const s = get()
    if (!s.feed.started) {
      const ok = await get().probeAI()
      get().logEvent('sys', ok ? 'AI 연결됨, 미확인 목적지는 Kanana가 분류' : 'AI 미연결, 내장 분류로 동작')
    }
    set(st => ({ feed: { ...st.feed, on: true, started: true } }))
    get().logEvent('sys', '관측 시작, 데모 피드(합성)')
    if (timer) clearInterval(timer)
    timer = setInterval(() => get().feedTick(), 2500)
    get().feedTick()
  },

  pauseFeed: () => {
    if (timer) clearInterval(timer); timer = null
    set(s => ({ feed: { ...s.feed, on: false } }))
    get().logEvent('sys', '관측 일시정지')
  },

  feedTick: () => {
    const s = get()
    const f = { ...s.feed, tick: s.feed.tick + 1 }
    const n = 1 + Math.floor(Math.random() * 2)
    const lines = [...f.lines]
    for (let i = 0; i < n; i++) lines.push(feedLine(f.tick, s.ledger))
    // 재택 세션 변화와 재택 줄
    const tele = teleTick(s.tele, f.tick, get().logEvent)
    lines.push(`${today()} ${now()} SRC=ext HOST=ra.paymon.co.kr DPT=443 ACTION=ALLOW`)
    if (lines.length > 400) lines.splice(0, lines.length - 400)
    f.lines = lines; f.received += n; f.last = now()
    const hitHosts = lines.slice(-(n + 1)).map(l => ((l.match(/HOST=(\S+)/) || [])[1] || '').toLowerCase())
    const rec = reconcile(lines.join('\n'), s.ledger, s.blocked)
    const known = new Set(s.rogues.map(r => r.host))
    const fresh = rec.rogues.filter(r => !known.has(r.host))
    const rogues = rec.rogues.map(r => { const prev = s.rogues.find(x => x.host === r.host); return prev ? { ...prev, info: r.info } : r })
    set({ feed: f, tele, rogues, scanned: true, lastScan: f.last.slice(0, 5), freshHosts: fresh.map(r => r.host), hitHosts: { id: ++hitSeq, hosts: hitHosts } })
    fresh.forEach(r => {
      get().logEvent('rogue', `미승인 연결 발견: ${r.host}, 단말 ${r.info.srcs.size}대, 포트 ${[...r.info.ports].join(',')}`)
      classifyRogue(r, get, set)
    })
  },
}))

function feedLine(tick: number, ledger: Conduit[]) {
  const seenKeys = Object.keys(FEED_ROGUE_AT).map(Number).filter(k => k <= tick)
  const seen = seenKeys.map(k => FEED_ROGUE_AT[k])
  const approved = ledger.filter(c => c.zone !== 'tele').map(c => ({ host: c.domains[0], port: (c.ports || '443').split(',')[0].trim() }))
  const pick = Math.random()
  let host: string, port: string
  if (FEED_ROGUE_AT[tick]) { host = FEED_ROGUE_AT[tick]; port = host === 'anydesk.com' ? '7070' : host === 'pcshare.kr' ? '3389' : '443' }
  else if (seen.length && pick < 0.22) { host = seen[Math.floor(Math.random() * seen.length)]; port = host === 'anydesk.com' ? '7070' : host === 'pcshare.kr' ? '3389' : '443' }
  else { const a = approved[Math.floor(Math.random() * approved.length)]; host = a.host; port = a.port }
  const src = `10.20.${1 + Math.floor(Math.random() * 3)}.${2 + Math.floor(Math.random() * 60)}`
  return `${today()} ${now()} SRC=${src} HOST=${host} DPT=${port} ACTION=ALLOW`
}

/* 세션마다 규정 제12조 단말 보안대책 충족 여부를 따진다. 점검은 규칙이고 AI는 쓰지 않는다 */
function teleTick(t: State['tele'], tick: number, logEvent: State['logEvent']): State['tele'] {
  const r = Math.random(), forceFail = tick === 7 || tick === 19
  let sessions = [...t.sessions], next = t.next
  if ((forceFail || r < 0.18) && sessions.length < 34) {
    const sess: TeleSession = { id: 's' + next, user: TELE_NAMES[next % TELE_NAMES.length], dept: TELE_DEPTS[next % TELE_DEPTS.length], region: TELE_REGIONS[next % 5], since: hhmm(), mfa: true, check: 'ok', checkNote: '' }
    next++
    if (forceFail || (tick > 30 && Math.random() < 0.12)) {
      sess.check = 'fail'; sess.checkNote = TELE_FAIL[Math.floor(Math.random() * TELE_FAIL.length)]
      logEvent('tele', `재택 단말 점검 미통과: ${sess.user}(${sess.dept}), ${sess.checkNote}`)
    }
    sessions.push(sess)
  } else if (r > 0.84 && sessions.length > 12) {
    sessions.splice(Math.floor(Math.random() * sessions.length), 1)
  }
  return { sessions, next }
}

async function classifyRogue(r: Rogue, get: () => State, set: (p: Partial<State> | ((s: State) => Partial<State>)) => void) {
  const s = get()
  if (!s.detReady) { s.logEvent('ai', `${r.host} 내장 분류: ${r.cls.kind} (AI 미연결)`); return }
  set(st => ({ rogues: st.rogues.map(x => x.host === r.host ? { ...x, cls: { ...x.cls, kind: '분류 중', pending: true } } : x) }))
  const t0 = performance.now()
  let out: Classification | null = null
  try { out = await Engine.llmClassifyHost(r.host, { count: r.info.count, devices: r.info.srcs.size, ports: [...r.info.ports] }) } catch { out = null }
  const live = get().rogues.find(x => x.host === r.host); if (!live) return
  if (out) {
    set(st => ({ rogues: st.rogues.map(x => x.host === r.host ? { ...x, cls: { ...(CLASSIFY[r.host] || {}), ...out! } } : x), feed: { ...st.feed, aiCount: st.feed.aiCount + 1 } }))
    get().logEvent('ai', `${r.host} 분류: ${out.kind}${out.saasLike ? ' (SaaS형)' : ''}${out.clue ? `, 단서 ${out.clue}` : ''}. ${out.risk} (${((performance.now() - t0) / 1000).toFixed(1)}s)`)
  } else {
    const cls = CLASSIFY[r.host] || UNKNOWN_CLS
    set(st => ({ rogues: st.rogues.map(x => x.host === r.host ? { ...x, cls: { ...cls } } : x) }))
    get().logEvent('ai', `${r.host} AI 판단 보류, 내장 분류로 ${cls.kind}`)
  }
}

/* 파생값 */
export const teleStat = (sessions: TeleSession[]) => ({ n: sessions.length, fail: sessions.filter(x => x.check === 'fail').length })
export const contentCount = (log: Record<string, ContentRecord[]>, id: string) => (log[id] || []).length
export const detectCount = (log: Record<string, ContentRecord[]>) => Object.values(log).reduce((n, a) => n + a.length, 0)
export { matchLedger }
