import { EVIDENCE, type EvidenceEntry } from './evidence'

export type Entry = EvidenceEntry & { _i: number }
export const HAS_CONTROL = (e: EvidenceEntry) => ['builtin', 'higher_tier', 'third_party'].includes(e.control_availability)

export function entriesFor(saasKey: string | null | undefined): Entry[] {
  if (!saasKey) return []
  const pack = EVIDENCE.find(e => e.saas.toLowerCase().includes(saasKey === 'm365' ? 'microsoft' : saasKey))
  return pack ? pack.entries.map((e, i) => ({ ...e, _i: i })) : []
}

export interface Finding { lv: 'r' | 'w' | 'g'; t: string; act?: string }
export interface Verdict { grade: 'ok' | 'cond' | 'bad'; title: string; risks: Finding[]; oks: Finding[] }

export interface JudgeInput {
  nature: string | null
  l1: 'yes' | 'no' | null
  entries: Entry[]
  applied: Record<number, boolean>
  comp: Record<number, boolean>
  profileE5?: 'yes' | 'no' | 'unknown'
}

/* 결정적 판정. 같은 입력이면 같은 결과. 등재 위저드와 워크벤치가 같은 함수를 쓴다 */
export function judge(w: JudgeInput): Verdict {
  const risks: Finding[] = [], oks: Finding[] = []
  if (w.nature === 'intent')
    return { grade: 'bad', title: '예외 적용 불가', oks, risks: [{ lv: 'r', t: '고객 정보를 다루는 것이 업무 목적 자체. 제1항 3호의 "처리하지 않는 이용 목적"에 해당하지 않음. 혁신금융서비스 경로 또는 업무 범위 재설계 필요.' }] }
  if (w.l1 === 'yes')
    return { grade: 'bad', title: '예외 적용 불가', oks, risks: [{ lv: 'r', t: '고객 정보를 필드 단위로 다루는 기능(연락처 DB, CRM성 기능) 사용 계획. 구조화된 저장과 검색으로서 명백한 처리.' }] }

  if (w.nature === 'none') oks.push({ lv: 'g', t: '업무상 고객 정보 유입 가능성 없음. 요건 저촉 소지 낮음. 업무 범위 변경 시 재검토(검토서에 용도 한정 명시).' })
  if (w.nature === 'id_only') oks.push({ lv: 'g', t: '식별정보 단독은 신용정보법상 다른 신용정보와 결합될 때에만 개인신용정보. 현재 용도는 저촉 소지 낮음. 결합 가능성을 입력 제한 기준에 명시.' })
  if (w.nature === 'unique') risks.push({ lv: 'w', t: '고유식별정보 유입 가능성. 결합 여부와 무관하게 그 자체로 요건 저촉이므로 입력 차단 통제 필수. 미차단 발견 시 즉시 삭제와 보고 절차 필요.' })

  const risky = w.nature === 'combined' || w.nature === 'unique'
  const ctrl = w.entries.filter(e => (e.layer === 'L2' || e.layer === 'L3') && e.exists !== 'no')
  if (!ctrl.length) {
    if (risky) risks.push({ lv: 'r', t: '통제 근거 미수집 상태에서 고객 정보 유입 가능 용도. 등재 불가. 근거 수집 후 재판정하거나 차단.' })
    else risks.push({ lv: 'w', t: '통제 근거 미수집. 조건부 등재하고 벤더 문서 근거 수집을 등재 조건으로 부기.' })
  }
  const actionFor = (e: EvidenceEntry, has: boolean) => {
    if (!has) return '살피 내용검사(로컬 결합 탐지)를 이 접점의 보완통제로 지정하고, 탐지 로그를 반기 자체평가 증적으로 수집'
    if (e.control_availability === 'higher_tier' && w.profileE5 === 'no') return '상위 요금제 미보유. 요금제 증설 전까지 살피 내용검사 또는 단말 DLP를 보완통제로 적용'
    const first = (e.control || '').split(/[.。]\s|\(/)[0].trim()
    return '관리자 콘솔에서 설정 적용 후 증적 확보: ' + (first.length > 90 ? first.slice(0, 90) + '…' : first)
  }
  for (const e of ctrl) {
    const has = HAS_CONTROL(e), applied = w.applied[e._i], comp = w.comp[e._i]
    if (has && applied) oks.push({ lv: 'g', t: `${e.feature}: 통제 적용 계획 확인` })
    else if (!has && comp) risks.push({ lv: 'w', t: `${e.feature}: 벤더 미제공. 살피 내용검사를 보완통제로 지정`, act: actionFor(e, false) })
    else if (risky) risks.push({ lv: 'r', t: `${e.feature}: 통제 미적용. 고객 정보 유입 가능 용도에서 이 접점이 열려 있음`, act: actionFor(e, has) })
    else risks.push({ lv: 'w', t: `${e.feature}: 통제 미적용. 현재 용도는 유입 가능성이 낮으나 적용 권고`, act: actionFor(e, has) })
  }
  const hard = risks.filter(r => r.lv === 'r').length
  if (hard) return { grade: 'bad', title: '조건 미충족, 등재 불가', risks, oks }
  if (risks.length) return { grade: 'cond', title: '조건부 적합', risks, oks }
  return { grade: 'ok', title: '예외 요건 충족', risks, oks }
}
