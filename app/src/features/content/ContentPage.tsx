import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '@/store'
import { Engine } from '@/lib/engineLoad'
import type { LlmEvent, ScanResult } from '@/lib/engine'
import { DET_SAMPLE } from '@/data/ledger'
import { mask } from '@/lib/format'
import { PageHeader, Panel, Pill } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const DROP_KO: Record<string, string> = {
  span_not_in_source: '원문에 없는 근거, 폐기', identifier_not_in_span: '근거 밖 이름 지목, 폐기', combined_missing_parts: '결합 요소 불명, 폐기',
  bad_label: '형식 벗어난 판정, 폐기', empty_span: '근거 없음, 폐기', invalid_json: '형식 오류, 폐기', call_failed: '호출 실패',
  credit_not_adjacent: '이름 곁에 신용정보 없음, 폐기', identifier_not_a_name: '이름 아닌 식별자, 폐기', no_unique_id_pattern: '번호 패턴 없음, 폐기',
}
const LABEL_KO = (l: string) => (l === 'combined' ? '결합 위반' : l === 'unique_id' ? '고유식별정보' : '식별정보')

/* 원문 위에 판정 구간 밑칠. 각 근거 문자열의 첫 등장 위치를 칠한다 */
function Marked({ text, hits }: { text: string; hits: ScanResult['hits'] }) {
  const marks: { a: number; b: number; sev: string }[] = []
  for (const h of hits) {
    const span = h.span?.trim(); if (!span) continue
    const i = text.indexOf(span); if (i < 0) continue
    if (marks.some(m => i < m.b && i + span.length > m.a)) continue
    marks.push({ a: i, b: i + span.length, sev: h.severity === 'violation' ? 'bad' : h.label === 'identifier_only' ? 'gray' : 'warn' })
  }
  marks.sort((x, y) => x.a - y.a)
  const out: React.ReactNode[] = []
  let cur = 0
  marks.forEach((m, i) => {
    if (m.a > cur) out.push(text.slice(cur, m.a))
    const bg = m.sev === 'bad' ? 'linear-gradient(transparent 45%, #ffd9d6 45%)' : m.sev === 'warn' ? 'linear-gradient(transparent 45%, #f8e3b9 45%)' : 'linear-gradient(transparent 45%, #e4e7ec 45%)'
    out.push(<mark key={i} style={{ background: bg, color: 'inherit' }} className="rounded-[2px]">{text.slice(m.a, m.b)}</mark>)
    cur = m.b
  })
  out.push(text.slice(cur))
  return <div className="max-w-[880px] px-5 pb-5 text-[13.5px] leading-[26px] whitespace-pre-wrap text-ink">{out}</div>
}

interface LiveRow { i: number; total: number; chunk: string; accepted?: { label: string }[]; dropped?: { reason: string }[]; ms?: number }
interface Live { windows: number; rows: LiveRow[]; done?: { accepted: number; dropped: number } }

