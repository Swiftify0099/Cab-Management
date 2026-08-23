#!/usr/bin/env python3
"""
Feature 5 -- Negotiation / Own Fare Model: Smoke Test Suite
Tests static code contracts, API surface, socket events, and UI presence.
Run from: customer-app root
  python scripts/test_feature5_negotiation.py
"""

import os
import sys

# Windows console UTF-8 fix
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASS = []
FAIL = []
WARN = []


def check(name: str, condition: bool, warn_only: bool = False):
    if condition:
        PASS.append(name)
        print(f"  [PASS] {name}")
    elif warn_only:
        WARN.append(name)
        print(f"  [WARN] {name}")
    else:
        FAIL.append(name)
        print(f"  [FAIL] {name}")


def read(rel: str) -> str:
    path = os.path.join(BASE, rel)
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""


# -----------------------------------------------------------------------------
print("\n====================================================")
print("  Feature 5 -- Negotiation / Own Fare Model: Tests")
print("====================================================\n")

# -- A. API Client -------------------------------------------------------------
print("-- A. API Client (src/api/client.ts) --")
client = read("src/api/client.ts")

check("negotiationApi exported",                  "export const negotiationApi" in client)
check("getNegotiationState endpoint",             "getNegotiationState" in client)
check("acceptOffer endpoint",                     "acceptOffer" in client)
check("rejectOffer endpoint",                     "rejectOffer" in client)
check("acceptCounterOffer endpoint",              "acceptCounterOffer" in client)
check("rejectCounterOffer endpoint",              "rejectCounterOffer" in client)
check("fallbackToStandard endpoint",              "fallbackToStandard" in client)
check("cancelNegotiation endpoint",              "cancelNegotiation" in client)
check("rideApi has pricing_mode field",           "pricing_mode" in client)
check("rideApi has customer_offer_amount",        "customer_offer_amount" in client)
check("rideApi has negotiation_idempotency_key",  "negotiation_idempotency_key" in client)

# -- B. Socket Hook ------------------------------------------------------------
print("\n-- B. Socket Hook (src/hooks/useCustomerSocket.ts) --")
socket = read("src/hooks/useCustomerSocket.ts")

NEGOTIATION_EVENTS = [
    "NEGOTIATION_DRIVER_OFFER",
    "NEGOTIATION_OFFER_ACCEPTED",
    "NEGOTIATION_OFFER_REJECTED",
    "NEGOTIATION_OFFER_EXPIRED",
    "NEGOTIATION_SESSION_EXPIRED",
    "NEGOTIATION_ASSIGNED",
    "NEGOTIATION_FALLBACK",
]
for evt in NEGOTIATION_EVENTS:
    check(f"SocketEvent union has {evt}", f"| '{evt}'" in socket)

check("NegotiationDriverOfferPayload interface",    "NegotiationDriverOfferPayload" in socket)
check("NegotiationSessionExpiredPayload interface", "NegotiationSessionExpiredPayload" in socket)
check("NegotiationAssignedPayload interface",       "NegotiationAssignedPayload" in socket)
check("NegotiationFallbackPayload interface",       "NegotiationFallbackPayload" in socket)

check("socket.on NEGOTIATION_DRIVER_OFFER",    "socket.on('NEGOTIATION_DRIVER_OFFER'" in socket)
check("socket.on NEGOTIATION_SESSION_EXPIRED", "socket.on('NEGOTIATION_SESSION_EXPIRED'" in socket)
check("socket.on NEGOTIATION_ASSIGNED",        "socket.on('NEGOTIATION_ASSIGNED'" in socket)
check("socket.on NEGOTIATION_FALLBACK",        "socket.on('NEGOTIATION_FALLBACK'" in socket)

check("negotiationDriverOffer state field",      "negotiationDriverOffer" in socket)
check("negotiationAssigned state field",         "negotiationAssigned" in socket)
check("clearNegotiationAssigned exported",       "clearNegotiationAssigned" in socket)
check("clearNegotiationSessionExpired exported", "clearNegotiationSessionExpired" in socket)

# -- C. Negotiation Screen -----------------------------------------------------
print("\n-- C. Negotiation Screen (app/negotiation.tsx) --")
neg = read("app/negotiation.tsx")

check("useCustomerSocket imported",              "useCustomerSocket" in neg)
check("negotiationApi imported",                 "negotiationApi" in neg)
check("NegotiationDriverOfferPayload imported",  "NegotiationDriverOfferPayload" in neg)

