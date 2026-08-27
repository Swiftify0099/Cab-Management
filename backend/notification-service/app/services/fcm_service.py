"""
FCM Push Notification Service — Production Implementation
Sends push notifications using raw FCM device tokens via Firebase HTTP v1 API.

Supports:
  - High-priority ride request alerts (with custom sound + vibration)
  - Standard informational push notifications
  - Both Android (FCM) and iOS (APNs via FCM) delivery
  - Data-only messages for ride requests (app handles display, works in background)

Token types:
  The Driver and Customer apps register raw FCM tokens obtained via
  expo-notifications getDevicePushTokenAsync().
  Tokens are stored in users.device_token.

Fixes:
  - channel_id was 'ride_requests' — corrected to 'ride-requests' to match the
    Android notification channel created by the driver app.
  - Delegates to common/utils/push.py which now handles raw FCM tokens correctly.
"""
from __future__ import annotations

import json
import os
from typing import Optional, Dict, Any

import httpx
import structlog

logger = structlog.get_logger(__name__)

# FCM HTTP v1 endpoint
FCM_API_URL = "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"

# Expo Push fallback
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _is_expo_token(token: str) -> bool:
    return token.startswith("ExponentPushToken") or token.startswith("ExpoPushToken")


def _is_fcm_token(token: str) -> bool:
    return token and not _is_expo_token(token) and len(token) > 50


async def _get_fcm_access_token() -> Optional[str]:
    """
    Obtain a short-lived OAuth2 access token from the Firebase service account.
    Returns None if credentials are not configured.
    """
    try:
        import google.auth
        import google.auth.transport.requests
        from google.oauth2 import service_account

        creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
        creds_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")

        if creds_json and creds_json.strip() not in ("{}", ""):
            info = json.loads(creds_json)
            credentials = service_account.Credentials.from_service_account_info(
                info,
                scopes=["https://www.googleapis.com/auth/firebase.messaging"],
            )
        elif creds_path and os.path.exists(creds_path):
            credentials = service_account.Credentials.from_service_account_file(
                creds_path,
                scopes=["https://www.googleapis.com/auth/firebase.messaging"],
            )
        else:
            return None

        request = google.auth.transport.requests.Request()
        credentials.refresh(request)
        return credentials.token

    except ImportError:
        logger.warning("google-auth not installed — FCM v1 API unavailable, using Expo Push fallback")
        return None
    except Exception as exc:
        logger.warning("Could not obtain FCM access token", error=str(exc))
        return None


async def send_push(
    device_token: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    priority: str = "high",
    sound: str = "default",
    channel_id: str = "ride-requests",
    data_only: bool = False,
) -> bool:
    """
    Send a push notification to a single device.

    Delegates to common/utils/push.py which correctly handles:
      - Raw FCM tokens (from getDevicePushTokenAsync)
      - ExponentPushToken format
      - FCM HTTP v1, FCM Legacy, Expo Push fallback paths

    Fixed: channel_id is now 'ride-requests' (was 'default'/'ride_requests')
    to match the Android notification channel created by the driver app.

    data_only=True: sends data-only FCM message. Android delivers these even
    when app is backgrounded. The app shows its own custom notification.
    """
    if not device_token:
        logger.debug("No device token — skipping push")
        return False

    try:
        from common.utils.push import send_push_notification
        return await send_push_notification(
            token=device_token,
            title=title,
            body=body,
            data=data,
            sound=sound,
            priority=priority,
            channel_id=channel_id,
            data_only=data_only,
        )
    except ImportError:
        pass

    data_str = {k: str(v) for k, v in (data or {}).items()}

    # Path 1: Expo Push API
    if _is_expo_token(device_token):
        return await _send_expo_push(device_token, title, body, data or {}, sound)

    # Path 2: FCM HTTP v1
    access_token = await _get_fcm_access_token()
    project_id = os.environ.get("FIREBASE_PROJECT_ID", "")

    if access_token and project_id:
        return await _send_fcm_v1(
            access_token=access_token,
            project_id=project_id,
            device_token=device_token,
            title=title,
            body=body,
            data=data_str,
            priority=priority,
            channel_id=channel_id,
        )

    # Path 3: FCM Legacy
    server_key = os.environ.get("FCM_SERVER_KEY", "")
    if server_key and _is_fcm_token(device_token):
        return await _send_fcm_legacy(server_key, device_token, title, body, data_str, priority, channel_id)

    # Fallback: Expo Push
    logger.warning("No FCM credentials — attempting Expo Push fallback", token_prefix=device_token[:10])
    return await _send_expo_push(device_token, title, body, data or {}, sound)


