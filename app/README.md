# 살피 콘솔 (app)

React, TypeScript, Vite, Tailwind v4, shadcn/ui. 탐지 엔진은 저장소 루트의 engine.js를 그대로 쓴다(src/lib/engine.js 복사본).

```
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
```

배포는 저장소 루트의 deploy.sh. 추론 서버 주소는 public 경로의 llm-endpoint.txt 또는 ?llm= 파라미터로 주입한다.
