import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ddayLabel, dueState } from '@/lib/format'

/* 상태 배지. 색은 의미가 있을 때만 */
export function Pill({ tone = 'gray', children, className }: { tone?: 'gray' | 'ok' | 'warn' | 'bad' | 'blue'; children: ReactNode; className?: string }) {
  const map = {
    gray: 'bg-[rgba(19,23,34,.06)] text-body', ok: 'bg-ok-bg text-ok-fg', warn: 'bg-warn-bg text-warn-fg', bad: 'bg-bad-bg text-bad-fg', blue: 'bg-accent text-primary',
  }
  return <span className={cn('inline-flex h-[22px] items-center rounded-full px-2.5 text-[11.5px] font-medium whitespace-nowrap', map[tone], className)}>{children}</span>
}

export function DDay({ due, soon }: { due: string; soon?: boolean }) {
  const st = dueState(due, soon)
  return <span className={cn('inline-flex h-[22px] items-center rounded-full px-2 font-mono text-[11px] font-medium whitespace-nowrap nums', st === 'over' ? 'bg-bad-bg text-bad-fg' : st === 'soon' ? 'bg-warn-bg text-warn-fg' : 'bg-[rgba(19,23,34,.06)] text-body')}>{ddayLabel(due)}</span>
}

export function Dot({ tone, className }: { tone: 'ok' | 'soon' | 'over' | 'bad' | 'gray'; className?: string }) {
  const c = { ok: 'bg-ok', soon: 'bg-warn', over: 'bg-bad', bad: 'bg-bad', gray: 'bg-dim' }[tone]
  return <span className={cn('inline-block size-1.5 rounded-full', c, className)} />
}

/* 화면에 처음 들어올 때 한 번 뜨는 안내. 무엇을 하는 화면인지, 무엇을 눌러보면 되는지 */
const introSeen = new Set<string>()
export function PageIntro({ id, title, children, tryText, action }: { id: string; title: string; children: ReactNode; tryText: ReactNode; action?: { label: string; onClick: () => void } }) {
  const [open, setOpen] = useState(() => !introSeen.has(id))
  useEffect(() => { introSeen.add(id) }, [id])
  const close = () => setOpen(false)
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) close() }}>
      <DialogContent className="max-w-[460px] p-6">
        <DialogTitle className="pr-6 text-[19px] leading-[26px] font-semibold tracking-[-0.01em] text-ink">{title}</DialogTitle>
        <p className="text-[13.5px] leading-[21px] text-body">{children}</p>
        <div className="rounded-lg bg-accent px-3.5 py-3 text-[13.5px] leading-[21px] text-ink"><b className="mr-1.5 font-semibold text-primary">해보기</b>{tryText}</div>
        <div className="flex justify-end gap-2">
          <Button variant={action ? 'outline' : 'default'} onClick={close}>{action ? '둘러보기' : '확인'}</Button>
          {action && <Button onClick={() => { close(); action.onClick() }}>{action.label}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* 페이지 머리. 제목은 상단 탭이 이미 말해주므로 다시 쓰지 않고, 요약 한 줄과 동작 버튼만 둔다 */
export function PageHeader({ actions, lead }: { title?: string; actions?: ReactNode; crumb?: string; lead?: ReactNode }) {
  if (!actions && !lead) return null
  return (
    <div className="mb-5 flex min-h-9 items-center gap-4">
      {lead && <p className="text-[14px] text-faint">{lead}</p>}
      {actions && <div className="ml-auto flex gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ title, count, right, children, className, bodyClass }: { title?: ReactNode; count?: ReactNode; right?: ReactNode; children?: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn('surface overflow-hidden', className)}>
      {title && (
        <header className="flex flex-wrap items-center gap-2.5 px-5 pt-4 pb-3">
          <span className="text-[14px] font-semibold text-ink">{title}</span>
          {count != null && <span className="font-mono text-[12px] text-dim nums">{count}</span>}
          {right && <span className="ml-auto flex items-center gap-2 text-[12.5px] text-faint">{right}</span>}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  )
}

export function MonoCode({ children }: { children: ReactNode }) {
  return <code className="rounded-md bg-[rgba(19,23,34,.05)] px-1.5 py-0.5 font-mono text-[12px] text-body">{children}</code>
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-8 text-center text-[13px] text-faint">
      <div>{children}</div>
      {action}
    </div>
  )
}

/* 큰 숫자 한 줄. 표 위나 페이지 머리에 놓는 지표 줄 */
export function Figures({ items, className }: { items: { l: string; n: ReactNode; tone?: string; sub?: ReactNode }[]; className?: string }) {
  return (
    <div className={cn('mb-6 flex', className)}>
      {items.map((it, i) => (
        <div key={it.l} className={cn('min-w-[150px] pr-8', i > 0 && 'border-l border-[rgba(19,23,34,.08)] pl-6')}>
          <span className="block text-[12.5px] text-faint whitespace-nowrap">{it.l}</span>
          <b className={cn('mt-0.5 block text-[28px] font-semibold leading-9 tracking-[-0.02em] text-ink nums', it.tone)}>{it.n}</b>
          {it.sub && <span className="block text-[12px] text-dim">{it.sub}</span>}
        </div>
      ))}
    </div>
  )
}
