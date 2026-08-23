export interface ScanHit { layer: string; label: 'combined'|'identifier_only'|'unique_id'|string; tag: string; span: string; index: number; note: string; severity: 'violation'|'info'|string; identifier?: string; credit_context?: string; valid?: boolean }
export interface ScanResult { hits: ScanHit[]; mode: string; degraded?: string; rejected?: { reason: string; span?: string }[] }
export type LlmEvent =
  | { type: 'start'; windows: number; model: string }
  | { type: 'window'; i: number; total: number; chunk: string }
  | { type: 'result'; i: number; total: number; ms: number; accepted: { label: string; span: string }[]; dropped: { ok: false; reason: string; span?: string }[] }
  | { type: 'done'; windows: number; accepted: number; dropped: number }
export interface LlmOpts { model?: string; endpoint?: string; timeoutMs?: number; onEvent?: (e: LlmEvent) => void }
export interface Classification { kind: string; saasLike: boolean; risk: string; ai?: boolean }
export interface Engine {
  scan(text: string, opts?: { mode?: 'rules'|'heuristic'|'llm'|'hybrid'; llm?: LlmOpts }): Promise<ScanResult>
  llmAvailable(opts?: LlmOpts): Promise<{ ok: boolean; models?: string[]; hasModel?: boolean; error?: string }>
  llmClassifyHost(host: string, obs: { count: number; devices: number; ports: string[] }, opts?: LlmOpts): Promise<Classification | null>
  DEFAULT_LLM: { endpoint: string; model: string; timeoutMs: number }
}
declare const SalpiEngine: Engine
export default SalpiEngine
