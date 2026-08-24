import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, type TeleSession } from '@/store'
import { Mark } from '@/features/layout/Shell'
import { BoundaryMap, type MapData } from '@/features/map/BoundaryMap'
import { INITIAL_LEDGER, CLASSIFY } from '@/data/ledger'
import type { Rogue } from '@/lib/reconcile'
import { IconArrowRight } from '@tabler/icons-react'

/* 랜딩 미리보기용 고정 데이터. 스토어를 건드리지 않는다 */
const PREVIEW_ROGUES: Rogue[] = [
  { host: 'chatgpt.com', info: { count: 8, srcs: new Set(['10.20.1.15', '10.20.3.57']), ports: new Set(['443']) }, cls: { ...CLASSIFY['chatgpt.com'], ai: true } },
  { host: 'anydesk.com', info: { count: 3, srcs: new Set(['10.20.2.4']), ports: new Set(['443', '6568']) }, cls: { ...CLASSIFY['anydesk.com'], ai: true } },
]
const PREVIEW_TELE: TeleSession[] = Array.from({ length: 26 }, (_, i) => ({
  id: 'p' + i, user: '', dept: '', region: '', since: '', mfa: true, check: i === 3 ? 'fail' : 'ok', checkNote: '',
}))
const PREVIEW_HOSTS = ['kftc.or.kr', 'paymon.dooray.com', 'chatgpt.com', 'ra.paymon.co.kr', 'office.com', 'kcredit.or.kr', 'anydesk.com', 'nicevan.co.kr', 'ra.paymon.co.kr', 'chatgpt.com']

function usePreview(): MapData {
  const [hit, setHit] = useState({ id: 0, hosts: [] as string[] })
  const k = useRef(0)
  useEffect(() => {
    const t = setInterval(() => {
      const hosts = [PREVIEW_HOSTS[k.current % PREVIEW_HOSTS.length], PREVIEW_HOSTS[(k.current + 3) % PREVIEW_HOSTS.length]]
      k.current++
      setHit(h => ({ id: h.id + 1, hosts }))
    }, 1700)
    return () => clearInterval(t)
  }, [])
  return useMemo(() => ({ ledger: INITIAL_LEDGER, rogues: PREVIEW_ROGUES, tele: PREVIEW_TELE, hit, live: true, scanned: true, lastScan: '09:41' }), [hit])
}