check("joinTrip called for room management",     "joinTrip(rideRequestId)" in neg)
check("leaveTrip called on cleanup",             "leaveTrip(rideRequestId)" in neg)
check("getNegotiationState reconnect restore",   "getNegotiationState" in neg)

check("negotiationDriverOffer socket consumer",     "negotiationDriverOffer" in neg)
check("negotiationSessionExpired socket consumer",  "negotiationSessionExpired" in neg)
check("negotiationAssigned socket consumer",        "negotiationAssigned" in neg)
check("negotiationFallback socket consumer",        "negotiationFallback" in neg)

check("clearNegotiationDriverOffer called",     "clearNegotiationDriverOffer" in neg)
check("clearNegotiationAssigned called",        "clearNegotiationAssigned" in neg)

check("Per-offer expires_at countdown",         "useOfferExpiry" in neg)
check("isExpired disables Accept button",       "isExpired" in neg)

check("Counter-offer modal visible state",      "counterModalVisible" in neg)
check("Counter-offer accept handler",           "handleAcceptCounter" in neg)
check("Counter-offer reject handler",           "handleRejectCounter" in neg)
check("Counter fare comparison row",            "DRIVER COUNTER" in neg)

check("NEGOTIATION_ASSIGNED routes to /track",  "router.replace" in neg and "track" in neg)
check("Session expired banner rendered",        "sessionExpired" in neg)
check("Fallback to standard dispatch button",   "handleFallbackToStandard" in neg)
check("Cancel negotiation modal",               "cancelModalVisible" in neg)
check("cancelNegotiation API called",           "cancelNegotiation" in neg)

check("__DEV__ gate on simulated offers",       "__DEV__" in neg)
check("Radar animation still present",          "pulseAnim" in neg)
check("Timer color changes by urgency",         "timerColor" in neg)

# -- D. Booking Screen ---------------------------------------------------------
print("\n-- D. Booking Screen (app/book/cab.tsx) --")
cab = read("app/book/cab.tsx")

check("pricing_mode sent to createRequest",          "pricing_mode: pricingMode" in cab)
check("customer_offer_amount sent to createRequest", "customer_offer_amount:" in cab)
check("negotiation_idempotency_key in payload",      "negotiation_idempotency_key" in cab)
check("SCHEDULED guard auto-switches pricing mode",  "setPricingMode('STANDARD')" in cab)
check("Negotiate button dimmed when SCHEDULED",      "opacity: 0.4" in cab)
check("Alert when negotiate+scheduled selected",     "Fare negotiation cannot" in cab)

# -- E. Type Integrity ---------------------------------------------------------
print("\n-- E. Type Integrity --")
check("No duplicate DriverOfferItem export", neg.count("export interface DriverOfferItem") <= 1)
check("useCustomerSocket called exactly once", neg.count("useCustomerSocket()") == 1)

# -- F. Integration Contract ---------------------------------------------------
print("\n-- F. Integration Contract --")
check("negotiation.tsx routes /track after accept",    "/track" in neg)
check("negotiation.tsx routes /matching-waiting fallback", "/matching-waiting" in neg)
check("cab.tsx fallback also routes /matching-waiting", "matching-waiting" in cab)

# -- G. File Existence ---------------------------------------------------------
print("\n-- G. File Existence --")
files_required = [
    "app/negotiation.tsx",
    "src/api/client.ts",
    "src/hooks/useCustomerSocket.ts",
    "app/book/cab.tsx",
    "scripts/test_feature5_negotiation.py",
]
for f in files_required:
    path = os.path.join(BASE, f)
    check(f"File exists: {f}", os.path.isfile(path))

# -----------------------------------------------------------------------------
print("\n====================================================")
total = len(PASS) + len(FAIL) + len(WARN)
print(f"  Results: {len(PASS)} passed / {len(WARN)} warnings / {len(FAIL)} failed / {total} total")
print("====================================================\n")

if WARN:
    print("Warnings:")
    for w in WARN:
        print(f"  [WARN] {w}")

if FAIL:
    print("Failures:")
    for f in FAIL:
        print(f"  [FAIL] {f}")
    print()
    sys.exit(1)
else:
    print("[SUCCESS] All checks passed! Feature 5 Negotiation contracts are satisfied.\n")
    sys.exit(0)
