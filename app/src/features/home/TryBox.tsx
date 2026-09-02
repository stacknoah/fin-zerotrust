import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { Engine } from '@/lib/engineLoad'
import type { ScanResult } from '@/lib/engine'
import { remedy, type Remedy } from '@/lib/remedy'
import { Pill } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { IconSparkles, IconArrowRight } from '@tabler/icons-react'

const EXAMPLES = ['김철수 대리 카드값 3개월 밀림', '박지현 고객 주택담보대출 연체, 연락처 010-4821-7733', '정해나 고객 재방문 상담 진행', '사내 워크숍 일정 공유']

/* 문자열 위에 구간을 밑칠. 같은 구간이 여러 번 나오면 전부 */
export function Hi({ text, spans, tone, className }: { text: string; spans: string[]; tone: 'bad' | 'ok'; className?: string }) {
  const bg = tone === 'bad' ? 'linear-gradient(transparent 45%, #ffd9d6 45%)' : 'linear-gradient(transparent 45%, #cdeed6 45%)'
  const parts = spans.map(s => s.trim()).filter(Boolean).sort((a, b) => b.length - a.length)
  const out: ReactNode[] = []
  let cur = 0, k = 0
  while (cur < text.length) {
    let best: { i: number; s: string } | null = null
    for (const s of parts) { const i = text.indexOf(s, cur); if (i >= 0 && (!best || i < best.i)) best = { i, s } }
    if (!best) break
    if (best.i > cur) out.push(text.slice(cur, best.i))
    out.push(<mark key={k++} className="rounded-[2px]" style={{ background: bg, color: 'inherit' }}>{best.s}</mark>)
    cur = best.i + best.s.length
  }
  out.push(text.slice(cur))
  return <div className={cn('whitespace-pre-wrap', className)}>{out}</div>
}

interface Out { q: string; res: ScanResult; fix: Remedy | null; recheck: number; ms: number }

/* 관제 화면의 체험 상자. 문장 하나를 넣으면 잡고, 고치고, 다시 검사한다 */
export function TryBox() {
  const detReady = useStore(s => s.detReady)
  const detMode = useStore(s => s.detMode)
  const logEvent = useStore(s => s.logEvent)
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [out, setOut] = useState<Out | null>(null)
  const seq = useRef(0)

  const run = async (t: string) => {
    const s = t.trim(); if (!s) return
    const my = ++seq.current
    setQ(s); setBusy(true)
    const t0 = performance.now()
    const res = await Engine.scan(s, { mode: detMode })
    if (my !== seq.current) return
    const viol = res.hits.filter(h => h.severity === 'violation')
    let fix: Remedy | null = null, recheck = 0
    if (viol.length) {
      fix = remedy(s, res.hits)
      const r2 = await Engine.scan(fix.text, { mode: detMode })
      if (my !== seq.current) return
      recheck = r2.hits.filter(h => h.severity === 'violation').length
    }
    setBusy(false)
    setOut({ q: s, res, fix, recheck, ms: performance.now() - t0 })
    logEvent('content', viol.length ? `체험 검사: "${s.slice(0, 24)}" 위반 ${viol.length}건, 교정본 재검사 위반 ${recheck}건` : `체험 검사: "${s.slice(0, 24)}" 위반 없음`)
  }

  const viol = out ? out.res.hits.filter(h => h.severity === 'violation') : []
  const idOnly = out ? out.res.hits.some(h => h.label === 'identifier_only') : false
  return (
    <section className="mt-4 overflow-hidden rounded-[14px] bg-[#f7faff] shadow-[0_0_0_1px_rgba(33,87,209,.14),var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 pt-4 pb-2.5">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-ink"><IconSparkles className="size-4 text-primary" stroke={1.75} />AI에게 직접 시켜보기</span>
        <span className="text-[12.5px] text-faint">SaaS로 반출되는 문서에서 개인신용정보를 탐지해 수정안을 제안합니다</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-0.5 font-mono text-[10.5px] text-body shadow-[var(--shadow-ring)]"><i className={cn('size-1.5 rounded-full', detReady ? 'bg-ok' : 'bg-dim')} />{detReady ? 'Kanana 2 3B' : '규칙 검사'}</span>
      </div>
      <form className="flex gap-2 px-5" onSubmit={e => { e.preventDefault(); run(q) }}>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="예: 김철수 대리 카드값 3개월 밀림" className="h-10 bg-card px-3.5 text-[14px] md:text-[14px]" />
        <Button type="submit" disabled={busy || !q.trim()} className="h-10 shrink-0 px-5">{busy ? '판정 중' : '검사'}</Button>
      </form>
      <div className="flex flex-wrap gap-1.5 px-5 pt-2.5 pb-4">
        {EXAMPLES.map(x => <button key={x} type="button" onClick={() => run(x)} className="rounded-full bg-card px-3 py-1 text-[12px] text-body shadow-[var(--shadow-ring)] transition hover:text-ink">{x}</button>)}
      </div>
      {out && !busy && (
        <div className="detail-in border-t border-[rgba(33,87,209,.12)]">
          {out.fix ? (
            <>
              <div className="grid grid-cols-[1fr_28px_1fr] items-center gap-3 px-5 py-4">
                <div>
                  <div className="mb-1.5 flex items-center gap-2"><Pill tone="bad">위반 {viol.length}건</Pill><span className="text-[11.5px] text-faint">{viol.map(v => v.tag).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</span></div>
                  <Hi text={out.q} spans={viol.map(v => v.span)} tone="bad" className="text-[14.5px] leading-6 text-ink" />
                </div>
                <IconArrowRight className="size-5 text-primary" stroke={1.75} />
                <div>
                  <div className="mb-1.5 flex items-center gap-2">{out.recheck === 0 ? <Pill tone="ok">교정본 재검사 위반 0건</Pill> : <Pill tone="warn">재검사 위반 {out.recheck}건 남음</Pill>}<span className="text-[11.5px] text-faint">이렇게 고치면 보낼 수 있습니다</span></div>
                  <Hi text={out.fix.text} spans={out.fix.fixes.map(f => f.to)} tone="ok" className="text-[14.5px] leading-6 text-ink" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-[rgba(33,87,209,.1)] px-5 py-2.5 text-[12px]">
                {out.fix.fixes.map(f => <span key={f.from} className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-0.5 text-body shadow-[var(--shadow-ring)]"><s className="text-bad-fg">{f.from}</s><span className="text-dim">→</span><b className="font-semibold text-ink">{f.to}</b><span className="text-faint">{f.why}</span></span>)}
                {out.fix.kept.map(k => <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-0.5 text-body shadow-[var(--shadow-ring)]"><b className="font-semibold text-ink">{k}</b><span className="text-faint">유지. 이름만으로는 위반이 아님</span></span>)}
                <span className="ml-auto font-mono text-[11px] text-dim nums">{(out.ms / 1000).toFixed(1)}s</span>
                <Button size="sm" variant="outline" className="h-7 bg-card px-3 text-[12px]" onClick={() => nav('/content')}>문서 전체 검사<IconArrowRight className="size-3.5" stroke={1.75} /></Button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-[13.5px]">
              <Pill tone="ok">위반 없음</Pill>
              <span className="text-body">{idOnly ? '이름은 있지만 신용정보가 없습니다. 이름 단독은 개인신용정보가 아닙니다 (신용정보법 제2조)' : '식별정보도 신용정보도 없는 문장입니다. 그대로 보내도 됩니다'}</span>
              <span className="ml-auto font-mono text-[11px] text-dim nums">{(out.ms / 1000).toFixed(1)}s</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
