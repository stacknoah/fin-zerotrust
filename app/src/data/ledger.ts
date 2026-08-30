export type Zone = 'fin' | 'saas' | 'remote' | 'dmz' | 'tele'

export interface Conduit {
  id: string
  name: string
  type: string
  basis: string
  zone: Zone
  saasKey?: string
  domains: string[]
  ports: string
  dir: string
  approved: string
  controls: string
  review: { type: string; due: string; soon?: boolean }
  pendingRisks?: number
}

export const INITIAL_LEDGER: Conduit[] = [
  { id: 'C-01', name: '금융결제원', type: '외부기관', basis: '제2조의3 ①항 1호', zone: 'fin',
    domains: ['kftc.or.kr'], ports: '8583', dir: '양방향',
    approved: '2024-03-12 의결 제2024-03호', controls: '전용회선, 포트 한정, 구간 암호화',
    review: { type: '위원회 재승인', due: '2027-03' } },
  { id: 'C-02', name: '한국신용정보원', type: '외부기관', basis: '제2조의3 ①항 1호', zone: 'fin',
    domains: ['kcredit.or.kr'], ports: '443', dir: '양방향',
    approved: '2024-06-20 의결 제2024-11호', controls: '전용회선, 포트 한정',
    review: { type: '위원회 재승인', due: '2027-06' } },
  { id: 'C-03', name: '나이스정보통신 (VAN)', type: '외부기관', basis: '제2조의3 ①항 1호', zone: 'fin',
    domains: ['nicevan.co.kr'], ports: '9443', dir: '양방향',
    approved: '2023-11-02 의결 제2023-19호', controls: '전용회선, 포트 한정',
    review: { type: '위원회 재승인', due: '2026-11', soon: true } },
  { id: 'C-04', name: '유지보수 원격접속', type: '원격접속', basis: '제2조의3 ①항 2호', zone: 'remote',
    domains: ['vpn.paymon.co.kr'], ports: '443', dir: '인바운드',
    approved: '2025-02-14 의결 제2025-02호', controls: '별표7 원격접속: 유휴차단, 서약서, 기록, 다중인증',
    review: { type: '위원회 재승인', due: '2027-02' } },
  { id: 'C-09', name: '재택근무 VPN', type: '원격접속', basis: '제2조의3 ①항 2호', zone: 'tele',
    domains: ['ra.paymon.co.kr'], ports: '443', dir: '인바운드',
    approved: '2025-09-30 의결 제2025-07호', controls: '규정 제12조 단말 보안대책, 별표7 원격접속: 다중인증, 단말 보안 점검, 화면 캡처와 클립보드 차단, 세션 기록',
    review: { type: '위원회 재승인', due: '2027-09' } },
  { id: 'C-05', name: 'NHN 두레이', type: 'SaaS', basis: '제2조의3 ①항 3호', zone: 'saas', saasKey: 'dooray',
    domains: ['dooray.com'], ports: '443', dir: '아웃바운드',
    approved: '2026-05-30 의결 제2026-07호, 금보원 충족 확인', controls: '별표7 SaaS 10개 통제 + 살피 내용검사(보완통제)',
    review: { type: '반기 자체평가 (제4항)', due: '2026-11-30', soon: true } },
  { id: 'C-06', name: 'Microsoft 365', type: 'SaaS', basis: '제2조의3 ①항 3호', zone: 'saas', saasKey: 'm365',
    domains: ['office.com', 'office365.com', 'sharepoint.com', 'teams.microsoft.com'], ports: '443', dir: '아웃바운드',
    approved: '2026-06-15 의결 제2026-09호, 금보원 충족 확인', controls: '별표7 SaaS 10개 통제 + Purview DLP(E5)',
    review: { type: '반기 자체평가 (제4항)', due: '2026-12-15', soon: true } },
  { id: 'C-07', name: '오픈뱅킹 API GW', type: '외부연결 불가피', basis: '제2조의3 ②항 2호 나목', zone: 'dmz',
    domains: ['openapi.paymon.co.kr'], ports: '443', dir: '양방향',
    approved: '2023-08-01 의결 제2023-12호', controls: 'DMZ 격리, WAF, 포트 한정',
    review: { type: '위원회 재승인', due: '2026-08', soon: true } },
  { id: 'C-08', name: '계열사 공동 회계시스템', type: '계열사 공동', basis: '제2조의3 ②항 2호 다목', zone: 'dmz',
    domains: ['erp.paymon-holdings.com'], ports: '8443', dir: '양방향',
    approved: '2024-01-25 의결 제2024-01호', controls: '포트 한정, 구간 암호화',
    review: { type: '위원회 재승인', due: '2027-01' } },
]

