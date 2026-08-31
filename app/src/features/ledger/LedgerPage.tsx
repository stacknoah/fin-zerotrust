import { useNavigate } from 'react-router-dom'
import { useStore, contentCount } from '@/store'
import { PageHeader, Panel, Pill, DDay, MonoCode, PageTip } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useWizard } from '@/features/wizard/RegisterDialog'
import { cn } from '@/lib/utils'

export function LedgerPage() {
  const ledger = useStore(s => s.ledger)
  const rogues = useStore(s => s.rogues)
  const contentLog = useStore(s => s.contentLog)
  const quickBlock = useStore(s => s.quickBlock)
  const setSel = useStore(s => s.setSel)
  const open = useWizard(s => s.open)
  const nav = useNavigate()
  const goto = (id: string) => { setSel(id); nav('/map') }
  const Th = ({ children, cls }: { children?: React.ReactNode; cls?: string }) => <TableHead className={cn('h-10 text-[12px] font-medium text-faint', cls)}>{children}</TableHead>
  return (
    <div className="view-in">
      <PageHeader title="연결 대장" crumb="연결 대장" actions={<Button onClick={() => open({ name: '새 SaaS' })}>SaaS 연결 등재</Button>} />
      <PageTip id="ledger">승인된 연결과 새로 발견된 미승인 연결을 한 표에서 봅니다. 재승인 기한이 임박한 줄은 주황으로 뜹니다.</PageTip>
      <Panel className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <Th cls="w-[21%] pl-5">연결</Th><Th cls="w-[10%]">유형</Th><Th cls="w-[14%]">근거 조문</Th><Th cls="w-[19%]">도메인</Th><Th cls="w-[10%]">승인</Th><Th>다음 의무</Th><Th cls="w-[11%]" />
          </TableRow></TableHeader>
          <TableBody>
            {rogues.map(r => (
              <TableRow key={r.host} className="shadow-[inset_3px_0_0_#c4302b] hover:bg-[#fffafa]">
                <TableCell className="py-3 pl-5"><span className="block font-mono text-[13px] font-semibold text-bad-fg">{r.host}</span><span className="mt-0.5 block max-w-[420px] truncate text-[11.5px] text-faint">{r.cls.risk}</span></TableCell>
                <TableCell><span className="inline-flex h-[22px] items-center rounded-full border border-[rgba(19,23,34,.14)] px-2 text-[11.5px] font-medium whitespace-nowrap text-body">{r.cls.kind}</span></TableCell>
                <TableCell className="text-[13px] text-dim">대장에 없음</TableCell>
                <TableCell><MonoCode>{r.host} :{[...r.info.ports].join(',')}</MonoCode></TableCell>
                <TableCell className="font-mono text-[12px] text-faint nums">누적 {r.info.count}회</TableCell>
                <TableCell><Pill tone="warn">조치 대기</Pill>{r.cls.ai && <span className="ml-1.5 font-mono text-[10.5px] text-faint">AI 분류</span>}</TableCell>
                <TableCell className="w-[176px] pr-4 whitespace-nowrap"><span className="flex items-center justify-end gap-1.5">{r.cls.saasLike ? <Button size="sm" onClick={() => open({ host: r.host, name: r.host, fromRogue: true, cls: r.cls })}>판정</Button> : r.cls.kind === '미분류' ? <span className="mr-1 rounded-full bg-warn-bg px-2 py-px text-[11px] font-medium text-warn-fg">사람 판정 필요</span> : <span className="mr-1 cursor-help text-[11.5px] text-dim underline decoration-dotted underline-offset-2" title="SaaS 등재 유형이 아님. 원격제어는 1항 2호 전용회선 요건을 못 채워 차단만 가능">등재 대상 아님</span>}<Button size="sm" variant="outline" className="text-bad-fg hover:text-bad-fg" onClick={() => quickBlock(r.host)}>차단 요청</Button></span></TableCell>
              </TableRow>
            ))}
            {ledger.map(c => {
              const n = contentCount(contentLog, c.id)
              return (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => goto(c.id)}>
                  <TableCell className="py-3 pl-5"><span className="block text-[13.5px] font-medium text-ink">{c.name}</span><span className="mt-0.5 block font-mono text-[11px] text-dim">{c.id}</span></TableCell>
                  <TableCell><span className="inline-flex h-[22px] items-center rounded-full border border-[rgba(19,23,34,.14)] px-2 text-[11.5px] font-medium whitespace-nowrap text-body">{c.type}</span></TableCell>
                  <TableCell className="text-[13px] text-body">{c.basis}</TableCell>
                  <TableCell><MonoCode>{c.domains[0]} :{c.ports}</MonoCode></TableCell>
                  <TableCell className="font-mono text-[12px] text-faint nums">{c.approved.slice(0, 10)}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 text-[13px] text-body">{c.review.type.replace(' (제4항)', '')}<DDay due={c.review.due} soon={c.review.soon} /></span>
                    {c.zone === 'saas' && <div className={cn('mt-0.5 text-[11.5px]', n ? 'text-ok-fg' : 'text-dim')}>내용검사 {n}건{c.pendingRisks ? `, 미해소 ${c.pendingRisks}건` : ''}</div>}
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
