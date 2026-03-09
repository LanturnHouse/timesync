#!/bin/bash
# =============================================================
# TimeSync — 배포 스크립트
# VM에서 직접 실행하거나 Cloud Build에서 SSH로 호출됩니다.
# =============================================================
set -e

APP_DIR="/opt/timesync"
ENV_FILE="$APP_DIR/.env.production"

# --env-file 플래그로 .env.production의 변수를 compose 파일 내
# ${VAR} 치환(build.args 포함)에도 사용할 수 있게 합니다.
COMPOSE="docker compose -f $APP_DIR/docker-compose.prod.yml --env-file $ENV_FILE"

echo "=== [1/3] 이미지 빌드 ==="
cd "$APP_DIR"
$COMPOSE build --pull --no-cache

echo "=== [2/3] 컨테이너 시작 ==="
$COMPOSE up -d --remove-orphans

echo "=== [3/3] 상태 확인 ==="
sleep 5
$COMPOSE ps

echo ""
echo "✅ 배포 완료 — $(date)"