export function ContentPage() {
  const ledger = useStore(s => s.ledger)
  const detReady = useStore(s => s.detReady)
  const detMode = useStore(s => s.detMode)
  const setDetMode = useStore(s => s.setDetMode)
  const addContentLog = useStore(s => s.addContentLog)
  const logEvent = useStore(s => s.logEvent)
  const [params] = useSearchParams()
  const saas = ledger.filter(c => c.zone === 'saas')
  const [target, setTarget] = useState(params.get('target') || saas[0]?.id || 'C-05')
  const [text, setText] = useState(DET_SAMPLE)
  const [res, setRes] = useState<ScanResult | null>(null)
  const [live, setLive] = useState<Live | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const seq = useRef(0)

  const onEvent = (ev: LlmEvent) => {
    if (ev.type === 'start') setLive({ windows: ev.windows, rows: [] })
    if (ev.type === 'window') setLive(l => l ? { ...l, rows: [...l.rows, { i: ev.i, total: ev.total, chunk: ev.chunk }] } : l)
    if (ev.type === 'result') {
      setLive(l => l ? { ...l, rows: l.rows.map(r => r.i === ev.i ? { ...r, accepted: ev.accepted, dropped: ev.dropped, ms: ev.ms } : r) } : l)
      ev.accepted.forEach(a => logEvent('content', `문서 ${ev.i}/${ev.total} 구간에서 ${LABEL_KO(a.label)} 확인`))
      ev.dropped.forEach(d => logEvent('content', `문서 ${ev.i}/${ev.total} 구간 후보: ${DROP_KO[d.reason] || d.reason}`))
    }
    if (ev.type === 'done') {
      setLive(l => l ? { ...l, done: { accepted: ev.accepted, dropped: ev.dropped } } : l)
      logEvent('content', `정밀 검사 완료: 구간 ${ev.windows}개, 채택 ${ev.accepted}건, 폐기 ${ev.dropped}건`)
    }
  }

  const run = async (t: string, mode: 'heuristic' | 'hybrid') => {
    if (!t.trim()) { setRes(null); setLive(null); setNote(''); return }
    const my = ++seq.current
    setBusy(true)
    if (mode === 'heuristic') setLive(null)
    const r = await Engine.scan(t, { mode, llm: { onEvent } })
    if (my !== seq.current) return
    setBusy(false); setRes(r)
    const viols = r.hits.filter(h => h.severity === 'violation')
    if (viols.length) {
      addContentLog(target, viols.map(v => ({ t: Date.now(), tag: v.tag, masked: mask(v.span).slice(0, 60) })))
      setNote(`위반 ${viols.length}건 기록됨, ${target}. 마스킹 저장`)
    } else setNote('')
  }
  useEffect(() => { const t = setTimeout(() => run(text, detMode), 500); return () => clearTimeout(t) }, [text, detMode]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="view-in">
      <PageHeader title="내용 검사" crumb="내용 검사" />
      <div className="grid grid-cols-[1fr_320px] gap-4">
        <Panel title="검사 대상" right={detReady ? <span className="inline-flex items-center gap-1.5 text-xs text-ok-fg"><i className="size-1.5 rounded-full bg-ok" />모델 연결됨</span> : <span className="inline-flex items-center gap-1.5 text-xs text-faint"><i className="size-1.5 rounded-full bg-dim" />AI 미연결, 빠른 검사만</span>}>
          <div className="flex flex-wrap items-center gap-3 px-5 pb-3">
            <Select value={target} onValueChange={v => v && setTarget(v)}>
              <SelectTrigger className="h-8 w-[220px] bg-card"><SelectValue>{(() => { const c = saas.find(x => x.id === target); return c ? `${c.id} ${c.name}` : target })()}</SelectValue></SelectTrigger>
              <SelectContent>{saas.map(c => <SelectItem key={c.id} value={c.id}>{c.id} {c.name}</SelectItem>)}</SelectContent>
            </Select>
            {detReady && (
              <span className="flex items-center gap-3 text-[13px]">
                <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" checked={detMode === 'hybrid'} onChange={() => setDetMode('hybrid')} className="accent-ink" />정밀 검사 (로컬 AI)</label>
                <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" checked={detMode === 'heuristic'} onChange={() => setDetMode('heuristic')} className="accent-ink" />빠른 검사</label>
              </span>
            )}
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setText(DET_SAMPLE)}>예시 회의록 넣기</Button>
          </div>
          <div className="px-5 pb-5"><Textarea value={text} onChange={e => setText(e.target.value)} placeholder="검사할 문서나 회의록을 붙여넣으세요" className="min-h-[168px] bg-card text-[13.5px] leading-7" /></div>
        </Panel>
        <Panel title="3층 탐지" right={<span className="font-mono text-[11px]">측정 기준</span>}>
          <ol className="px-5 pb-5">
            {[
              ['규칙', '주민번호 체크섬, 카드번호 검증 등 결정적 규칙. 브라우저에서 즉시'],
              ['식별정보', '이름 등 사람을 가리키는 후보를 문맥에서 탐지'],
              ['결합', '식별정보와 신용정보가 한 문맥에 묶였는지 AI가 후보를 내고 코드가 검증'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3 py-2.5 not-last:border-b not-last:border-[rgba(19,23,34,.06)]">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[rgba(19,23,34,.06)] font-mono text-[10.5px] font-semibold text-body">{i + 1}</span>
                <span className="text-[13px] leading-5 text-body"><b className="mr-1.5 font-semibold text-ink">{t}</b>{d}</span>
              </li>
            ))}
          </ol>
          <div className="mx-5 mb-4 rounded-lg bg-muted px-3.5 py-2.5 text-[12px] leading-5 text-body">
            합성 문서 200건, 위반 591건으로 측정한 결과 재현율 <b className="font-mono font-semibold nums">95.9%</b>, 정밀도 <b className="font-mono font-semibold nums">98.1%</b>.
            규칙만 쓰면 재현율 52.3%에 그친다. 검사 방해 지시문을 심은 주입 공격 문서도 평가셋에 포함. AI가 후보를 늘리고 검증 규칙이 오탐을 걷어낸 수치. 생성 규칙과 채점 코드는 저장소 eval 폴더에 공개. 측정 환경은 Apple M4 Pro, 로컬 추론. 관측은 도메인 단위로 집계해 처음 본 목적지에만 추론을 부르므로 호출량은 로그 줄 수와 무관. 같은 평가셋에서 Kanana 3B는 4배 큰 Mi:dm 11.5B와 F1 동률(93.8), 속도 2.7배.
          </div>
        </Panel>
      </div>

      {live && detMode === 'hybrid' && (
        <Panel className="mt-3.5" title="AI 판정 실황" count={<Pill>Kanana 2 3B, {window.SALPI_LLM_ENDPOINT ? '원격' : '로컬'} 추론</Pill>} right={live.done ? `구간 ${live.windows}개 판정 완료, 채택 ${live.done.accepted}건, 검증 폐기 ${live.done.dropped}건` : `문서를 ${live.windows}개 구간으로 나눠 판정 중`}>
          <div className="px-5"><Progress value={live.done ? 100 : Math.round((live.rows.filter(r => r.ms != null).length / Math.max(live.windows, 1)) * 100)} className="h-1" /></div>
          <div className="px-5 pt-2 pb-3">
            {live.rows.map(r => (
              <div key={r.i} className={cn('grid grid-cols-[44px_1fr_auto_44px] items-center gap-3 border-t py-2 text-[12.5px] first:border-t-0', r.ms == null && 'opacity-60')}>
                <span className="font-mono text-[11px] text-faint">{r.i}/{r.total}</span>
                <span className="truncate font-mono text-[11.5px] text-body">{r.chunk.replace(/\n/g, ' ⏎ ').slice(0, 90)}</span>
                <span className="flex gap-1.5">
                  {r.ms == null ? <span className="text-xs text-faint">판정 중</span> : <>
                    {r.accepted?.map((a, i) => <Pill key={'a' + i} tone={a.label === 'identifier' || a.label === 'identifier_only' ? 'gray' : 'bad'}>{LABEL_KO(a.label)}</Pill>)}
                    {r.dropped?.map((d, i) => <span key={'d' + i} className="inline-flex h-[22px] items-center rounded-full border border-[rgba(19,23,34,.16)] px-2 text-[11.5px] font-medium whitespace-nowrap text-faint">{DROP_KO[d.reason] || d.reason}</span>)}
                    {!r.accepted?.length && !r.dropped?.length && <Pill tone="ok">이상 없음</Pill>}
                  </>}
                </span>
                <span className="text-right font-mono text-[11px] text-faint">{r.ms != null ? (r.ms / 1000).toFixed(1) + 's' : ''}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {text.trim() && (
        <Panel className="mt-3.5">
          <div className="divide-y px-5 py-1">
            {busy && detMode === 'hybrid' && !res && <div className="py-3 text-[13px] text-faint">정밀 검사 중</div>}
            {res?.degraded && <div className="py-3 text-[13px] text-warn-fg">{res.degraded}</div>}
            {res && (res.hits.length ? res.hits.map((h, i) => (
              <div key={i} className="flex items-baseline gap-3 py-2.5 text-[13px]">
                <span className={cn('font-mono text-[11px] font-semibold whitespace-nowrap', h.severity === 'violation' ? 'text-bad-fg' : h.label === 'identifier_only' ? 'text-faint' : 'text-warn-fg')}>[{h.tag}]</span>
                <code className="rounded bg-muted px-2 py-0.5 font-mono text-[12px] text-ink">{h.span.slice(0, 64)}</code>
                <span className="text-body">{h.note}</span>
              </div>
            )) : <div className="py-3 text-[13px] text-faint">탐지된 항목 없음</div>)}
          </div>
        </Panel>
      )}
      {res && res.hits.length > 0 && text.trim() && (
        <Panel className="mt-3.5" title="원문 판정" right="위반 구간 밑칠">
          <Marked text={text} hits={res.hits} />
        </Panel>
      )}
      {note && <div className="mt-3 flex items-center gap-2.5 surface px-4 py-2.5 text-sm text-ink"><Pill tone="ok">기록됨</Pill>{note}</div>}
    </div>
  )
}
