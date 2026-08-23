#!/bin/bash
# 살피 배포. app/ 을 빌드해서 Cloudflare Pages에 올린다.
# 터널(tunnel.sh)이 떠 있으면 그 주소를 llm-endpoint.txt로 함께 올려
# 배포 데모의 정밀 검사와 목적지 분류가 이 맥의 Kanana를 부르게 된다.
# 터널 주소가 바뀌면 이 스크립트만 다시 실행하면 된다. 페이지 주소는 불변.
set -e
cd "$(dirname "$0")/app"

[ -d node_modules ] || npm install
npm run build

TUNNEL=$(grep -oE "https://[a-z0-9-]+\.(lhr\.life|trycloudflare\.com)" /tmp/salpi-tunnel.log 2>/dev/null | tail -1)
if [ -n "$TUNNEL" ] && curl -s --max-time 5 "$TUNNEL/api/tags" >/dev/null 2>&1; then
  echo "$TUNNEL" > dist/llm-endpoint.txt
  echo "추론 터널 연결: $TUNNEL"
else
  rm -f dist/llm-endpoint.txt
  echo "터널 미연결. 배포 데모는 빠른 검사로 동작한다 (tunnel.sh 실행 후 재배포하면 AI 켜짐)"
fi

npx --yes wrangler pages deploy dist --project-name=salpi --branch=main --commit-dirty=true
