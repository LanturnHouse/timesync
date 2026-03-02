"""Utility to trigger webhooks when events occur."""

import hashlib
import hmac
import json
import logging

import requests

from .models import Webhook, WebhookLog

logger = logging.getLogger(__name__)


def trigger_webhooks(group_id: str, event_type: str, payload: dict):
    """Send webhook notifications to all active webhooks for a group."""
    webhooks = Webhook.objects.filter(
        group_id=group_id,
        is_active=True,
    )

    for webhook in webhooks:
        if event_type not in webhook.event_types:
            continue

        body = json.dumps(payload, default=str)
        headers = {"Content-Type": "application/json"}

        # Add HMAC signature if secret is set
        if webhook.secret:
            signature = hmac.new(
                webhook.secret.encode(),
                body.encode(),
                hashlib.sha256,
            ).hexdigest()
            headers["X-Webhook-Signature"] = f"sha256={signature}"

        try:
            resp = requests.post(
                webhook.url,
                data=body,
                headers=headers,
                timeout=10,
            )
            WebhookLog.objects.create(
                webhook=webhook,
                event_type=event_type,
                payload=payload,
                response_status=resp.status_code,
                response_body=resp.text[:2000],
                success=200 <= resp.status_code < 300,
            )
        except requests.RequestException as e:
            logger.warning("Webhook delivery failed: %s", e)
            WebhookLog.objects.create(
                webhook=webhook,
                event_type=event_type,
                payload=payload,
                response_status=None,
                response_body=str(e)[:2000],
                success=False,
            )