export interface Classification { kind: string; saasLike: boolean; risk: string; ai?: boolean; pending?: boolean; clue?: string }

/* 미확인 도메인의 내장 분류. AI가 연결되면 Kanana가 분류하고, 미연결이거나 판단 보류면 이걸 쓴다 */
export const CLASSIFY: Record<string, Classification> = {
  'chatgpt.com': { kind: '생성형 AI SaaS', saasLike: true,
    risk: '대장에 없는 SaaS. 금융보안원 충족 목록 미확인이며, 업무 데이터가 외부 AI 학습으로 유출될 수 있는 통로' },
  'notion.so': { kind: '협업 SaaS', saasLike: true,
    risk: '대장에 없는 SaaS. 제1항 3호 예외 후보이나 승인 절차(적격 판정, 위험성 평가, 위원회) 없이 사용 중' },
  'anydesk.com': { kind: '원격제어 도구', saasLike: false,
    risk: '①항 2호 원격접속 요건(전용회선급, 별표7 통제)을 충족하지 않는 개인 원격제어. 가장 위험한 유형' },
  'dropbox.com': { kind: '개인 클라우드 저장소', saasLike: true,
    risk: '승인되지 않은 파일 반출 통로. 제15조 망분리 원칙 위반 상태' },
  'webmail.daehanpost.kr': { kind: '외부 웹메일', saasLike: false,
    risk: '업무 문서를 첨부해 외부 메일로 내보낼 수 있는 통로' },
  'pcshare.kr': { kind: '원격제어 도구', saasLike: false,
    risk: '외부에서 내부 단말 화면을 잡을 수 있는 원격제어로 추정' },
}
export const UNKNOWN_CLS: Classification = { kind: '미분류', saasLike: false, risk: '승인 대장의 어느 통로에도 해당하지 않는 외부 연결' }

export const KNOWN_SAAS: Record<string, string> = { 'notion.so': 'notion', 'dooray.com': 'dooray', 'office.com': 'm365', 'zoom.us': 'zoom', 'slack.com': 'slack' }

export const SAMPLE_LOG = `2026-08-14 09:02:11 SRC=10.20.1.15 HOST=paymon.dooray.com DPT=443 ACTION=ALLOW
2026-08-14 09:05:43 SRC=10.20.1.22 HOST=teams.microsoft.com DPT=443 ACTION=ALLOW
2026-08-14 09:12:07 SRC=10.20.1.15 HOST=kftc.or.kr DPT=8583 ACTION=ALLOW
2026-08-14 09:31:54 SRC=10.20.2.8  HOST=chatgpt.com DPT=443 ACTION=ALLOW
2026-08-14 09:48:20 SRC=10.20.2.11 HOST=notion.so DPT=443 ACTION=ALLOW
2026-08-14 10:04:19 SRC=10.20.1.30 HOST=sharepoint.com DPT=443 ACTION=ALLOW
2026-08-14 10:22:45 SRC=10.20.2.8  HOST=chatgpt.com DPT=443 ACTION=ALLOW
2026-08-14 11:08:33 SRC=10.20.3.4  HOST=anydesk.com DPT=443 ACTION=ALLOW
2026-08-14 11:15:02 SRC=10.20.1.22 HOST=kcredit.or.kr DPT=443 ACTION=ALLOW
2026-08-14 11:40:17 SRC=10.20.2.11 HOST=notion.so DPT=443 ACTION=ALLOW
2026-08-14 13:40:11 SRC=10.20.2.19 HOST=dropbox.com DPT=443 ACTION=ALLOW
2026-08-14 13:52:36 SRC=10.20.1.15 HOST=nicevan.co.kr DPT=9443 ACTION=ALLOW
2026-08-14 14:11:58 SRC=10.20.3.4  HOST=anydesk.com DPT=443 ACTION=ALLOW
2026-08-14 15:03:27 SRC=10.20.1.40 HOST=office365.com DPT=443 ACTION=ALLOW
2026-08-14 16:44:09 SRC=10.20.2.8  HOST=chatgpt.com DPT=443 ACTION=ALLOW`

