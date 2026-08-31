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
          망을 넘는 모든 연결을 관측하고,<br /><span><span className="text-[#c4302b]">미승인 연결</span>은 증적으로 남깁니다</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[600px] text-[17px] leading-[1.65] text-faint">
          발견에서 끝나는 도구와 다릅니다.<br />발견한 연결을 제2조의3 요건으로 판정해 등재와 차단 요청, 반기 보고까지 잇습니다.
        </p>
        <div className="mt-8 flex items-center justify-center">
          <button onClick={enter} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ink px-6 text-[15px] font-medium text-white transition hover:bg-ink/90">
            데모 열기<IconArrowRight className="size-4" stroke={2} />
          </button>
        </div>
        <p className="mt-4 text-[13px] text-dim">정보보호 담당자를 위한 금융 망분리 관제 콘솔. 판정 보조는 망 안에서 도는 로컬 AI, Kanana가 맡습니다</p>
      </section>

      {/* 로컬 AI: 무엇을 하고 왜 사내에서 도는지 */}
      <section className="mx-auto mt-20 grid max-w-[1200px] grid-cols-[5fr_6fr] items-center gap-14 px-6">
        <div>
          <h2 className="text-[34px] font-semibold leading-[1.2] tracking-[-0.02em] text-ink">추론은 망 안에서 끝납니다</h2>
          <p className="mt-4 text-[15px] leading-[1.7] text-faint">
            망분리 환경에서는 로그와 문서를 외부 AI API로 보낼 수 없습니다.
            그래서 추론은 사내에서 도는 소형 모델 <span className="font-mono text-body">Kanana</span>가 맡습니다.
          </p>
          <p className="mt-2 text-[13.5px] leading-[1.7] text-dim">
            카카오가 공개한 국산 3B 모델. 양자화하면 2.2GB라 업무망 서버는 물론 단말에도 올릴 수 있습니다.
          </p>
          <ul className="mt-6">
            {[
              ['목적지 분류', '처음 보는 도메인이 무슨 서비스인지 분류합니다'],
              ['위험 서술', '왜 위험한지 한 문장으로 설명합니다'],
              ['결합 탐지', '이름과 신용정보가 한 문맥에 묶인 구간을 지목합니다'],
            ].map(([t, d]) => (
              <li key={t} className="flex items-baseline gap-3 border-t border-[rgba(19,23,34,.07)] py-3 text-[14px] first:border-t-0">
                <b className="w-[86px] shrink-0 font-semibold text-ink">{t}</b><span className="text-faint">{d}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-dim">AI는 후보를 낼 뿐 위반 확정은 검증 규칙이 하고, 확신이 없으면 미분류로 남겨 사람에게 넘깁니다</p>
          <div className="mt-4 rounded-xl bg-[rgba(19,23,34,.035)] p-4 text-[13px] leading-6 text-body">
            <div>결합 탐지: 합성 평가셋(문서 200건, 위반 591건) 재현율 <span className="font-mono font-semibold nums">88.7%</span>, 정밀도 <span className="font-mono font-semibold nums">97.6%</span></div>
            <div className="mt-2 mb-2.5 space-y-1.5">
              {[['규칙만', 52.3, false], [' 규칙+AI', 88.7, true]].map(([l, v, ai]) => (
                <div key={String(l)} className="flex items-center gap-2.5">
                  <span className="w-[54px] shrink-0 text-[11px] text-faint">{String(l).trim()}</span>
                  <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[rgba(19,23,34,.07)]">
                    <div className={ai ? 'h-full rounded-full bg-primary' : 'h-full rounded-full bg-[rgba(19,23,34,.28)]'} style={{ width: v + '%' }} />
                  </div>
                  <span className={ai ? 'w-[46px] shrink-0 text-right font-mono text-[11px] font-semibold text-ink nums' : 'w-[46px] shrink-0 text-right font-mono text-[11px] text-faint nums'}>{v}%</span>
                </div>
              ))}
            </div>
            <div>처음 보는 도메인 분류: 정적 카테고리 목록 <span className="font-mono font-semibold nums">0%</span>, Kanana <span className="font-mono font-semibold nums">81.8%</span> (무명 22종)</div>
            <div>4배 큰 Mi:dm 11.5B와 F1 동률(<span className="font-mono font-semibold nums">93.8</span>), 속도는 2.7배</div>
            <div className="mt-1 text-[12px] text-dim">평가셋 생성 규칙과 채점 코드는 <a className="underline underline-offset-2" href="https://github.com/stacknoah/fin-zerotrust/tree/main/eval" target="_blank" rel="noreferrer">저장소 eval</a>에 공개</div>
          </div>
        </div>
        <div className="surface-float overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 pt-4 pb-3">
            <span className="text-[14px] font-semibold text-ink">AI 판정 실황</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-0.5 font-mono text-[10.5px] text-body shadow-[var(--shadow-ring)]"><i className="size-1.5 rounded-full bg-ok" />Kanana 2 3B, 로컬 추론</span>
            <span className="ml-auto text-[12px] text-faint">실측 기록 재생, 구간 3개, 결합 위반 2건 확정</span>
          </div>
          <div className="h-[3px] bg-primary/90" />
          <div className="px-5 pt-1 pb-2">
            {[
              ['1/3', '박지현 고객 주택담보대출 연체 3개월 경과 건. 연락처 010-4821-7733.', '결합 위반', 'bad', '1.2s'],
              ['2/3', '정해나 고객 재방문 상담 진행. 해당 고객은 신용대출 상환 지연 이력이', '지시어 결합 위반', 'bad', '0.9s'],
              ['3/3', '해당 고객은 신용대출 상환 지연 이력이 있음. 사내 워크숍 일정 공유.', '이상 없음', 'gray', '0.6s'],
            ].map(([i, chunk, verdict, tone, ms]) => (
              <div key={i} className="grid grid-cols-[30px_1fr_auto_36px] items-center gap-3 border-t border-[rgba(19,23,34,.06)] py-2.5 first:border-t-0">
                <span className="font-mono text-[11px] text-dim nums">{i}</span>
                <span className="truncate font-mono text-[11.5px] text-body">{chunk}</span>
                {tone === 'bad'
                  ? <span className="inline-flex h-[22px] items-center rounded-full bg-bad-bg px-2.5 text-[11.5px] font-medium whitespace-nowrap text-bad-fg">{verdict}</span>
                  : <span className="inline-flex h-[22px] items-center rounded-full border border-[rgba(19,23,34,.16)] px-2.5 text-[11.5px] font-medium whitespace-nowrap text-faint">{verdict}</span>}
                <span className="text-right font-mono text-[11px] text-dim nums">{ms}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[rgba(19,23,34,.06)] px-5 py-4">
            <div className="mb-1.5 text-[11.5px] font-medium text-faint">원문 판정</div>
            <p className="text-[13.5px] leading-[24px] text-ink">
              1. <mark className="rounded-[2px]" style={{ background: 'linear-gradient(transparent 45%, #ffd9d6 45%)', color: 'inherit' }}>박지현 고객 주택담보대출 연체 3개월 경과 건. 연락처 010-4821-7733.</mark><br />
              <span className="text-dim">2. 신규 상품 한도 정책은 다음 회의에서 확정.</span><br />
              3. <mark className="rounded-[2px]" style={{ background: 'linear-gradient(transparent 45%, #ffd9d6 45%)', color: 'inherit' }}>정해나 고객 재방문 상담 진행.</mark> <span className="text-faint">지시어로 이어진 다음 줄의 연체 이력과 결합</span>
            </p>
          </div>
        </div>
      </section>

      {/* 기존 도구와의 경계 */}
      <section className="mx-auto mt-24 max-w-[1200px] px-6">
        <div className="surface overflow-hidden">
          <div className="grid grid-cols-[1fr_repeat(3,130px)] border-b border-[rgba(19,23,34,.07)] px-6 py-3 text-[12px] font-medium text-faint">
            <span /><span className="text-center">SWG, CASB</span><span className="text-center">DLP</span><span className="text-center text-ink">살피</span>
          </div>
          {[
            ['미승인 목적지 발견', '있음', '없음'],
            ['문서 속 민감정보 탐지', '없음', '있음'],
            ['신용정보법 제2조의 결합 법리 판정', '없음', '없음'],
            ['제2조의3 요건 판정과 승인 대장', '없음', '없음'],
            ['반기 자체평가 보고서 생성', '없음', '없음'],
          ].map(([t, a, d]) => (
            <div key={String(t)} className="grid grid-cols-[1fr_repeat(3,130px)] items-center border-b border-[rgba(19,23,34,.05)] px-6 py-2.5 text-[13.5px] last:border-b-0">
              <span className="text-ink">{t}</span>
              <span className={a === '있음' ? 'text-center text-body' : 'text-center text-dim'}>{a}</span>
              <span className={d === '없음' ? 'text-center text-dim' : 'text-center text-body'}>{d}</span>
              <span className="text-center font-medium text-primary">있음</span>
            </div>
          ))}
        </div>
      </section>

      {/* 제품 실물: 경계 지도가 실제로 돈다 */}
      <section className="mx-auto mt-24 max-w-[1200px] px-6 pb-24">
        <div className="overflow-hidden rounded-[16px] bg-card shadow-[var(--shadow-float)]">
          <div className="flex items-center gap-2 border-b border-[rgba(19,23,34,.06)] px-4 py-2.5">
            <span className="flex gap-1.5"><i className="size-2.5 rounded-full bg-[#e3e6ea]" /><i className="size-2.5 rounded-full bg-[#e3e6ea]" /><i className="size-2.5 rounded-full bg-[#e3e6ea]" /></span>
            <span className="mx-auto flex h-6 items-center rounded-md bg-muted px-8 font-mono text-[11px] text-dim">salpi.pages.dev/map</span>
            <span className="w-12" />
          </div>
          <BoundaryMap data={data} compact />
          <div className="flex items-center gap-4 border-t border-[rgba(19,23,34,.06)] px-5 py-2.5 text-[12px] text-faint">
            <span className="flex items-center gap-2 font-medium text-ink"><i className="size-[7px] rounded-full bg-ok breathe" />관측 중</span>
            <span className="ml-auto font-mono text-[11px] text-dim">합성 데이터</span>
          </div>
        </div>
      </section>



      <footer className="border-t border-[rgba(19,23,34,.06)]">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center px-6 text-[12px] text-dim">
          <span className="flex items-center gap-1.5"><Mark className="size-4" />살피</span>
        </div>
      </footer>
    </div>
  )
}
