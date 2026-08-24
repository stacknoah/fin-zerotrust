import { create } from 'zustand'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useStore } from '@/store'
import { KNOWN_SAAS, USAGES, NATURES, AV_LABEL, type Classification } from '@/data/ledger'
import { entriesFor, judge, HAS_CONTROL, type Entry, type Verdict } from '@/lib/judge'
import { cn } from '@/lib/utils'
import { IconCheck } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

interface Wiz {
  step: number; host: string; name: string; saasKey: string | null; entries: Entry[]
  usage: string | null; nature: string | null; l1: 'yes' | 'no' | null
  applied: Record<number, boolean>; comp: Record<number, boolean>
  fromRogue: boolean; cls: Classification | null
}
interface WizStore { w: Wiz | null; open: (p: { host?: string; name?: string; saasKey?: string; fromRogue?: boolean; cls?: Classification | null }) => void; close: () => void; patch: (p: Partial<Wiz>) => void }

export const useWizard = create<WizStore>(set => ({
  w: null,
  open: p => {
    const key = Object.entries(KNOWN_SAAS).find(([d]) => (p.host || '').endsWith(d))?.[1] || p.saasKey || null
    set({ w: { step: 0, host: p.host || '', name: p.name || p.host || '', saasKey: key, entries: entriesFor(key), usage: null, nature: null, l1: null, applied: {}, comp: {}, fromRogue: !!p.fromRogue, cls: p.cls || null } })
  },
  close: () => set({ w: null }),
  patch: p => set(s => (s.w ? { w: { ...s.w, ...p } } : {})),
}))

const STEPS = ['대상', '용도', '데이터 성격', 'L1 필드', '통제 확인', '판정']

function Opt({ on, t, d, onClick }: { on: boolean; t: string; d?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('relative flex w-full items-start gap-3.5 rounded-lg border px-4 py-3 text-left transition', on ? 'border-primary bg-accent' : 'hover:border-[#c5cfdb] hover:bg-muted/60')}>
      {on && <span className="absolute top-2.5 bottom-2.5 -left-px w-[3px] rounded-r bg-primary" />}
      <span className={cn('mt-0.5 size-4 shrink-0 rounded-full border-[1.5px] bg-card', on ? 'border-primary border-[5px]' : 'border-[#aab6c4]')} />
      <span><span className={cn('text-[14.5px] font-semibold', on ? 'text-primary' : 'text-ink')}>{t}</span>{d && <div className="text-[13px] text-body">{d}</div>}</span>
    </button>
  )
}

