import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ddayLabel, dueState } from '@/lib/format'

/* 상태 배지. 색은 의미가 있을 때만 */
export function Pill({ tone = 'gray', children, className }: { tone?: 'gray' | 'ok' | 'warn' | 'bad' | 'blue'; children: ReactNode; className?: string }) {
  const map = {
    gray: 'bg-secondary text-body', ok: 'bg-ok-bg text-ok-fg', warn: 'bg-warn-bg text-warn-fg', bad: 'bg-bad-bg text-bad-fg', blue: 'bg-accent text-primary',
  }
  return <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap', map[tone], className)}>{children}</span>
}

export function DDay({ due }: { due: string }) {
  const st = dueState(due)
  return <span className={cn('font-mono text-[11px] font-semibold rounded px-1.5 py-px whitespace-nowrap', st === 'over' ? 'bg-bad-bg text-bad-fg' : st === 'soon' ? 'bg-warn-bg text-warn-fg' : 'bg-secondary text-body')}>{ddayLabel(due)}</span>
}

export function Dot({ tone, className }: { tone: 'ok' | 'soon' | 'over' | 'bad' | 'gray'; className?: string }) {
  const c = { ok: 'bg-ok', soon: 'bg-[#e8a23d]', over: 'bg-bad', bad: 'bg-bad', gray: 'bg-dim' }[tone]
  return <span className={cn('inline-block size-1.5 rounded-full', c, className)} />
}

export function PageHeader({ title, actions, crumb }: { title: string; actions?: ReactNode; crumb?: string }) {
  return (
    <div className="mb-5">
      {crumb && <div className="mb-2 text-[13px] text-faint">살피 <span className="mx-2">/</span> {crumb}</div>}
      <div className="flex items-start gap-6">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
        {actions && <div className="ml-auto flex gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function Panel({ title, count, right, children, className, bodyClass }: { title?: ReactNode; count?: ReactNode; right?: ReactNode; children?: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn('rounded-lg border bg-card', className)}>
      {title && (
        <header className="flex flex-wrap items-center gap-2.5 px-5 pt-4 pb-3">
          <span className="text-[15px] font-semibold text-ink">{title}</span>
          {count != null && <span className="text-sm text-faint">{count}</span>}
          {right && <span className="ml-auto flex items-center gap-2 text-[13px] text-faint">{right}</span>}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  )
}

export function MonoCode({ children }: { children: ReactNode }) {
  return <code className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[12px] text-body">{children}</code>
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-7 text-center text-[13px] text-faint">
      <div>{children}</div>
      {action}
    </div>
  )
}
