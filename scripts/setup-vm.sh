#!/bin/bash
# =============================================================
# TimeSync — VM 최초 설정 스크립트
# GCP Compute Engine (ubuntu-22.04)에서 1회 실행
# 사용법: bash setup-vm.sh <GITHUB_REPO_URL> <YOUR_EMAIL>
# 예시:   bash setup-vm.sh https://github.com/yourname/TimeSync you@example.com
# =============================================================
set -e

REPO_URL="${1:-https://github.com/yourname/TimeSync}"
EMAIL="${2:-admin@timesync.lanturn.info}"
DOMAIN="timesync.lanturn.info"
APP_DIR="/opt/timesync"

echo "=== [1/6] Docker & 의존성 설치 ==="
sudo apt-get update -y
sudo apt-get install -y docker.io docker-compose-plugin git certbot
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"

echo "=== [2/6] 코드 클론 ==="
sudo mkdir -p "$APP_DIR"
sudo chown "$USER:$USER" "$APP_DIR"
git clone "$REPO_URL" "$APP_DIR"

echo "=== [3/6] .env.production 생성 ==="
cp "$APP_DIR/.env.production.example" "$APP_DIR/.env.production"
echo ""
echo "⚠️  중요: 아래 파일을 편집하여 실제 값을 입력하세요:"
echo "    nano $APP_DIR/.env.production"
echo ""
echo "계속하려면 Enter를 누르세요 (나중에 편집해도 됩니다)..."
read -r

echo "=== [4/6] Let's Encrypt SSL 인증서 발급 ==="
echo "DNS A 레코드가 이 VM의 IP를 가리키고 있어야 합니다."
sudo certbot certonly --standalone \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive
echo "인증서 자동 갱신 크론 설정..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker compose -f $APP_DIR/docker-compose.prod.yml restart nginx") | crontab -

echo "=== [5/6] systemd 서비스 등록 (부팅 시 자동 시작) ==="
sudo tee /etc/systemd/system/timesync.service > /dev/null <<EOF
[Unit]
Description=TimeSync Docker Compose
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable timesync

echo "=== [6/6] 초기 배포 ==="
cd "$APP_DIR"
bash scripts/deploy.sh

echo ""
echo "✅ 설정 완료!"
echo "   서비스: https://$DOMAIN"
echo "   상태 확인: docker compose -f $APP_DIR/docker-compose.prod.yml ps"