async def _send_fcm_v1(
    access_token: str,
    project_id: str,
    device_token: str,
    title: str,
    body: str,
    data: Dict[str, str],
    priority: str,
    channel_id: str,
) -> bool:
    url = FCM_API_URL.format(project_id=project_id)
    payload = {
        "message": {
            "token": device_token,
            "notification": {"title": title, "body": body},
            "data": data,
            "android": {
                "priority": "HIGH" if priority == "high" else "NORMAL",
                "notification": {
                    # Fixed: was 'ride_requests', must be 'ride-requests' to match app channel
                    "channel_id": channel_id,
                    "sound": "drsiran.mp3" if "ride" in channel_id else "default",
                    "default_vibrate_timings": False,
                    "vibrate_timings_nanos": ["0", "600000000", "300000000", "600000000"],
                    "notification_priority": "PRIORITY_MAX" if priority == "high" else "PRIORITY_DEFAULT",
                },
            },
            "apns": {
                "headers": {"apns-priority": "10" if priority == "high" else "5"},
                "payload": {
                    "aps": {
                        "sound": "drsiran.mp3" if "ride" in channel_id else "default",
                        "badge": 1,
                        "content-available": 1,
                    }
                },
            },
        }
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
        if resp.status_code == 200:
            logger.info("FCM v1 push sent", title=title, token_prefix=device_token[:10])
            return True
        else:
            logger.error("FCM v1 push failed", status=resp.status_code, body=resp.text[:200])
            return False
    except Exception as exc:
        logger.exception("FCM v1 HTTP error", error=str(exc))
        return False


async def _send_fcm_legacy(
    server_key: str,
    device_token: str,
    title: str,
    body: str,
    data: Dict[str, str],
    priority: str,
    channel_id: str,
) -> bool:
    payload = {
        "to": device_token,
        "priority": priority,
        "notification": {"title": title, "body": body, "sound": "drsiran.mp3" if "ride" in channel_id else "default"},
        "data": data,
        "android": {"channel_id": channel_id},
        "time_to_live": 300,
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                "https://fcm.googleapis.com/fcm/send",
                json=payload,
                headers={
                    "Authorization": f"key={server_key}",
                    "Content-Type": "application/json",
                },
            )
        if resp.status_code == 200:
            result = resp.json()
            if result.get("success") == 1:
                logger.info("FCM legacy push sent", title=title)
                return True
        logger.error("FCM legacy push failed", status=resp.status_code, body=resp.text[:200])
        return False
    except Exception as exc:
        logger.exception("FCM legacy HTTP error", error=str(exc))
        return False


async def _send_expo_push(
    token: str,
    title: str,
    body: str,
    data: Dict[str, Any],
    sound: str = "default",
) -> bool:
    payload = {"to": token, "title": title, "body": body, "data": data, "sound": sound}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(EXPO_PUSH_URL, json=payload)
        if resp.status_code == 200:
            logger.info("Expo push sent", title=title)
            return True
        logger.error("Expo push failed", status=resp.status_code, body=resp.text[:200])
        return False
    except Exception as exc:
        logger.exception("Expo push HTTP error", error=str(exc))
        return False
