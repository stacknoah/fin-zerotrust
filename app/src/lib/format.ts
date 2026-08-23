export const now = () => new Date().toTimeString().slice(0, 8)
export const hhmm = () => new Date().toTimeString().slice(0, 5)
export const today = () => new Date().toISOString().slice(0, 10)

/* due: "2026-11" 또는 "2026-11-30" */
export function daysTo(due: string) {
  const p = due.split('-').map(Number)
  const d = new Date(p[0], p[1] - 1, p[2] || 28)
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}
export type DueState = 'ok' | 'soon' | 'over'
export function dueState(due: string, soonFlag?: boolean): DueState {
  const n = daysTo(due)
  return n < 0 ? 'over' : soonFlag || n <= 45 ? 'soon' : 'ok'
}
export const ddayLabel = (due: string) => { const n = daysTo(due); return n < 0 ? `D+${-n}` : `D-${n}` }

/* 위반 원문은 저장하지 않는다. 숫자는 끝 네 자리만, 이름은 가운데 글자를 가린다 */
export function mask(s: string) {
  return String(s)
    .replace(/\d[\d\s-]{4,}\d/g, run => {
      const total = (run.match(/\d/g) || []).length
      if (total < 5) return run
      let seen = 0
      return run.split('').reverse().map(ch => (!/\d/.test(ch) ? ch : ++seen <= 4 ? ch : '*')).reverse().join('')
    })
    .replace(/([가-힣])[가-힣]([가-힣]?)(\s?(고객님|고객|님|씨))/g, '$1*$2$3')
}

/* SVG 글자 폭 추정. 한글 1em, 라틴 대문자 .68, 소문자와 숫자 .56, 공백 .3 */
export const textW = (str: string, size: number) =>
  [...str].reduce((w, ch) => w + size * (/[가-힣]/.test(ch) ? 1 : /[A-Z]/.test(ch) ? 0.68 : /[a-z0-9]/.test(ch) ? 0.56 : 0.3), 0)
