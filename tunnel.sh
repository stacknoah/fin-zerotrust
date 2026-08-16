#!/bin/bash
# 살피 추론 터널. 이 맥의 Ollama(11434)를 https 주소로 노출한다.
# 심사 기간에는 이 창을 켜둔 채로 둔다. 끄면 배포 데모가 빠른 검사로 강등된다.
set -e
curl -s --max-time 2 http://localhost:11434/api/tags >/dev/null || { echo "Ollama가 안 떠 있다: OLLAMA_ORIGINS=\"*\" OLLAMA_HOST=0.0.0.0 ollama serve"; exit 1; }
# 터널 도메인 Host가 붙은 요청을 Ollama가 거부하면(403) 터널이 무용지물이라 미리 확인
curl -s --max-time 2 -o /dev/null -w "%{http_code}" -H "Host: tunnel-check.lhr.life" http://127.0.0.1:11434/api/tags | grep -q 200 || { echo "Ollama가 터널 요청을 거부한다. OLLAMA_HOST=0.0.0.0 을 붙여 재기동 필요"; exit 1; }
echo "터널 시작. 아래에 https://…lhr.life 주소가 뜨면 ./deploy.sh 를 실행."
exec ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:127.0.0.1:11434 nokey@localhost.run 2>&1 | tee /tmp/salpi-tunnel.log