export const DET_SAMPLE = `3월 여신협의회 회의록
1. 박지현 고객 주택담보대출 연체 3개월 경과 건. 연락처 010-4821-7733.
2. 신규 상품 한도 정책은 다음 회의에서 확정.
3. 정해나 고객 재방문 상담 진행.
   - 해당 고객은 신용대출 상환 지연 이력이 있음.
4. 사내 워크숍 일정 공유.`

export const USAGES = [
  { key: 'doc', t: '사내 문서 작성과 관리', d: '보고서, 회의록, 사내 위키' },
  { key: 'chat', t: '사내 메신저와 협업', d: '부서 간 커뮤니케이션, 파일 공유' },
  { key: 'meet', t: '화상회의', d: '내부 회의, 외부 협력사 회의' },
  { key: 'pm', t: '프로젝트와 업무 관리', d: '일정, 업무 배분, 진행 관리' },
]
export const NATURES = [
  { key: 'none', grade: 0, t: '고객 정보가 업무상 등장하지 않음', d: '순수 내부 업무. 인사, 총무, 개발 등 고객 접점 없는 부서' },
  { key: 'id_only', grade: 1, t: '고객 식별정보가 단독으로 등장할 수 있음', d: '이름, 연락처 수준. 신용정보법상 식별정보는 다른 신용정보와 결합될 때에만 신용정보' },
  { key: 'combined', grade: 2, t: '고객 식별정보가 거래나 상담 내용과 결합될 수 있음', d: '예: 회의록에 적힌 "OOO 고객 대출 연체 건". 결합되면 개인신용정보에 해당' },
  { key: 'unique', grade: 3, t: '주민등록번호 등 고유식별정보가 유입될 수 있음', d: '고유식별정보는 결합 여부와 무관하게 그 자체로 요건 저촉' },
  { key: 'intent', grade: 4, t: '고객 정보를 다루는 것이 이 업무의 목적임', d: '고객 DB 관리, 고객 상담 기록 등. 처리하지 않는 "이용 목적"이라 볼 수 없음' },
]
export const SAAS_LIST = [
  { key: 'm365', name: 'Microsoft 365', cat: 'DOCS / MEET / AI', mono: 'M', color: '#d83b01' },
  { key: 'slack', name: 'Slack', cat: 'MESSENGER', mono: 'S', color: '#4a154b' },
  { key: 'notion', name: 'Notion', cat: 'DOCS / WIKI', mono: 'N', color: '#1f1f1f' },
  { key: 'zoom', name: 'Zoom', cat: 'MEETING', mono: 'Z', color: '#0b5cff' },
  { key: 'dooray', name: 'NHN 두레이', cat: 'ALL-IN-ONE', mono: 'D', color: '#1c7ed6' },
]
export const AV_LABEL: Record<string, string> = { builtin: '기본 제공', higher_tier: '상위 요금제', third_party: '서드파티', none: '미제공', unclear: '미확인' }
