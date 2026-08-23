import { useStore, contentCount, detectCount } from '@/store'
import { today } from '@/lib/format'
import { StatStrip } from '@/components/StatStrip'
import { PageHeader, Panel } from '@/components/salpi'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { IconCheck, IconAlertCircle } from '@tabler/icons-react'

export function ReportPage() {
  const ledger = useStore(s => s.ledger)
  const rogues = useStore(s => s.rogues)
  const blocked = useStore(s => s.blocked)
  const contentLog = useStore(s => s.contentLog)
  const saas = ledger.filter(c => c.review.type.includes('반기'))
  const byType: Record<string, number> = {}
  for (const c of ledger) byType[c.type] = (byType[c.type] || 0) + 1
  const detects = detectCount(contentLog)
  const Check = ({ ok, children, n }: { ok: boolean; children: React.ReactNode; n: number }) => (
    <div className={cn('flex items-center gap-3 border-t px-5 py-2.5 text-sm', ok ? 'text-ink' : 'text-warn-fg')}>
      {ok ? <IconCheck className="size-4 text-ok-fg" stroke={2.5} /> : <IconAlertCircle className="size-4" stroke={2} />}{children}<span className="ml-auto font-mono text-xs text-faint">{n}건</span>
    </div>
  )
  const Th = ({ children, w }: { children: React.ReactNode; w?: string }) => <th className="border border-[#bbb] bg-[#f2f2ef] px-2 py-1.5 text-left text-[9.5pt] font-bold" style={{ width: w }}>{children}</th>
  const Td = ({ children, cls }: { children?: React.ReactNode; cls?: string }) => <td className={cn('border border-[#bbb] px-2 py-1.5 align-top text-[9.5pt]', cls)}>{children}</td>
  return (
    <div className="view-in">
      <StatStrip />
      <PageHeader title="반기 보고" crumb="반기 보고" actions={<Button onClick={() => window.print()}>인쇄 / PDF 저장</Button>} />
      <Panel title="제출 전 점검" className="mb-4 max-w-[880px]">
        <Check ok n={ledger.length}>예외 운영 현황 집계 완료</Check>
        <Check ok n={saas.length}>SaaS 반기 자체평가 대상 정리</Check>
        <Check ok={detects > 0} n={detects}>내용검사 증적{detects ? '' : ', 아직 없음'}</Check>
        <Check ok={!rogues.length} n={rogues.length}>{rogues.length ? '미등록 연결 조치 대기' : '미등록 연결 전부 조치됨'}</Check>
      </Panel>
      <div className="print-area rounded-lg border bg-card p-8 font-[Apple_SD_Gothic_Neo,Pretendard,sans-serif] text-[10.5pt] leading-[1.65] text-[#111]" style={{ maxWidth: 880 }}>
        <h3 className="border-b-2 border-[#111] pb-2 text-[16pt] font-bold tracking-tight">망분리 적용 예외 운영 현황 및 반기 자체평가 보고 (초안)</h3>
        <p className="mt-2 text-[#555]">기준일 {today()}, 근거: 시행세칙 제2조의3 제3항과 제4항</p>
        <h4 className="mt-5 mb-1.5 text-[12pt] font-bold">1. 예외 운영 현황</h4>
        <table className="w-full border-collapse"><thead><tr><Th>유형</Th><Th>건수</Th></tr></thead><tbody>
          {Object.entries(byType).map(([t, n]) => <tr key={t}><Td>{t}</Td><Td>{n}</Td></tr>)}
          <tr className={rogues.length ? 'bg-[#fff1f1]' : ''}><Td><b>미등록 연결 (로그 실측)</b></Td><Td><b>{rogues.length}</b></Td></tr>
          {blocked.length > 0 && <tr><Td>차단 확정</Td><Td>{blocked.length}</Td></tr>}
        </tbody></table>
        <h4 className="mt-5 mb-1.5 text-[12pt] font-bold">2. SaaS 반기 자체평가 (제4항)와 내용검사 증적</h4>
        <table className="w-full border-collapse"><thead><tr><Th>통로</Th><Th>적용 통제</Th><Th>내용검사 기록</Th><Th>기한</Th></tr></thead><tbody>
          {saas.map(c => <tr key={c.id}><Td>{c.id} {c.name}</Td><Td cls="text-[8.5pt]">{c.controls}</Td><Td>{contentCount(contentLog, c.id)}건 (마스킹 저장)</Td><Td>{c.review.due}</Td></tr>)}
        </tbody></table>
        <h4 className="mt-5 mb-1.5 text-[12pt] font-bold">3. 미등록 연결 발견과 조치</h4>
        {rogues.length || blocked.length ? (
          <table className="w-full border-collapse"><thead><tr><Th>목적지</Th><Th>분류</Th><Th>상태</Th></tr></thead><tbody>
            {rogues.map(r => <tr key={r.host}><Td>{r.host}</Td><Td>{r.cls.kind}</Td><Td>조치 대기 (등재 판정 또는 차단)</Td></tr>)}
            {blocked.map(b => <tr key={b.host}><Td>{b.host}</Td><Td>{b.kind}</Td><Td>차단 확정</Td></tr>)}
          </tbody></table>
        ) : <p>대조 결과 없음</p>}
        <table className="mt-4 w-full border-collapse"><thead><tr><Th w="70%">확인</Th><Th>서명</Th></tr></thead><tbody>
          <tr><Td>작성: 정보보호 담당</Td><Td /></tr><tr><Td>정보보호최고책임자(CISO)</Td><Td /></tr>
        </tbody></table>
        <p className="mt-3 text-[8.5pt] text-[#777]">초안. 정보보호위원회 심의 전 검토용.</p>
      </div>
    </div>
  )
}
