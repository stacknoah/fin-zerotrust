import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store'
import { Engine } from '@/lib/engineLoad'
import type { ScanResult } from '@/lib/engine'
import { SAAS_LIST, USAGES, NATURES, AV_LABEL, DET_SAMPLE } from '@/data/ledger'
import { entriesFor, judge, HAS_CONTROL, type Entry, type Verdict } from '@/lib/judge'
import { PageHeader, Panel, Pill, PageTip } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { IconCheck, IconArrowRight } from '@tabler/icons-react'

const STEPS = ['대상 선택', '데이터 성격', '자동 수집 정보', '담당자 입력', 'AI 검사', '판정']

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <span className="inline-flex rounded-md border bg-card p-0.5">
      {options.map(([k, t]) => <button key={k} type="button" onClick={() => onChange(k)} className={cn('h-7 rounded px-2.5 text-[12.5px] transition', value === k ? 'bg-accent font-semibold text-primary' : 'text-body hover:text-ink')}>{t}</button>)}
    </span>
  )
}
function Opt({ on, t, d, onClick }: { on: boolean; t: string; d?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('relative flex w-full items-start gap-3.5 rounded-lg border px-4 py-3.5 text-left transition', on ? 'border-primary bg-accent' : 'hover:border-[#c5cfdb] hover:bg-muted/60')}>
      {on && <span className="absolute top-2.5 bottom-2.5 -left-px w-[3px] rounded-r bg-primary" />}
      <span className={cn('mt-0.5 size-4 shrink-0 rounded-full border-[1.5px] bg-card', on ? 'border-primary border-[5px]' : 'border-[#aab6c4]')} />
      <span><span className={cn('text-[14.5px] font-bold', on ? 'text-primary' : 'text-ink')}>{t}</span>{d && <div className="mt-0.5 text-[13px] text-body">{d}</div>}</span>
    </button>
  )
}
function Evi({ e, apply, checked, onCheck }: { e: Entry; apply: boolean; checked?: boolean; onCheck?: (v: boolean) => void }) {
  const has = HAS_CONTROL(e)
  return (
    <div className="border-t py-4 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-2.5"><span className="text-sm font-semibold text-ink">{e.feature}</span>
        <span className={cn('text-[11px] font-semibold whitespace-nowrap', e.control_availability === 'builtin' ? 'text-ok-fg' : e.control_availability === 'higher_tier' ? 'text-warn-fg' : e.control_availability === 'none' ? 'text-bad-fg' : 'text-faint')}>[{AV_LABEL[e.control_availability]}]</span>
        {e.confidence === 'low' && <span className="text-[11px] text-faint">[확신도 낮음: 원문 확인 필요]</span>}</div>
      <div className="mt-1.5 max-w-[68ch] text-[13.5px] text-ink">{e.control}</div>
      {e.source_quote && <div className="mt-2 max-w-[66ch] border-l-2 pl-3 text-[11.5px] leading-relaxed text-body">"{e.source_quote}"</div>}
      {e.plan_note && e.plan_note !== '-' && <div className="mt-1.5 text-[11.5px] text-warn-fg">요금제 조건: {e.plan_note}</div>}
      <div className="mt-2 font-mono text-[10.5px] break-all text-faint">출처 <a href={e.source_url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-primary">{e.source_url}</a></div>
      {apply && onCheck && (
        <label className="mt-2.5 flex max-w-[68ch] cursor-pointer items-start gap-2 text-[12.5px] text-ink">
          <Checkbox checked={!!checked} onCheckedChange={v => onCheck(!!v)} className="mt-0.5" />
          <span>{has ? '도입 시 적용. 검토서에 기록' : <>이 SaaS에는 해당 통제가 {e.control_availability === 'none' ? '없음' : '확인되지 않음'}. <b className="font-semibold">살피 검증 도구(로컬 결합 탐지) 등 보완통제를 적용</b></>}</span>
        </label>
      )}
    </div>
  )
}

export function WorkbenchPage() {
  const [step, setStep] = useState(0)
  const [saas, setSaas] = useState<string | null>(null)
  const [usage, setUsage] = useState<string | null>(null)
  const [nature, setNature] = useState<string | null>(null)
  const [l1, setL1] = useState<'yes' | 'no' | null>(null)
  const [applied, setApplied] = useState<Record<number, boolean>>({})
  const [comp, setComp] = useState<Record<number, boolean>>({})
  const [profile, setProfile] = useState<{ sector: 'bank' | 'mid' | 'fintech'; e5: 'yes' | 'no' | 'unknown' }>({ sector: 'mid', e5: 'unknown' })
  const [premise, setPremise] = useState(false)
  const ent = useMemo(() => entriesFor(saas), [saas])
  const l1e = ent.filter(e => e.layer === 'L1'), l2 = ent.filter(e => e.layer === 'L2' && e.exists !== 'no'), l3 = ent.filter(e => e.layer === 'L3' && e.exists !== 'no')
  const go = (n: number) => { setStep(n); window.scrollTo(0, 0) }
  const next = () => {
    if (step === 1 && nature === 'intent') return go(5)
    if (step === 2 && l1 === 'yes') return go(5)
    go(step + 1)
  }
  const nav = (can: boolean, label = '다음') => (
    <div className="mt-8 flex items-center justify-between">
      {step > 0 ? <Button variant="ghost" onClick={() => go(step - 1)}>이전</Button> : <span />}
      <Button disabled={!can} onClick={next} className="h-10 px-5 font-semibold">{label}<IconArrowRight className="size-4" /></Button>
    </div>
  )
  const verdict: Verdict | null = step === 5 ? judge({ nature, l1, entries: ent, applied, comp, profileE5: profile.e5 }) : null
  const restart = () => { setStep(0); setSaas(null); setUsage(null); setNature(null); setL1(null); setApplied({}); setComp({}) }

  return (
    <div className="view-in">
      <PageHeader title="SaaS 도입 판정" crumb="SaaS 도입 판정" actions={<Button onClick={() => {
        setSaas('dooray'); setUsage('doc'); setNature('id_only'); setL1('no')
        const all: Record<number, boolean> = {}; for (let i = 0; i < 12; i++) all[i] = true
        setApplied(all); setComp(all); setStep(5)
      }}>예시 판정 보기</Button>} />
      <PageTip id="workbench">새로 도입할 SaaS가 전자금융감독규정 예외 요건에 맞는지 여섯 단계로 판정하고 검토서를 생성합니다.</PageTip>
      <div className="grid grid-cols-[180px_1fr] items-start gap-6 max-md:grid-cols-1">
        <nav className="sticky top-[120px] rounded-lg border bg-card p-2.5">
          {STEPS.map((s, i) => (
            <div key={s} className={cn('flex items-center gap-2.5 rounded-md px-3 py-2 text-sm', i === step ? 'bg-accent font-semibold text-primary' : i < step ? 'text-body' : 'text-faint')}>
              <span className={cn('inline-flex size-5 items-center justify-center rounded-full border-[1.5px] font-mono text-[10px] font-semibold', i === step ? 'border-primary bg-primary text-white' : i < step ? 'border-ok-bg bg-ok-bg text-ok-fg' : 'border-[#c5cfdb] text-faint')}>{i < step ? <IconCheck className="size-3" stroke={3} /> : i + 1}</span>{s}{i === 4 && <span className="ml-auto rounded-full bg-accent px-1.5 py-px font-mono text-[9.5px] font-semibold text-primary">AI</span>}
            </div>
          ))}
        </nav>
        <main className="min-w-0 rounded-lg border bg-card px-8 py-7">
          <div className={cn('mb-6 rounded-lg border bg-muted px-4 text-[13.5px] leading-relaxed text-body', premise ? 'py-3' : 'py-2.5')}>
            <div className="flex items-center gap-2.5 font-semibold text-ink">전제 조건<span className="text-xs font-medium text-faint">전자금융감독규정 시행세칙 제2조의3 제1항 제3호</span><Button variant="ghost" size="xs" className="ml-auto text-body" onClick={() => setPremise(v => !v)}>{premise ? '접기' : '펼치기'}</Button></div>
            {premise && (
              <dl className="mt-2.5 grid grid-cols-[74px_1fr] gap-x-4 gap-y-1.5 text-[13px] leading-[21px]">
                <dt className="text-faint">전제</dt>
                <dd className="text-body">해당 SaaS가 금융보안원 CSP 안전성 평가에서 충족을 받았을 것 (별표7 제1통제)</dd>
                <dt className="text-faint">확인처</dt>
                <dd className="text-body">금융보안원 CSP 안전성 평가 통합지원시스템의 SaaS 제공자 평가 이력</dd>
                <dt className="text-faint">판정 범위</dt>
                <dd className="font-semibold text-ink">고유식별정보와 개인신용정보를 처리하지 않을 것</dd>
              </dl>
            )}
          </div>

          {step === 0 && <>
            <h2 className="mb-5 text-[21px] font-bold tracking-tight text-ink">도입 예정 SaaS</h2>
            <div className="mb-6 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5">
              {SAAS_LIST.map(s => (
                <button key={s.key} type="button" onClick={() => setSaas(s.key)} className={cn('flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition', saas === s.key ? 'border-ink ring-1 ring-ink' : 'border-[rgba(19,23,34,.1)] hover:border-[rgba(19,23,34,.25)]')}>
                  <span className={cn('flex size-[34px] shrink-0 items-center justify-center rounded-lg text-[15px] font-bold transition', saas === s.key ? 'text-white' : 'bg-[rgba(19,23,34,.06)] text-body')} style={saas === s.key ? { background: s.color } : undefined}>{s.mono}</span>
                  <span><div className="text-sm font-semibold text-ink">{s.name}</div><div className="font-mono text-[10px] tracking-wide whitespace-nowrap text-faint">{s.cat}</div></span>
                </button>
              ))}
            </div>
            <div className="mb-6 flex flex-wrap items-center gap-2.5 text-[12.5px]">
              <span className="text-[11px] text-faint">회사 프로필</span>
              <Seg value={profile.sector} options={[['bank', '은행, 금융지주'], ['mid', '저축은행, 캐피탈'], ['fintech', '핀테크, 전자금융업자']]} onChange={v => setProfile(p => ({ ...p, sector: v }))} />
              <span className="ml-1.5 text-[11px] text-faint">보안 라이선스</span>
              <Seg value={profile.e5} options={[['yes', 'E5급 보유'], ['no', '미보유'], ['unknown', '미확인']]} onChange={v => setProfile(p => ({ ...p, e5: v }))} />
            </div>
            <div className="flex flex-col gap-2">{USAGES.map(u => <Opt key={u.key} on={usage === u.key} t={u.t} d={u.d} onClick={() => setUsage(u.key)} />)}</div>
            {nav(!!saas && !!usage)}
          </>}

          {step === 1 && <>
            <div className="mb-2 text-[11.5px] font-medium text-faint">근거: 시행세칙 제2조의3 제1항 제3호, 신용정보법 제2조(결합 요건), 개인정보보호법 제24조(고유식별정보)</div>
            <h2 className="mb-1.5 text-[21px] font-bold tracking-tight text-ink">이 업무에서 SaaS에 들어갈 수 있는 고객 정보의 성격은?</h2>
            <p className="mb-6 max-w-[66ch] text-sm text-body">요건 대상은 이용자의 고유식별정보와 개인신용정보. 임직원 정보는 보수적으로 포함해 검토.</p>
            <div className="flex flex-col gap-2">{NATURES.map(n => <Opt key={n.key} on={nature === n.key} t={n.t} d={n.d} onClick={() => setNature(n.key)} />)}</div>
            {nav(!!nature)}
          </>}

          {step === 2 && <>
            <div className="mb-2 text-[11.5px] font-medium text-faint">1층 시스템 필드: SaaS가 정해진 항목으로 다루도록 설계된 데이터</div>
            <h2 className="mb-1.5 text-[21px] font-bold tracking-tight text-ink">고객 정보를 필드 단위로 관리하는 기능을 사용할 계획인가?</h2>
            <p className="mb-5 text-sm text-body">연락처 DB, CRM, 외부인 대상 폼 수집 등</p>
            {l1e.length ? l1e.map(e => <Evi key={e._i} e={e} apply={false} />) : <p className="text-sm text-body">근거 데이터 없음</p>}
            <div className="mt-6 flex flex-col gap-2"><Opt on={l1 === 'no'} t="사용하지 않음" d="용도를 해당 기능 제외 범위로 한정. 검토서에 기재" onClick={() => setL1('no')} /><Opt on={l1 === 'yes'} t="사용함" d="구조화 저장과 검색. 명백한 처리" onClick={() => setL1('yes')} /></div>
            {nav(!!l1)}
          </>}

          {(step === 3 || step === 4) && <>
            <div className="mb-2 text-[11.5px] font-medium text-faint">{step === 3 ? '2층 사용자 자유 입력. 해설서 6장: "입력 제한 데이터를 명확화하여 기준을 마련하고 데이터 입력 시 사전에 필터 적용"' : '3층 시스템 부수 생성: 검색 색인, 자동 녹취, AI 학습, 보존 사본'}</div>
            <h2 className="mb-1.5 text-[21px] font-bold tracking-tight text-ink">{step === 3 ? '자유 입력 경로의 차단 수단' : '사용자가 넣지 않아도 SaaS가 만들어내는 데이터'}</h2>
            <p className="mb-5 text-sm text-body">{step === 3 ? '문서, 채팅, 회의 본문으로 고객 정보가 들어가는 경로의 차단 수단' : '검색 색인, 자동 녹취, AI 학습, 보존 사본처럼 시스템이 스스로 만드는 복제 경로'}</p>
            {(step === 3 ? l2 : l3).length ? (step === 3 ? l2 : l3).map(e => {
              const has = HAS_CONTROL(e)
              return <Evi key={e._i} e={e} apply checked={(has ? applied : comp)[e._i]} onCheck={v => (has ? setApplied(a => ({ ...a, [e._i]: v })) : setComp(c => ({ ...c, [e._i]: v })))} />
            }) : <p className="text-sm text-body">근거 데이터 없음</p>}
            {nav(true, step === 4 ? '판정' : '다음')}
          </>}

          {step === 5 && verdict && <>
            <div className="border-t pt-5">
              <div className="mb-2 text-[11px] text-faint">판정 결과</div>
              <div className={cn('text-2xl font-extrabold tracking-tight', verdict.grade === 'ok' ? 'text-ok-fg' : verdict.grade === 'cond' ? 'text-warn-fg' : 'text-bad-fg')}>{verdict.title}</div>
              <p className="mt-2 max-w-[62ch] text-[12.5px] text-body">입력한 답변만으로 산출한 결정적 판정. 아래 내용이 검토서에 기록됨</p>
            </div>
            <div className="mt-5 divide-y border-t">
              {verdict.risks.map((r, i) => <div key={i} className="flex gap-3 py-3 text-[13.5px] leading-relaxed"><span className={cn('w-3.5 shrink-0 font-mono font-semibold', r.lv === 'r' ? 'text-bad-fg' : 'text-warn-fg')}>{r.lv === 'r' ? '×' : '!'}</span><span className="text-ink">{r.t}{r.act && <div className="mt-0.5 text-xs text-primary">조치: {r.act}</div>}</span></div>)}
              {verdict.oks.map((r, i) => <div key={'o' + i} className="flex gap-3 py-3 text-[13.5px] leading-relaxed"><span className="w-3.5 shrink-0 font-mono font-semibold text-ok-fg">○</span><span className="text-ink">{r.t}</span></div>)}
            </div>
            <Detector />
            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => go(4)}>이전</Button>
              <span className="flex gap-2"><Button variant="outline" onClick={restart}>처음부터</Button><Button onClick={() => window.print()}>검토서 생성</Button></span>
            <p className="mt-4 text-[11.5px] leading-4 text-dim">내부 검토 보조 자료입니다. 최종 판단은 정보보호위원회 의결로, 해석이 갈리는 사안은 감독당국 질의로 확정합니다.</p>
            </div>
            <Report saas={saas} usage={usage} nature={nature} l1={l1} ent={ent} applied={applied} comp={comp} v={verdict} />
          </>}
        </main>
      </div>
    </div>
  )
}

