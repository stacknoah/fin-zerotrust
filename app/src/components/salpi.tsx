import { useEffect, useState, type ReactNode } from 'react'
import { IconX } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
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

/* 페이지 첫 방문에 한 번 뜨는 한 줄 안내 */
export function PageTip({ id, children }: { id: string; children: ReactNode }) {
  const key = 'salpi_tip_' + id
  const [open, setOpen] = useState(() => { try { return !sessionStorage.getItem(key) } catch { return true } })
  const close = () => { try { sessionStorage.setItem(key, '1') } catch { void 0 } setOpen(false) }
  useEffect(() => {
    if (!open) return
    const t = setTimeout(close, 12000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  if (!open) return null
  return (
    <div className="tip-in relative mb-4 inline-flex max-w-[720px] items-start gap-3 rounded-xl bg-ink py-2.5 pr-2.5 pl-4 text-[13.5px] leading-5 text-white shadow-[var(--shadow-float)]">
      <span className="absolute -top-[5px] left-7 size-[10px] rotate-45 rounded-[2px] bg-ink" />
      <span className="pt-px">{children}</span>
      <button onClick={close} aria-label="닫기" className="-mt-0.5 shrink-0 rounded-md p-1 text-white/45 transition hover:bg-white/10 hover:text-white"><IconX className="size-3.5" stroke={2} /></button>
    </div>
  )
}

export function PageHeader({ title, actions, crumb, lead }: { title: string; actions?: ReactNode; crumb?: string; lead?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-end gap-6">
        <div>
          <h2 className="text-[26px] font-semibold leading-8 tracking-[-0.02em] text-ink">{title}</h2>
          {lead && <p className="mt-1 text-[14px] text-faint">{lead}</p>}
        </div>
        {actions && <div className="ml-auto flex gap-2">{actions}</div>}
      </div>
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
