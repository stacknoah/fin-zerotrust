# 살피 SALPI

금융권 망분리 경계 관제 콘솔. 전자금융감독규정 시행세칙 제2조의3의 예외 연결(외부기관, 원격접속, 재택근무, SaaS)을 승인 대장으로 관리하고, 방화벽 로그를 대장과 대조해 미승인 연결을 찾아낸다. 미승인 목적지 분류와 문서 내용 검사는 사내에서 도는 소형 모델 Kanana 2 3B가 맡는다.

데모: https://salpi.pages.dev

## 실행

```bash
cd app
npm install
npm run dev
```

http://localhost:5173 에서 열린다. AI 기능은 로컬 Ollama가 떠 있으면 자동으로 붙는다.

```bash
ollama pull hf.co/mradermacher/kanana-2-3b-instruct-GGUF:Q4_K_M
OLLAMA_ORIGINS="*" OLLAMA_HOST=0.0.0.0 ollama serve
```

## 배포

`./deploy.sh`가 app을 빌드해 Cloudflare Pages(salpi)에 올린다. 배포본에서도 AI를 쓰려면 먼저 `./tunnel.sh`로 로컬 Ollama를 여는 터널을 띄워둔다. deploy.sh가 터널 주소를 읽어 함께 싣는다.

## 구조

```
app/                    콘솔 (React, TypeScript, Vite, Tailwind, shadcn/ui)
app/src/lib/engine.js   탐지 엔진. 규칙, 식별정보, 결합의 3층 구조
extension/              크롬 확장 실험
eval/                   탐지 재현율 측정 스크립트
SPEC.md                 제품 명세
디자인-연구.md           디자인 레퍼런스 실측과 처방
```