/* 운영 중 검증 데모. 같은 엔진 */
function Detector() {
  const detReady = useStore(s => s.detReady)
  const [mode, setMode] = useState<'heuristic' | 'hybrid'>('heuristic')
  const [text, setText] = useState('')
  const [res, setRes] = useState<ScanResult | null>(null)
  const seq = useRef(0)
  useEffect(() => {
    if (!text.trim()) { setRes(null); return }
    const my = ++seq.current
    const t = setTimeout(async () => { const r = await Engine.scan(text, { mode }); if (my === seq.current) setRes(r) }, 400)
    return () => clearTimeout(t)
  }, [text, mode])
  return (
    <div className="mt-9 border-t pt-5">
      <h3 className="text-[15px] font-extrabold text-ink">운영 중 검증: 결합 탐지</h3>
      <p className="mb-3 text-xs text-body">도입 후 지속 통제. 문서를 붙여넣으면 고객 정보 유입을 탐지</p>
      <div className="mb-2.5 flex flex-wrap items-center gap-3.5 text-xs text-body">
        {detReady ? <>
          <label className="flex items-center gap-1.5"><input type="radio" checked={mode === 'heuristic'} onChange={() => setMode('heuristic')} className="accent-primary" />빠른 검사</label>
          <label className="flex items-center gap-1.5"><input type="radio" checked={mode === 'hybrid'} onChange={() => setMode('hybrid')} className="accent-primary" />정밀 검사 (로컬 AI)</label>
          <span className="text-[11px] font-semibold text-ok-fg">모델 연결됨</span></> : <span className="text-[11px] text-faint">AI 미연결, 빠른 검사</span>}
        <Button size="xs" variant="outline" className="ml-auto" onClick={() => setText(DET_SAMPLE)}>예시 회의록 넣기</Button>
      </div>
      <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="문서나 회의록을 붙여넣으면 실시간으로 탐지" className="min-h-[120px] bg-card text-[13.5px] leading-7" />
      {res && <div className="mt-2.5 divide-y">
        {res.degraded && <div className="py-2 text-xs text-warn-fg">{res.degraded}</div>}
        {res.hits.length ? res.hits.map((h, i) => <div key={i} className="flex items-baseline gap-3 py-2.5 text-[12.5px]"><span className={cn('font-mono text-[9.5px] font-semibold whitespace-nowrap', h.severity === 'violation' ? 'text-bad-fg' : h.label === 'identifier_only' ? 'text-faint' : 'text-warn-fg')}>[{h.tag}]</span><code className="rounded bg-muted px-1.5 font-mono text-[11.5px]">{h.span}</code><span className="text-body">{h.note}</span></div>) : <div className="py-2.5 text-xs text-faint">탐지된 항목 없음</div>}
        {res.rejected && res.rejected.length > 0 && <div className="py-2 text-xs text-faint">근거 검증 실패로 폐기된 모델 출력 {res.rejected.length}건 (환각 차단)</div>}
      </div>}
    </div>
  )
}

