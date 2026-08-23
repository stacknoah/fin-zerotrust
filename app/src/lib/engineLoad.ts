// engine.js는 루트의 UMD 엔진을 ESM으로 감싼 복사본. 루트 engine.js를 고치면 본문을 다시 복사한다
import SalpiEngine from './engine.js'
import type { Engine as EngineT } from './engine'
declare global { interface Window { SALPI_LLM_ENDPOINT?: string } }
export const Engine: EngineT = SalpiEngine as EngineT
