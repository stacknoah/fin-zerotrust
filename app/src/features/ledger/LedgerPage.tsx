import { useStore, contentCount } from '@/store'
import { StatStrip } from '@/components/StatStrip'
import { PageHeader, Panel, Pill, MonoCode } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useWizard } from '@/features/wizard/RegisterDialog'
import { cn } from '@/lib/utils'

export function LedgerPage() {
  const ledger = useStore(s => s.ledger)
  const rogues = useStore(s => s.rogues)
  const contentLog = useStore(s => s.contentLog)
  const quickBlock = useStore(s => s.quickBlock)
  const open = useWizard(s => s.open)
  return (
    <div className="view-in">
      <StatStrip />
      <PageHeader title="통로 대장" crumb="통로 대장" />
      <Panel title="통로" count={ledger.length + rogues.length} right={<Button onClick={() => open({ name: '새 SaaS' })}>SaaS 통로 등재</Button>} className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead className="w-[18%] pl-5">통로</TableHead><TableHead className="w-[10%]">유형</TableHead><TableHead className="w-[15%]">근거 조문</TableHead><TableHead className="w-[18%]">연결</TableHead><TableHead className="w-[11%]">승인</TableHead><TableHead>다음 의무</TableHead><TableHead className="w-[12%]" />
          </TableRow></TableHeader>
          <TableBody>
            {rogues.map(r => (
              <TableRow key={r.host} className="bg-[#fff7f7] hover:bg-[#fff1f1]">
                <TableCell className="pl-5"><span className="flex items-center gap-2.5"><span className="inline-flex size-7 items-center justify-center rounded-lg bg-bad-bg text-[13px] font-bold text-bad-fg">!</span><span><span className="block font-mono font-semibold text-bad-fg">{r.host}</span><span className="text-[11px] text-faint">미등록</span></span></span></TableCell>
                <TableCell><Pill tone="bad">{r.cls.kind}</Pill></TableCell>
                <TableCell colSpan={2} className="text-[13px] whitespace-normal text-body">{r.cls.risk}</TableCell>
                <TableCell>관측 {r.info.count}회, 단말 {r.info.srcs.size}대</TableCell>
                <TableCell><Pill tone="bad">조치 대기</Pill></TableCell>
                <TableCell className="whitespace-nowrap"><span className="flex gap-1.5">{r.cls.saasLike && <Button size="sm" onClick={() => open({ host: r.host, name: r.host, fromRogue: true, cls: r.cls })}>판정</Button>}<Button size="sm" variant="destructive" onClick={() => quickBlock(r.host)}>차단</Button></span></TableCell>
              </TableRow>
            ))}
            {ledger.map(c => {
              const n = contentCount(contentLog, c.id)
              return (
                <TableRow key={c.id}>
                  <TableCell className="pl-5"><span className="flex items-center gap-2.5"><span className={cn('inline-flex size-7 items-center justify-center rounded-lg text-[13px] font-bold', c.zone === 'saas' ? 'bg-accent text-primary' : 'bg-secondary text-body')}>{c.name.replace(/^NHN |^Microsoft /, '')[0]}</span><span><span className="block font-semibold text-ink">{c.name}</span><span className="font-mono text-[11px] text-faint">{c.id}</span></span></span></TableCell>
                  <TableCell><Pill>{c.type}</Pill></TableCell>
                  <TableCell className="text-body">{c.basis}</TableCell>
                  <TableCell><MonoCode>{c.domains[0]} :{c.ports}</MonoCode></TableCell>
                  <TableCell className="text-body">{c.approved.slice(0, 10)}</TableCell>
                  <TableCell>
                    <span className={cn(c.review.soon && 'font-medium text-warn-fg')}>{c.review.type} {c.review.due}{c.review.soon && ' 임박'}</span>
                    {c.zone === 'saas' && <div className={cn('mt-0.5 text-[11.5px]', n ? 'text-ok-fg' : 'text-faint')}>내용검사 {n}건{c.pendingRisks ? `, 미해소 ${c.pendingRisks}건` : ''}</div>}
                  </TableCell>
                  <TableCell />
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Panel>
    </div>
  )
}
