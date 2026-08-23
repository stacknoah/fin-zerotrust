import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '@/store'
import { Engine } from '@/lib/engineLoad'
import type { LlmEvent, ScanResult } from '@/lib/engine'
import { DET_SAMPLE } from '@/data/ledger'
import { mask } from '@/lib/format'
import { StatStrip } from '@/components/StatStrip'
import { PageHeader, Panel, Pill } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const DROP_KO: Record<string, string> = {
  span_not_in_source: '원문에 없는 근거, 폐기', identifier_not_in_span: '근거 밖 이름 지목, 폐기', combined_missing_parts: '결합 요소 불명, 폐기',
  bad_label: '형식 벗어난 판정, 폐기', empty_span: '근거 없음, 폐기', invalid_json: '형식 오류, 폐기', call_failed: '호출 실패',
}
const LABEL_KO = (l: string) => (l === 'combined' ? '결합 위반' : l === 'unique_id' ? '고유식별정보' : '식별정보')

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
  const [text, setText] = useState('')
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
      ev.accepted.forEach(a => logEvent('content', `AI 판정 창 ${ev.i}/${ev.total} 채택: ${LABEL_KO(a.label)}`))
      ev.dropped.forEach(d => logEvent('content', `AI 판정 창 ${ev.i}/${ev.total} 폐기: ${DROP_KO[d.reason] || d.reason}`))
    }
    if (ev.type === 'done') {
      setLive(l => l ? { ...l, done: { accepted: ev.accepted, dropped: ev.dropped } } : l)
      logEvent('content', `AI 판정 완료, 창 ${ev.windows}개, 채택 ${ev.accepted}건, 폐기 ${ev.dropped}건`)
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
      <StatStrip />
      <PageHeader title="내용 검사" crumb="내용 검사" />
      <Panel>
        <div className="flex flex-wrap items-center gap-3 px-5 pt-4 pb-3">
          <span className="text-[12.5px] text-body">대상 SaaS</span>
          <Select value={target} onValueChange={v => v && setTarget(v)}>
            <SelectTrigger className="h-8 w-[240px] bg-card"><SelectValue>{(() => { const c = saas.find(x => x.id === target); return c ? `${c.id} ${c.name}` : target })()}</SelectValue></SelectTrigger>
            <SelectContent>{saas.map(c => <SelectItem key={c.id} value={c.id}>{c.id} {c.name}</SelectItem>)}</SelectContent>
          </Select>
          {detReady ? (
            <span className="flex items-center gap-3 text-[13px]">
              <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" checked={detMode === 'heuristic'} onChange={() => setDetMode('heuristic')} className="accent-primary" />빠른 검사</label>
              <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" checked={detMode === 'hybrid'} onChange={() => setDetMode('hybrid')} className="accent-primary" />정밀 검사 (로컬 AI)</label>
              <span className="inline-flex items-center gap-1.5 text-xs text-ok-fg"><i className="size-1.5 rounded-full bg-ok" />모델 연결됨</span>
            </span>
          ) : <span className="inline-flex items-center gap-1.5 text-xs text-faint"><i className="size-1.5 rounded-full bg-dim" />AI 미연결, 빠른 검사</span>}
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setText(DET_SAMPLE)}>예시 회의록 넣기</Button>
        </div>
        <div className="px-5 pb-5"><Textarea value={text} onChange={e => setText(e.target.value)} placeholder="검사할 문서나 회의록을 붙여넣으세요" className="min-h-[130px] bg-card text-[13.5px] leading-7" /></div>
      </Panel>

      {live && detMode === 'hybrid' && (
        <Panel className="mt-3.5" title="AI 판정 실황" count={<Pill>Kanana-2-3B {window.SALPI_LLM_ENDPOINT ? '원격' : '로컬'}</Pill>} right={live.done ? `창 ${live.windows}개 판정 완료, 채택 ${live.done.accepted}건, 검증 폐기 ${live.done.dropped}건` : `문서를 창 ${live.windows}개로 분할`}>
          <div className="px-5"><Progress value={live.done ? 100 : Math.round((live.rows.filter(r => r.ms != null).length / Math.max(live.windows, 1)) * 100)} className="h-1" /></div>
          <div className="px-5 pt-2 pb-3">
            {live.rows.map(r => (
              <div key={r.i} className={cn('grid grid-cols-[44px_1fr_auto_44px] items-center gap-3 border-t py-2 text-[12.5px] first:border-t-0', r.ms == null && 'opacity-60')}>
                <span className="font-mono text-[11px] text-faint">{r.i}/{r.total}</span>
                <span className="truncate font-mono text-[11.5px] text-body">{r.chunk.replace(/\n/g, ' ⏎ ').slice(0, 90)}</span>
                <span className="flex gap-1.5">
                  {r.ms == null ? <span className="text-xs text-faint">판정 중</span> : <>
                    {r.accepted?.map((a, i) => <Pill key={'a' + i} tone={a.label === 'identifier' || a.label === 'identifier_only' ? 'gray' : 'bad'}>{LABEL_KO(a.label)}</Pill>)}
                    {r.dropped?.map((d, i) => <Pill key={'d' + i} tone="warn">{DROP_KO[d.reason] || d.reason}</Pill>)}
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
      {note && <div className="mt-3 rounded-md border border-[rgba(74,194,107,.4)] bg-[#dafbe1] px-4 py-2.5 text-sm text-ink">{note}</div>}
    </div>
  )
}
