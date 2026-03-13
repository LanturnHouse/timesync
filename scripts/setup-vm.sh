#!/bin/bash
# =============================================================
# TimeSync — VM 최초 설정 스크립트 (Debian 12 기준)
# 사용법: bash setup-vm.sh <GITHUB_REPO_URL> <YOUR_EMAIL>
# 예시:   bash setup-vm.sh https://github.com/LanturnHouse/timesync.git admin@timesync.lanturn.info
# =============================================================
set -e

REPO_URL="${1:-https://github.com/LanturnHouse/timesync.git}"
EMAIL="${2:-admin@timesync.lanturn.info}"
DOMAIN="timesync.lanturn.info"
APP_DIR="/opt/timesync"
ENV_FILE="$APP_DIR/.env.production"
COMPOSE="docker compose -f $APP_DIR/docker-compose.prod.yml --env-file $ENV_FILE"

# ─────────────────────────────────────────────
echo "=== [1/6] Docker 설치 (공식 Docker Debian 저장소) ==="
# 기존 패키지 제거
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg git certbot

# Docker 공식 GPG 키 및 저장소 추가
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

echo "Docker 버전: $(docker --version)"
echo "Docker Compose 버전: $(docker compose version)"

# ─────────────────────────────────────────────
echo ""
echo "=== [2/6] 코드 클론 ==="
sudo mkdir -p "$APP_DIR"
sudo chown "$USER:$USER" "$APP_DIR"
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

# ─────────────────────────────────────────────
echo ""
echo "=== [3/6] .env.production 생성 ==="
cat > "$ENV_FILE" << 'ENVTEMPLATE'
POSTGRES_DB=timesync
POSTGRES_USER=timesync_user
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_HOST=db
POSTGRES_PORT=5432

REDIS_URL=redis://redis:6379/0

DJANGO_SECRET_KEY=CHANGE_ME
DJANGO_DEBUG=False
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_ALLOWED_HOSTS=timesync.lanturn.info,backend

GOOGLE_OAUTH_CLIENT_ID=CHANGE_ME
GOOGLE_OAUTH_CLIENT_SECRET=CHANGE_ME

NEXT_PUBLIC_API_URL=https://timesync.lanturn.info/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=CHANGE_ME
FRONTEND_URL=https://timesync.lanturn.info

ANTHROPIC_API_KEY=CHANGE_ME

TOSS_CLIENT_KEY=CHANGE_ME
TOSS_SECRET_KEY=CHANGE_ME
NEXT_PUBLIC_TOSS_CLIENT_KEY=CHANGE_ME

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=CHANGE_ME
EMAIL_HOST_PASSWORD=CHANGE_ME
DEFAULT_FROM_EMAIL=noreply@timesync.lanturn.info
ENVTEMPLATE

echo ""
echo "⚠️  .env.production 파일을 열어 실제 값으로 교체하세요 (CHANGE_ME 항목들)"
echo "    nano $ENV_FILE"
echo ""
echo "완료 후 Enter를 눌러 계속하세요..."
read -r

# ─────────────────────────────────────────────
echo ""
echo "=== [4/6] Let's Encrypt SSL 인증서 ==="
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "✓ SSL 인증서가 이미 존재합니다. 건너뜁니다."
else
  echo "신규 SSL 인증서를 발급합니다 (DNS A 레코드가 이 VM을 가리켜야 합니다)..."
  sudo certbot certonly --standalone \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --non-interactive
fi

# 자동 갱신 크론
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker compose -f $APP_DIR/docker-compose.prod.yml --env-file $ENV_FILE restart nginx") \
  | sort -u | crontab -

# ─────────────────────────────────────────────
echo ""
echo "=== [5/6] systemd 서비스 등록 ==="
sudo tee /etc/systemd/system/timesync.service > /dev/null << EOF
[Unit]
Description=TimeSync Docker Compose
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose -f $APP_DIR/docker-compose.prod.yml --env-file $ENV_FILE up -d
ExecStop=/usr/bin/docker compose -f $APP_DIR/docker-compose.prod.yml --env-file $ENV_FILE down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable timesync

# ─────────────────────────────────────────────
echo ""
echo "=== [6/6] 초기 배포 ==="
bash "$APP_DIR/scripts/deploy.sh"

echo ""
echo "✅ 설정 완료!"
echo "   서비스: https://$DOMAIN"
echo "   상태 확인: $COMPOSE ps"
echo "   로그 확인: $COMPOSE logs -f"