export function RegisterDialog() {
  const w = useWizard(s => s.w)
  const close = useWizard(s => s.close)
  const patch = useWizard(s => s.patch)
  const register = useStore(s => s.register)
  const blockFromWizard = useStore(s => s.blockFromWizard)
  if (!w) return <Dialog open={false} />
  const ctrl = w.entries.filter(e => (e.layer === 'L2' || e.layer === 'L3') && e.exists !== 'no')
  const next = (can: boolean, label = '다음') => (
    <div className="mt-5 flex justify-between">
      <Button variant="outline" size="sm" onClick={() => (w.step === 0 ? close() : patch({ step: w.step - 1 }))}>{w.step === 0 ? '취소' : '이전'}</Button>
      <Button size="sm" disabled={!can} onClick={() => patch({ step: w.step + 1 })}>{label}</Button>
    </div>
  )
  let body: React.ReactNode
  let verdict: Verdict | null = null
  if (w.step === 0) body = <>
    <p className="text-[13px] text-ink">등재 대상: <b className="font-semibold">{w.name}</b> {w.host && <span className="font-mono text-faint">({w.host})</span>}</p>
    {w.cls && <p className="text-xs text-body">로그 대조에서 발견. 분류: {w.cls.kind}</p>}
    <p className="text-xs text-body">{w.entries.length ? `통제 근거 ${w.entries.length}건` : '통제 근거 없음'}</p>
    {next(true)}
  </>
  if (w.step === 1) body = <><div className="flex flex-col gap-2">{USAGES.map(u => <Opt key={u.key} on={w.usage === u.key} t={u.t} onClick={() => patch({ usage: u.key })} />)}</div>{next(!!w.usage)}</>
  if (w.step === 2) body = <><div className="flex flex-col gap-2">{NATURES.map(n => <Opt key={n.key} on={w.nature === n.key} t={n.t} d={n.d} onClick={() => patch({ nature: n.key })} />)}</div>{next(!!w.nature)}</>
  if (w.step === 3) body = <>
    <p className="mb-3 text-[13px] text-ink">고객 정보를 필드 단위로 다루는 기능(연락처 DB, CRM, 외부 폼) 사용 여부</p>
    <div className="flex flex-col gap-2"><Opt on={w.l1 === 'no'} t="사용하지 않음" onClick={() => patch({ l1: 'no' })} /><Opt on={w.l1 === 'yes'} t="사용함" d="명백한 처리. 즉시 불가" onClick={() => patch({ l1: 'yes' })} /></div>
    {next(!!w.l1)}
  </>
  if (w.step === 4) body = <>
    {ctrl.length ? <div className="flex flex-col divide-y">{ctrl.map(e => {
      const has = HAS_CONTROL(e), checked = (has ? w.applied : w.comp)[e._i] || false
      return (
        <div key={e._i} className="py-3">
          <div className="flex flex-wrap items-baseline gap-2.5"><span className="text-sm font-semibold text-ink">{e.feature}</span><span className={cn('text-[11px] font-semibold', e.control_availability === 'builtin' ? 'text-ok-fg' : e.control_availability === 'higher_tier' ? 'text-warn-fg' : e.control_availability === 'none' ? 'text-bad-fg' : 'text-faint')}>[{AV_LABEL[e.control_availability]}]</span></div>
          <div className="mt-1 text-[13px] text-body">{e.control.slice(0, 140)}{e.control.length > 140 ? '…' : ''}</div>
          <label className="mt-2 flex cursor-pointer items-start gap-2 text-[12.5px] text-ink">
            <Checkbox checked={checked} onCheckedChange={v => patch(has ? { applied: { ...w.applied, [e._i]: !!v } } : { comp: { ...w.comp, [e._i]: !!v } })} className="mt-0.5" />
            <span>{has ? '도입 시 적용' : <>벤더 미제공. <b className="font-semibold">살피 내용검사를 보완통제로 지정</b></>}</span>
          </label>
        </div>
      )
    })}</div> : <p className="text-[13px] text-body">통제 근거 없음. 미수집 상태로 판정</p>}
    {next(true, '판정')}
  </>
  if (w.step === 5) {
    verdict = judge({ nature: w.nature, l1: w.l1, entries: w.entries, applied: w.applied, comp: w.comp })
    const v = verdict
    body = <>
      <div className={cn('text-[22px] font-semibold tracking-tight', v.grade === 'ok' ? 'text-ok-fg' : v.grade === 'cond' ? 'text-warn-fg' : 'text-bad-fg')}>{v.title}</div>
      <div className="mt-3 divide-y border-t">
        {v.risks.map((r, i) => <div key={i} className="flex gap-3 py-2.5 text-[13.5px] leading-6"><span className={cn('w-3.5 shrink-0 font-mono font-semibold', r.lv === 'r' ? 'text-bad-fg' : 'text-warn-fg')}>{r.lv === 'r' ? '×' : '!'}</span><span className="text-ink">{r.t}</span></div>)}
        {v.oks.map((r, i) => <div key={'o' + i} className="flex gap-3 py-2.5 text-[13.5px] leading-6"><span className="w-3.5 shrink-0 font-mono font-semibold text-ok-fg">○</span><span className="text-ink">{r.t}</span></div>)}
      </div>
      <div className="mt-5 flex justify-between">
        <Button variant="outline" size="sm" onClick={() => patch({ step: 4 })}>이전</Button>
        <span className="flex gap-2">
          {v.grade === 'bad' && w.fromRogue && <Button size="sm" variant="destructive" onClick={() => { blockFromWizard(w.host, w.cls?.kind || 'SaaS', v.risks[0]?.t || '적격 미충족'); close() }}>차단 확정</Button>}
          {v.grade !== 'bad' && <Button size="sm" onClick={() => { register({ name: w.name, host: w.host, saasKey: w.saasKey, fromRogue: w.fromRogue, verdict: v }); close() }}>대장에 등재 (위원회 상정)</Button>}
          {v.grade === 'bad' && !w.fromRogue && <Button size="sm" variant="outline" onClick={close}>닫기</Button>}
        </span>
      </div>
    </>
  }
  return (
    <Dialog open onOpenChange={o => { if (!o) close() }}>
      <DialogContent className="max-w-[640px] p-6">
        <DialogTitle className="text-[17px] font-semibold text-ink">SaaS 연결 등재 판정</DialogTitle>
        <DialogDescription className="text-[12.5px] text-faint">시행세칙 제2조의3 제1항 제3호 적격 검토. <Link to="/workbench" className="text-primary">전체 워크벤치</Link></DialogDescription>
        <div className="my-3 flex gap-1.5">
          {STEPS.map((s, i) => (
            <span key={s} className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium', i === w.step ? 'bg-accent text-primary' : i < w.step ? 'text-ok-fg' : 'text-dim')}>
              {i < w.step ? <IconCheck className="size-3" stroke={2.5} /> : <span className="font-mono">{i + 1}</span>}{s}
            </span>
          ))}
        </div>
        <div className="max-h-[60vh] overflow-auto pr-1">{body}</div>
      </DialogContent>
    </Dialog>
  )
}