function Report({ saas, usage, nature, l1, ent, applied, comp, v }: { saas: string | null; usage: string | null; nature: string | null; l1: string | null; ent: Entry[]; applied: Record<number, boolean>; comp: Record<number, boolean>; v: Verdict }) {
  const s = SAAS_LIST.find(x => x.key === saas), u = USAGES.find(x => x.key === usage), n = NATURES.find(x => x.key === nature)
  const today = new Date(), dstr = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`
  const ctrls = ent.filter(e => (e.layer === 'L2' || e.layer === 'L3') && e.exists !== 'no')
  const Th = ({ children, w }: { children: React.ReactNode; w?: string }) => <th className="border border-[#bbb] bg-[#f2f2ef] px-2 py-1.5 text-left text-[9.5pt] font-bold" style={{ width: w }}>{children}</th>
  const Td = ({ children, cls }: { children?: React.ReactNode; cls?: string }) => <td className={cn('border border-[#bbb] px-2 py-1.5 align-top text-[9.5pt]', cls)}>{children}</td>
  return (
    <div className="print-area hidden print:block font-[Apple_SD_Gothic_Neo,Pretendard,sans-serif] text-[10.5pt] leading-[1.65] text-[#111]">
      <h1 className="border-b-2 border-[#111] pb-2 text-[16pt] font-bold">내부업무망 SaaS 망분리 예외요건 검토서 <span className="text-[9pt] font-normal text-[#777]">(데모 문서번호 DEMO-{today.getFullYear()}-001)</span></h1>
      <table className="mt-3 w-full border-collapse"><tbody>
        <tr><Th w="18%">검토 대상</Th><Td>{s?.name}</Td><Th w="18%">사용 업무</Th><Td>{u?.t}</Td></tr>
        <tr><Th>검토 일자</Th><Td>{dstr}</Td><Th>판정 결과</Th><Td><b>{v.title}</b></Td></tr>
      </tbody></table>
      <h2 className="mt-4 mb-1.5 text-[12pt] font-bold">1. 검토 근거 조문</h2>
      <div className="my-2 border-l-[3px] border-[#111] px-3 py-1.5 text-[9.5pt] text-[#222]">전자금융감독규정 시행세칙 제2조의3 제1항 제3호: "이용자의 고유식별정보 또는 개인신용정보를 처리하지 않는 「클라우드컴퓨팅 발전 및 이용자 보호에 관한 법률 시행령」 제3조제2호에 따른 '응용프로그램 등 소프트웨어를 제공하는 서비스' 이용 목적의 경우" (2026. 4. 20. 신설)</div>
      <div className="my-2 border-l-[3px] border-[#111] px-3 py-1.5 text-[9.5pt] text-[#222]">동 세칙 제2조의3 제4항: 별표 7 망분리 대체 정보보호통제의 이행 여부를 반기에 1회 평가하고 정보보호위원회에 보고할 것</div>
      <h2 className="mt-4 mb-1.5 text-[12pt] font-bold">2. 전제 조건 확인</h2>
      <table className="w-full border-collapse"><tbody><tr><Th w="70%">항목</Th><Th>확인</Th></tr>
        <tr><Td>침해사고대응기관(금융보안원) CSP 안전성 평가 '충족'. SaaS 제공자 평가 이력 대조</Td><Td>☐ 확인 필요</Td></tr>
        <tr><Td>자체 위험성 평가 실시 및 정보보호위원회 승인 (제2조의3 제3항)</Td><Td>☐ 별도 진행</Td></tr></tbody></table>
      <h2 className="mt-4 mb-1.5 text-[12pt] font-bold">3. 유입 데이터 성격 판단</h2>
      <p>선택된 판단: <b>{n?.t}</b>. {n?.d}</p>
      <p className="text-[9pt] text-[#555]">참고: 조문은 "이용자의" 고유식별정보와 개인신용정보로 한정하나, 금융보안원 해설서는 한정어 없이 기재하고 가명정보를 포함한다(조문과 해설의 문언 불일치). 보수적 관점에서 임직원 고유식별정보와 가명정보도 입력 제한 기준에 포함할 것을 권고한다.</p>
      <h2 className="mt-4 mb-1.5 text-[12pt] font-bold">4. 층위별 통제 확인</h2>
      <p>1층(시스템 필드): 고객정보 필드형 기능 {l1 === 'yes' ? <b>사용. 요건 저촉</b> : '미사용. 용도를 해당 기능 제외 범위로 한정'}</p>
      <table className="w-full border-collapse"><tbody><tr><Th>층위</Th><Th>접점</Th><Th>통제 수단 (제공 형태)</Th><Th>적용 상태</Th><Th>근거 출처</Th></tr>
        {ctrls.map(e => <tr key={e._i}><Td>{e.layer === 'L2' ? '2층 자유 입력' : '3층 부수 생성'}</Td><Td>{e.feature}</Td><Td>{e.control} <span className="text-[#777]">({AV_LABEL[e.control_availability]}{e.plan_note && e.plan_note !== '-' ? ', ' + e.plan_note : ''})</span></Td><Td>{applied[e._i] ? '적용 예정' : comp[e._i] ? '보완통제 수립 예정' : '미적용'}</Td><Td cls="text-[8pt]">{e.source_url}</Td></tr>)}
      </tbody></table>
      <h2 className="mt-4 mb-1.5 text-[12pt] font-bold">5. 판정 결과 및 미해소 위험</h2>
      {v.risks.map((r, i) => <p key={i}>- {r.t}{r.act && <><br /><span className="text-[#2b55a3]">조치: {r.act}</span></>}</p>)}
      {v.oks.map((r, i) => <p key={'o' + i} className="text-[#176e4b]">- {r.t}</p>)}
      <h2 className="mt-4 mb-1.5 text-[12pt] font-bold">6. 후속 조치</h2>
      <p>- 본 검토서를 도입 품의에 첨부하고, 미해소 위험 항목은 반기 자체평가(제2조의3 제4항)의 점검 항목으로 이관한다.</p>
      <p>- 해설서 6장에 따라 입력 제한 데이터 기준을 내규로 명확화하고, SaaS 이용 로그를 주기적으로 점검한다.</p>
      <div className="mt-8 flex justify-end gap-10 text-center text-[9.5pt]"><div><div className="h-10 w-[150px] border-b border-[#333]" />검토자</div><div><div className="h-10 w-[150px] border-b border-[#333]" />정보보호최고책임자(CISO)</div></div>
      <div className="mt-5 border-t border-[#bbb] pt-2 text-[8.5pt] text-[#666]">초안. 근거 데이터는 2026년 8월 벤더 공개 문서 기준이며 변경될 수 있다. 법적 판단을 대행하지 않으며 최종 판단과 책임은 검토자와 소속 기관에 있다.</div>
    </div>
  )
}
