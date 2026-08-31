import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { Mark } from '@/features/layout/Shell'
import { IconArrowRight } from '@tabler/icons-react'

export function LandingPage() {
  const login = useStore(s => s.login)
  const nav = useNavigate()
  const enter = () => { try { sessionStorage.removeItem('salpi_intro') } catch { void 0 } login(); nav('/map') }
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
        <div className="inline-flex h-7 items-center gap-2 rounded-full bg-card px-3.5 text-[12px] font-medium text-faint shadow-[var(--shadow-ring)]"><i className="size-1.5 rounded-full bg-primary" />정보보호 담당자를 위한 금융 망분리 관제 콘솔</div>
        <h1 className="mx-auto mt-6 max-w-[860px] text-[54px] font-semibold leading-[1.12] tracking-[-0.032em] text-ink">
          망을 넘는 모든 연결을 관측하고,<br /><span><span className="text-[#c4302b]">미승인 연결</span>은 증적으로 남깁니다</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[600px] text-[17px] leading-[1.65] text-faint">
          미승인 연결 발견에서 끝나는 도구와 다릅니다.<br />판정부터 등재, 차단 요청, 반기 보고서까지 한 파이프라인으로 관리합니다.
        </p>
        <div className="mt-8 flex items-center justify-center">
          <button onClick={enter} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ink px-6 text-[15px] font-medium text-white transition hover:bg-ink/90">
            데모 열기<IconArrowRight className="size-4" stroke={2} />
          </button>
        </div>
      </section>

      {/* 로컬 AI: 무엇을 하고 왜 사내에서 도는지 */}
      <section className="mx-auto mt-20 grid max-w-[1200px] items-center gap-10 px-6 lg:grid-cols-[5fr_6fr] lg:gap-14">
        <div>
          <h2 className="text-[34px] font-semibold leading-[1.2] tracking-[-0.02em] text-ink">한 바이트도<br />반출되지 않습니다</h2>
          <p className="mt-4 text-[15px] leading-[1.7] text-faint">
            로그도 문서도 망 안에 머뭅니다.<br />추론은 사내에서 도는 국산 3B 모델 <span className="font-mono text-body">Kanana</span>가 맡습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {['목적지 분류', '위험 서술', '신용정보 결합 탐지'].map(t => (
              <span key={t} className="inline-flex h-7 items-center rounded-full bg-[rgba(19,23,34,.05)] px-3 text-[12.5px] font-medium text-body">{t}</span>
            ))}
          </div>
          <div className="mt-7 flex items-baseline gap-2.5">
            <span className="font-mono text-[44px] font-semibold leading-none tracking-tight text-primary nums">98.1%</span>
            <span className="text-[14px] text-body">판정 정밀도</span>
            <span className="text-[12.5px] text-dim">채택된 판정이 실제 위반인 비율</span>
          </div>
          <div className="mt-4 space-y-1.5">
            {[['규칙만', 52.3, false], ['규칙+AI', 95.9, true]].map(([l, v, ai]) => (
              <div key={String(l)} className="flex items-center gap-2.5">
                <span className="w-[54px] shrink-0 text-[11px] text-faint">{String(l)}</span>
                <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[rgba(19,23,34,.07)]">
                  <div className={ai ? 'h-full rounded-full bg-primary' : 'h-full rounded-full bg-[rgba(19,23,34,.28)]'} style={{ width: v + '%' }} />
                </div>
                <span className={ai ? 'w-[46px] shrink-0 text-right font-mono text-[11px] font-semibold text-ink nums' : 'w-[46px] shrink-0 text-right font-mono text-[11px] text-faint nums'}>{v}%</span>
              </div>
            ))}
            <div className="pt-0.5 text-[11.5px] text-dim">결합 위반 재현율. AI를 더하면 같은 문서에서 위반을 1.8배 잡습니다</div>
          </div>
          <p className="mt-4 text-[12px] leading-5 text-dim">AI는 후보만 내고 확정은 검증 규칙이 합니다. 평가셋(문서 200건)과 채점 코드는 <a className="underline underline-offset-2" href="https://github.com/stacknoah/fin-zerotrust/tree/main/eval" target="_blank" rel="noreferrer">저장소 eval</a>에 공개.</p>
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
        <div className="mx-auto mb-8 max-w-[640px] text-center">
          <h2 className="text-[30px] font-semibold leading-[1.2] tracking-[-0.02em] text-ink">보안 장비가 있어도 남는 일</h2>
          <p className="mt-3 text-[15px] leading-[1.7] text-faint">기존 장비는 연결을 막거나 문서를 검사합니다.<br />규제가 요구하는 판정과 대장, 보고는 여전히 사람 몫입니다.</p>
        </div>
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

      <footer className="border-t border-[rgba(19,23,34,.06)]">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center px-6 text-[12px] text-dim">
          <span className="flex items-center gap-1.5"><Mark className="size-4" />살피</span>
        </div>
      </footer>
    </div>
  )
}
