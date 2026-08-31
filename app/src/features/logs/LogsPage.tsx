import { useState } from 'react'
import { useStore } from '@/store'
import { SAMPLE_LOG } from '@/data/ledger'
import { reconcile, type LogRow } from '@/lib/reconcile'
import { PageHeader, Panel, Pill, PageTip } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useWizard } from '@/features/wizard/RegisterDialog'
import { cn } from '@/lib/utils'

export function LogsPage() {
  const runScan = useStore(s => s.runScan)
  const ledger = useStore(s => s.ledger)
  const blocked = useStore(s => s.blocked)
  const scanned = useStore(s => s.scanned)
  const lastScan = useStore(s => s.lastScan)
  const quickBlock = useStore(s => s.quickBlock)
  const rogues = useStore(s => s.rogues)
  const open = useWizard(s => s.open)
  const feed = useStore(s => s.feed)
  const [text, setText] = useState(SAMPLE_LOG)
  const [rec, setRec] = useState<ReturnType<typeof reconcile> | null>(null)
  const rows: LogRow[] | null = rec ? rec.rows : scanned && text ? reconcile(text, ledger, blocked).rows : null
  const okN = rows?.filter(r => r.status === 'ok').length || 0, badN = rows?.filter(r => r.status === 'rogue').length || 0, blkN = rows?.filter(r => r.status === 'blocked').length || 0
  return (
    <div className="view-in">
      <PageHeader title="로그 대조" crumb="로그 대조" actions={<><Button variant="outline" onClick={() => setText(SAMPLE_LOG)}>샘플 로그 넣기</Button><Button onClick={() => setRec(runScan(text))}>대조 실행</Button></>} />
      <PageTip id="logs">방화벽 로그를 붙여넣으면 승인 대장에 없는 목적지만 걸러 남깁니다.</PageTip>
      <div className="grid grid-cols-[1fr_320px] gap-4">
        <Panel title="로그 입력" right={<span className="font-mono text-[11px]">HOST 단위 집계</span>}>
          {feed.started && !text && (
            <div className="mx-5 mb-3 flex items-center gap-2.5 rounded-lg bg-accent px-3.5 py-2.5 text-[13px] text-ink">
              관측 피드 <b className="font-mono font-medium nums">{feed.lines.length}</b>줄이 실시간으로 대조되고 있습니다
              <Button size="sm" variant="outline" className="ml-auto bg-card" onClick={() => setText(feed.lines.join('\n'))}>관측 로그 불러오기</Button>
            </div>
          )}
          <div className="px-5 pb-5"><Textarea value={text} onChange={e => setText(e.target.value)} placeholder="방화벽 또는 프록시 로그를 붙여넣으세요" className="min-h-[280px] bg-card font-mono text-[12.5px] leading-6 placeholder:font-sans" /></div>
        </Panel>
        <Panel title="동작 방식">
          <ol className="px-5 pb-5">
            {[
              ['수신', '프록시, DNS, 방화벽 SNI 로그에서 목적지 도메인을 받아 관측 횟수, 단말, 포트로 집계. 여기서는 붙여넣기로 대신함'],
              ['대조', '승인 대장의 도메인 목록과 비교. 같은 입력이면 언제나 같은 결과'],
              ['잔여', '대장에 없는 목적지만 남고, 처음 본 목적지에만 로컬 AI를 불러 분류'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3 py-2.5 not-last:border-b not-last:border-[rgba(19,23,34,.06)]">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[rgba(19,23,34,.06)] font-mono text-[10.5px] font-semibold text-body">{i + 1}</span>
                <span className="text-[13px] leading-5 text-body"><b className="mr-1.5 font-semibold text-ink">{t}</b>{d}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      {rows && (
        <Panel className="mt-4 overflow-hidden" title="대조 결과" right={<span>붙여넣은 입력 기준{lastScan ? `, 마지막 대조 ${lastScan}` : null}</span>} count={
          <span className="ml-2 inline-flex gap-2"><Chip l="목적지" n={rows.length} /><Chip l="승인됨" n={okN} /><Chip l="미승인" n={badN} bad={!!badN} />{blkN ? <Chip l="차단 요청" n={blkN} /> : null}</span>}>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="pl-5">목적지</TableHead><TableHead>관측</TableHead><TableHead>판정</TableHead><TableHead>대응 / 분류와 사유</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {rows.map(r => {
                if (r.status === 'ok') return <TableRow key={r.host}><TableCell className="pl-5 font-mono">{r.host}</TableCell><TableCell>{r.info.count}회 {r.info.srcs.size}대</TableCell><TableCell><Pill tone="ok">승인됨</Pill></TableCell><TableCell className="text-body">{r.conduit.id} {r.conduit.name} ({r.conduit.basis})</TableCell><TableCell /></TableRow>
                if (r.status === 'blocked') return <TableRow key={r.host} className="opacity-60"><TableCell className="pl-5 font-mono">{r.host}</TableCell><TableCell>{r.info.count}회</TableCell><TableCell><Pill>차단 요청됨</Pill></TableCell><TableCell className="text-body">{r.blk.kind}</TableCell><TableCell /></TableRow>
                const live = rogues.find(x => x.host === r.host)
                return (
                  <TableRow key={r.host} className="bg-[#fff7f7] hover:bg-[#fff1f1]">
                    <TableCell className="pl-5 font-mono font-semibold text-bad-fg">{r.host}</TableCell><TableCell>{r.info.count}회 {r.info.srcs.size}대</TableCell><TableCell><Pill tone="bad">미승인</Pill></TableCell>
                    <TableCell className="whitespace-normal"><b className="font-semibold text-ink">{r.rogue.cls.kind}</b>{r.rogue.cls.ai && <span className="ml-1.5 rounded-full bg-accent px-1.5 py-px font-mono text-[10px] text-primary">AI</span>}<div className="text-[13px] text-body">{r.rogue.cls.risk}</div></TableCell>
                    <TableCell className={cn('whitespace-nowrap', !live && 'opacity-40')}><span className="flex gap-1.5">{r.rogue.cls.saasLike && <Button size="sm" disabled={!live} onClick={() => open({ host: r.host, name: r.host, fromRogue: true, cls: r.rogue.cls })}>판정</Button>}<Button size="sm" variant="destructive" disabled={!live} onClick={() => quickBlock(r.host)}>차단 요청</Button></span></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Panel>
      )}
    </div>
  )
}
function Chip({ l, n, bad }: { l: string; n: number; bad?: boolean }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-0.5 text-[13px] text-body">{l} <b className={cn('font-semibold', bad ? 'text-bad-fg' : 'text-ink')}>{n}</b></span>
}
