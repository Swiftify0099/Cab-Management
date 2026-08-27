"""
Push Notification Dispatcher - Production Fix
==============================================
Supports ALL token types returned by expo-notifications:
  1. Raw FCM tokens  (from getDevicePushTokenAsync() -- the default in bare builds)
  2. ExponentPushToken[...] tokens (Expo managed builds / EAS)

PREVIOUS BUG (now fixed):
  The old implementation immediately returned False for any token that did
  not start with "ExponentPushToken", silently dropping 100% of native FCM
  tokens produced by getDevicePushTokenAsync().
"""
from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

import httpx
import structlog

logger = structlog.get_logger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
FCM_LEGACY_URL = "https://fcm.googleapis.com/fcm/send"
FCM_V1_URL = "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"


def _is_expo_token(token: str) -> bool:
    return token.startswith("ExponentPushToken") or token.startswith("ExpoPushToken")


def _is_raw_fcm_token(token: str) -> bool:
    return bool(token) and not _is_expo_token(token) and len(token) > 50


async def _get_fcm_v1_access_token() -> Optional[str]:
    try:
        from google.oauth2 import service_account
        import google.auth.transport.requests

        creds_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
        creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")

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
        return None
    except Exception as exc:
        logger.warning("FCM v1 access token error", error=str(exc))
        return None


async def _send_fcm_v1(token, title, body, data, priority="high", channel_id="ride-requests", data_only=False):
    access_token = await _get_fcm_v1_access_token()
    project_id = os.environ.get("FIREBASE_PROJECT_ID", "")
    if not access_token or not project_id:
        return False

    url = FCM_V1_URL.format(project_id=project_id)
    android_notif: dict = {} if data_only else {
        "notification": {
            "title": title,
            "body": body,
            "channel_id": channel_id,
            "sound": "drsiran.mp3" if "ride" in channel_id else "default",
            "notification_priority": "PRIORITY_MAX" if priority == "high" else "PRIORITY_DEFAULT",
        }
    }

    message: Dict[str, Any] = {
        "token": token,
        "data": data,
        "android": {
            "priority": "HIGH" if priority == "high" else "NORMAL",
            **android_notif,
        },
    }

    if not data_only:
        message["notification"] = {"title": title, "body": body}

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                url,
                json={"message": message},
                headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            )
        if resp.status_code == 200:
            logger.info("FCM v1 push sent", title=title, token_prefix=token[:10])
            return True
        logger.error("FCM v1 push failed", status=resp.status_code, body=resp.text[:300])
        return False
    except Exception as exc:
        logger.exception("FCM v1 HTTP error", error=str(exc))
        return False


async def _send_fcm_legacy(server_key, token, title, body, data, priority="high", channel_id="ride-requests", data_only=False):
    payload: Dict[str, Any] = {
        "to": token,
        "priority": priority,
        "data": data,
        "android": {"channel_id": channel_id},
        "time_to_live": 300,
    }

    if not data_only:
        payload["notification"] = {
            "title": title,
            "body": body,
            "sound": "drsiran.mp3" if "ride" in channel_id else "default",
            "android_channel_id": channel_id,
        }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                FCM_LEGACY_URL,
                json=payload,
                headers={"Authorization": f"key={server_key}", "Content-Type": "application/json"},
            )
        if resp.status_code == 200:
            result = resp.json()
            if result.get("success") == 1:
                logger.info("FCM legacy push sent", title=title, token_prefix=token[:10])
                return True
            logger.error("FCM legacy push rejected", results=str(result.get("results", [])))
            return False
        logger.error("FCM legacy push failed", status=resp.status_code, body=resp.text[:300])
        return False
    except Exception as exc:
        logger.exception("FCM legacy HTTP error", error=str(exc))
        return False


async def _send_expo_push(token, title, body, data, sound="default"):
    payload = {"to": token, "title": title, "body": body, "data": data, "sound": sound}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(EXPO_PUSH_URL, json=payload)
        if resp.status_code == 200:
            logger.info("Expo push sent", title=title)
            return True
        logger.error("Expo push failed", status=resp.status_code)
        return False
    except Exception as exc:
        logger.exception("Expo push HTTP error", error=str(exc))
        return False


async def send_push_notification(
    token: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    sound: str = "default",
    priority: str = "high",
    channel_id: str = "ride-requests",
    data_only: bool = False,
) -> bool:
    """
    Send a push notification. Handles raw FCM tokens AND ExponentPushToken format.

    data_only=True sends a data-only FCM message (no notification UI shown by FCM).
    The app's background handler processes it directly. Use for ride requests.
    """
    if not token:
        logger.debug("No device token -- skipping push")
        return False

    data_str = {k: str(v) for k, v in (data or {}).items()}

    if _is_expo_token(token):
        return await _send_expo_push(token, title, body, data or {}, sound)

    if _is_raw_fcm_token(token):
        # Try FCM HTTP v1 first
        v1_result = await _send_fcm_v1(token, title, body, data_str, priority, channel_id, data_only)
        if v1_result:
            return True

        # Try FCM Legacy
        server_key = os.environ.get("FCM_SERVER_KEY", "")
        if server_key:
            return await _send_fcm_legacy(server_key, token, title, body, data_str, priority, channel_id, data_only)

        logger.warning("No FCM credentials -- attempting Expo Push fallback for raw FCM token", token_prefix=token[:10])
        return await _send_expo_push(token, title, body, data or {}, sound)

    logger.warning("Unrecognized token format -- skipping", token_prefix=token[:10] if token else "EMPTY")
    return False


async def send_push_notifications_bulk(messages: List[Dict[str, Any]]) -> bool:
    if not messages:
        return False
    results = []
    for msg in messages:
        result = await send_push_notification(
            token=msg.get("to", ""),
            title=msg.get("title", ""),
            body=msg.get("body", ""),
            data=msg.get("data"),
            sound=msg.get("sound", "default"),
            priority=msg.get("priority", "high"),
            channel_id=msg.get("channel_id", "ride-requests"),
        )
        results.append(result)
    success_count = sum(1 for r in results if r)
    logger.info("Bulk push complete", total=len(messages), success=success_count)
    return success_count > 0
