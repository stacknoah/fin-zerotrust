// engine.js는 UMD다. 번들러는 CommonJS로 읽어 기본 내보내기로 주고, 브라우저에서 그대로 열면 window.SalpiEngine에 붙는다
import SalpiEngine from './engine.js'
import type { Engine as EngineT } from './engine'
declare global { interface Window { SalpiEngine?: EngineT; SALPI_LLM_ENDPOINT?: string } }
export const Engine: EngineT = (SalpiEngine as EngineT) || window.SalpiEngine!
