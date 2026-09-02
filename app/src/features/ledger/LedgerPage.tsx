import { useNavigate } from 'react-router-dom'
import { useStore, contentCount } from '@/store'
import { PageHeader, Panel, Pill, DDay, MonoCode, PageIntro, Empty } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useWizard } from '@/features/wizard/RegisterDialog'
import { cn } from '@/lib/utils'
import { IconShieldCheck } from '@tabler/icons-react'

/* 승인 대장은 위에 고정된 표, 미승인 연결은 아래 별도 패널.
   새 미승인이 잡혀도 아래 패널 안에서만 늘어나므로 위 표가 밀리지 않는다 */
export function LedgerPage() {
  const ledger = useStore(s => s.ledger)
  const rogues = useStore(s => s.rogues)
  const scanned = useStore(s => s.scanned)
  const feed = useStore(s => s.feed)
  const startFeed = useStore(s => s.startFeed)
  const contentLog = useStore(s => s.contentLog)
  const quickBlock = useStore(s => s.quickBlock)
  const setSel = useStore(s => s.setSel)
  const open = useWizard(s => s.open)
  const nav = useNavigate()
  const goto = (id: string) => { setSel(id); nav('/map') }
  const due = ledger.filter(c => c.review.soon).length
  const Th = ({ children, cls }: { children?: React.ReactNode; cls?: string }) => <TableHead className={cn('h-10 text-[12px] font-medium text-faint', cls)}>{children}</TableHead>
  return (
    <div className="view-in">
      <PageHeader title="연결 대장" crumb="연결 대장"
        lead={<span>승인 <b className="font-semibold text-ink nums">{ledger.length}건</b>{due ? <>, 재승인 임박 <b className="font-semibold text-warn-fg nums">{due}건</b></> : null}, 미승인 {scanned ? <b className={cn('font-semibold nums', rogues.length ? 'text-bad-fg' : 'text-ink')}>{rogues.length}건</b> : <span className="text-dim">관측 전</span>}</span>}
        actions={<Button onClick={() => open({ name: '새 SaaS' })}>SaaS 연결 등재</Button>} />
      <PageIntro id="ledger" title="승인된 연결은 위에, 새로 발견된 미승인 연결은 아래에 있습니다" tryText="아래 미승인 연결에서 [판정]을 눌러 등재 절차를 시작해 보세요. 비어 있으면 관제 화면에서 데모를 먼저 실행합니다.">
        위 표가 승인 대장입니다. 근거 조문과 다음 의무 기한이 붙어 있고, 임박한 줄은 주황색으로 표시됩니다. 줄을 누르면 관제 화면에서 그 연결의 위치를 보여줍니다.
      </PageIntro>

      <Panel title="승인 대장" count={ledger.length} right="줄을 누르면 관제 화면에서 위치를 봅니다" className="overflow-hidden">
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <Th cls="w-[24%] pl-5">연결</Th><Th cls="w-[11%]">유형</Th><Th cls="w-[15%]">근거 조문</Th><Th cls="w-[20%]">도메인</Th><Th cls="w-[10%]">승인일</Th><Th>다음 의무</Th>
          </TableRow></TableHeader>
          <TableBody>
            {ledger.map(c => {
              const n = contentCount(contentLog, c.id)
              return (
                <TableRow key={c.id} className={cn('cursor-pointer', c.review.soon && 'bg-[#fffbf3] hover:bg-[#fff6e6]')} onClick={() => goto(c.id)}>
                  <TableCell className="py-3 pl-5"><span className="block text-[13.5px] font-medium text-ink">{c.name}</span><span className="mt-0.5 block font-mono text-[11px] text-dim">{c.id}</span></TableCell>
                  <TableCell><span className="inline-flex h-[22px] items-center rounded-full border border-[rgba(19,23,34,.14)] px-2 text-[11.5px] font-medium whitespace-nowrap text-body">{c.type}</span></TableCell>
                  <TableCell className="text-[13px] text-body">{c.basis}</TableCell>
                  <TableCell><MonoCode>{c.domains[0]} :{c.ports}</MonoCode></TableCell>
                  <TableCell className="font-mono text-[12px] text-faint nums">{c.approved.slice(0, 10)}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 text-[13px] text-body">{c.review.type.replace(' (제4항)', '')}<DDay due={c.review.due} soon={c.review.soon} /></span>
                    {c.zone === 'saas' && <div className={cn('mt-0.5 text-[11.5px]', n ? 'text-ok-fg' : 'text-dim')}>내용검사 {n}건{c.pendingRisks ? `, 미해소 ${c.pendingRisks}건` : ''}</div>}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Panel>

      <Panel className="mt-4 overflow-hidden" title="미승인 연결" count={scanned ? rogues.length : undefined}
        right={scanned ? (rogues.length ? <span className="font-medium text-bad-fg">조치 대기. 판정해 등재하거나 차단을 요청합니다</span> : '조치할 연결 없음') : '관측 전. 로그를 대조하면 대장에 없는 목적지가 여기 쌓입니다'}>
        {rogues.length ? (
          <div className="min-h-[132px]">
            {rogues.map(r => (
              <div key={r.host} className="grid grid-cols-[minmax(200px,24%)_minmax(150px,15%)_1fr_auto] items-center gap-4 border-t border-[rgba(19,23,34,.06)] py-3 pr-4 pl-5 shadow-[inset_3px_0_0_#c4302b]">
                <div>
                  <span className="block font-mono text-[13px] font-semibold text-bad-fg">{r.host}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-dim nums">누적 {r.info.count}회, 단말 {r.info.srcs.size}대, 포트 {[...r.info.ports].join(',')}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex h-[22px] items-center rounded-full border border-[rgba(19,23,34,.14)] px-2 text-[11.5px] font-medium whitespace-nowrap text-body">{r.cls.kind}</span>
                  {r.cls.ai && <Pill tone="blue">AI</Pill>}
                </div>
                <div className="min-w-0 truncate text-[13px] text-body" title={r.cls.risk}>{r.cls.risk}</div>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  {r.cls.saasLike
                    ? <Button size="sm" onClick={() => open({ host: r.host, name: r.host, fromRogue: true, cls: r.cls })}>판정</Button>
                    : r.cls.kind === '미분류'
                      ? <span className="mr-1 rounded-full bg-warn-bg px-2 py-px text-[11px] font-medium text-warn-fg">사람 판정 필요</span>
                      : <span className="mr-1 cursor-help text-[11.5px] text-dim underline decoration-dotted underline-offset-2" title="SaaS 등재 유형이 아님. 원격제어는 1항 2호 전용회선 요건을 못 채워 차단만 가능">등재 대상 아님</span>}
                  <Button size="sm" variant="outline" className="text-bad-fg hover:text-bad-fg" onClick={() => quickBlock(r.host)}>차단 요청</Button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="min-h-[132px]">
            <Empty action={!feed.started ? <Button size="sm" variant="outline" onClick={startFeed}>데모 실행</Button> : undefined}>
              <IconShieldCheck className="mx-auto mb-2 size-8 text-dim" stroke={1.4} />{scanned ? '조치할 미승인 연결 없음' : '아직 관측 전입니다'}
            </Empty>
          </div>
        )}
      </Panel>
    </div>
  )
}