export function LandingPage() {
  const login = useStore(s => s.login)
  const nav = useNavigate()
  const data = usePreview()
  const enter = () => { login(); nav('/map') }
  return (
    <div className="min-h-dvh bg-background" style={{ background: 'radial-gradient(ellipse 80% 55% at 50% -12%, #e8eefb 0%, rgba(247,248,250,0) 60%), var(--background)' }}>
      <header className="mx-auto flex h-16 max-w-[1200px] items-center px-6">
        <span className="flex items-center gap-2 text-[16px] font-semibold tracking-tight text-ink"><Mark className="size-6" />살피<span className="ml-1.5 font-mono text-[9px] font-medium tracking-[.3em] text-dim">SALPI</span></span>
        <span className="ml-auto flex items-center gap-2">
          <button onClick={() => nav('/login')} className="h-9 rounded-full px-4 text-[13.5px] font-medium text-body transition hover:bg-[rgba(19,23,34,.05)]">로그인</button>
          <button onClick={enter} className="h-9 rounded-full bg-ink px-4 text-[13.5px] font-medium text-white transition hover:bg-ink/90">데모 열기</button>
        </span>
      </header>

      <section className="mx-auto max-w-[1200px] px-6 pt-12 text-center">
        <div className="inline-flex h-7 items-center gap-2 rounded-full bg-card px-3.5 text-[12px] font-medium text-faint shadow-[var(--shadow-ring)]"><i className="size-1.5 rounded-full bg-primary" />전자금융감독규정 시행세칙 제2조의3</div>
        <h1 className="mx-auto mt-6 max-w-[860px] text-[54px] font-semibold leading-[1.12] tracking-[-0.032em] text-ink">
          승인 없이 경계를 넘는 연결,<br /><span>지도에 <span className="text-[#c4302b]">빨갛게</span> 뜹니다</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[600px] text-[17px] leading-[1.65] text-faint">
          망분리 예외가 늘어날수록 구멍도 늘어납니다. 살피는 방화벽 로그를
          승인 대장과 실시간 대조하고, 정체 모를 목적지는 사내 AI가 분류합니다.
        </p>
        <div className="mt-8 flex items-center justify-center">
          <button onClick={enter} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ink px-6 text-[15px] font-medium text-white transition hover:bg-ink/90">
            데모 열기<IconArrowRight className="size-4" stroke={2} />
          </button>
        </div>
      </section>

      {/* 제품 실물: 경계 지도가 실제로 돈다 */}
      <section className="mx-auto mt-11 max-w-[1200px] px-6">
        <div className="overflow-hidden rounded-[16px] bg-card shadow-[var(--shadow-float)]">
          <div className="flex items-center gap-2 border-b border-[rgba(19,23,34,.06)] px-4 py-2.5">
            <span className="flex gap-1.5"><i className="size-2.5 rounded-full bg-[#e3e6ea]" /><i className="size-2.5 rounded-full bg-[#e3e6ea]" /><i className="size-2.5 rounded-full bg-[#e3e6ea]" /></span>
            <span className="mx-auto flex h-6 items-center rounded-md bg-muted px-8 font-mono text-[11px] text-dim">salpi.pages.dev/map</span>
            <span className="w-12" />
          </div>
          <BoundaryMap data={data} compact />
          <div className="flex items-center gap-4 border-t border-[rgba(19,23,34,.06)] px-5 py-2.5 text-[12px] text-faint">
            <span className="flex items-center gap-2 font-medium text-ink"><i className="size-[7px] rounded-full bg-ok breathe" />관측 중</span>
            <span>방화벽 로그가 들어올 때마다 점 하나가 선을 따라 흐릅니다</span>
            <span className="ml-auto font-mono text-[11px] text-dim">합성 데이터</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="grid grid-cols-3">
          {[
            { t: '로그 대조', d: '방화벽 로그의 목적지를 승인 대장과 비교합니다. 집합 연산이라 같은 입력이면 언제나 같은 결과가 나오고, 장부에 없는 연결만 남습니다.' },
            { t: '내용 검사', d: 'SaaS로 나가는 문서에서 고유식별정보와 신용정보의 결합을 찾습니다. 내부에서 도는 소형 AI가 후보를 내고, 결정적 규칙이 위반을 확정합니다.' },
            { t: '반기 보고', d: '제2조의3 제4항 자체평가 초안을 장부와 검사 기록에서 바로 만듭니다. 예외 운영 현황, 조치 내역, 서명란까지 인쇄 그대로.' },
          ].map((f, i) => (
            <div key={f.t} className={i > 0 ? 'border-l border-[rgba(19,23,34,.08)] pl-10' : 'pr-10'}>
              <div className="mb-2.5 font-mono text-[11.5px] font-medium text-dim">0{i + 1}</div>
              <h3 className="text-[17px] font-semibold text-ink">{f.t}</h3>
              <p className="mt-2 text-[14px] leading-[1.7] text-faint">{f.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 flex items-center justify-center gap-3 text-[12px] text-dim">
          <span className="inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-body shadow-[var(--shadow-ring)]"><i className="size-1.5 rounded-full bg-primary" /><span className="font-mono">Kanana 2 3B</span> 로컬 추론</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-body shadow-[var(--shadow-ring)]"><i className="size-1.5 rounded-full bg-primary" />규칙과 AI의 3층 탐지</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-body shadow-[var(--shadow-ring)]"><i className="size-1.5 rounded-full bg-primary" />합성 데이터 데모</span>
        </div>
      </section>

      <footer className="border-t border-[rgba(19,23,34,.06)]">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center px-6 text-[12px] text-dim">
          <span className="flex items-center gap-1.5"><Mark className="size-4" />살피</span>
          <span className="ml-auto">합성 데이터 기반 데모. 법적 판단을 대행하지 않습니다</span>
        </div>
      </footer>
    </div>
  )
}
