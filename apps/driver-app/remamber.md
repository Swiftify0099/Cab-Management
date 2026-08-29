PHASE EXECUTION CONTROLLER — STRICT REAL-WORLD VERIFICATION MODE

You are continuing an EXISTING production-grade React Native
Customer App + Partner App + FastAPI Backend system.

A previous audit/report claims that several phases are already
implemented and passed automated tests.

DO NOT TRUST THE REPORT BLINDLY.

The previous report is evidence of intended implementation,
not proof of current runtime correctness.

Your job is to VERIFY the current actual repository and runtime state.

========================================================
CORE RULE
========================================================

For the CURRENT PHASE ONLY:

1. Read the existing phase report.
2. Inspect the actual code.
3. Inspect the actual API.
4. Inspect the actual database schema/data.
5. Inspect the actual Socket.IO implementation.
6. Inspect Redis where relevant.
7. Inspect FCM/APNs where relevant.
8. Inspect React Native screen/state implementation.
9. Run the application.
10. Execute the real user flow.
11. Observe the actual result.
12. Trace the backend.
13. Verify database mutation.
14. Verify realtime event.
15. Verify notification if applicable.
16. Verify Customer side.
17. Verify Partner side.
18. Verify security.
19. Verify failure cases.
20. Fix defects.
21. Retest.
22. Regression test.
23. Only then mark the phase.

========================================================
VERY IMPORTANT
========================================================

"0 compile errors" ≠ complete.

"HTTP 200" ≠ complete.

"Automated test PASS" ≠ complete.

"Screen renders" ≠ complete.

"Mock test passed" ≠ complete.

The only valid completion proof is:

REAL UI ACTION
↓
REAL API
↓
REAL BACKEND
↓
REAL DATABASE
↓
REAL SERVICE LOGIC
↓
REAL CUSTOMER/PARTNER STATE
↓
REAL SOCKET/NOTIFICATION
↓
REAL USER-VISIBLE RESULT
↓
REAL ERROR TEST
↓
REAL SECURITY TEST
↓
REGRESSION TEST

========================================================
BEFORE IMPLEMENTING
========================================================

Create:

PHASE:
FEATURE:

PREVIOUS REPORT CLAIM:
...

ACTUAL REPOSITORY STATUS:
...

ACTUAL RUNTIME STATUS:
...

DIFFERENCE BETWEEN REPORT AND REALITY:
...

Do not implement anything until this comparison is complete.

========================================================
FIELD-LEVEL VERIFICATION
========================================================

For every UI field verify:

UI field
↓
state variable
↓
API payload
↓
FastAPI schema
↓
backend validation
↓
database column
↓
business logic
↓
response
↓
UI rendering

Check exact:

- field name
- type
- required/optional
- enum
- validation
- default
- nullability
- ID relationship

Any mismatch must be documented and fixed.

========================================================
CUSTOMER ↔ PARTNER VERIFICATION
========================================================

For every Customer action trace:

Customer
↓
Request
↓
Backend
↓
Database
↓
Eligibility
↓
Matching
↓
Partner
↓
Accept/Reject
↓
Assignment/State
↓
Customer Update

Verify this with actual execution.

========================================================
REAL DATABASE VERIFICATION
========================================================

Do not infer database state from UI.

After each important operation:

READ ACTUAL DATABASE STATE.

Example:

Customer creates ride.

Verify:

request exists
customer_id correct
service_type correct
pickup correct
drop correct
status correct
timestamps correct
offer records correct

After Partner accepts:

Verify:

assignment exists
request state changed
offer state changed
losing offers changed
financial relationships unchanged/correct

========================================================
REALTIME VERIFICATION
========================================================

For Socket.IO features verify:

connection
authentication
room
event producer
event consumer
payload
state update
UI update
deduplication
reconnect
recovery

Do not mark Socket.IO complete merely because:
"socket connected".

========================================================
NOTIFICATION VERIFICATION
========================================================

Where notifications are required test:

foreground
background
another app
screen locked
reopen
notification action
deep link
pending recovery

Do not rely solely on Socket.IO.

========================================================
NO MOCK PRODUCTION DATA
========================================================

Production paths must not use:

fake Customer
fake Partner
fake vehicle
fake GPS
fake request
fake fare
fake earnings
fake commission
fake payment
fake OTP
fake history

Developer/test harness may exist only in isolated development/staging.

========================================================
FAILURE-FIRST TESTING
========================================================

For this phase intentionally test:

network timeout
API 500
socket disconnect
notification failure
invalid input
expired request
duplicate request
duplicate action
unauthorized action
concurrent action
app restart

The system must fail safely.

========================================================
ROOT CAUSE RULE
========================================================

If something fails:

DO NOT immediately patch the UI.

Determine:

SYMPTOM
↓
FAILING LAYER
↓
ROOT CAUSE
↓
FIX
↓
RETEST
↓
REGRESSION

========================================================
COMPLETION STATUS
========================================================

Use only:

NOT_STARTED
AUDITING
PARTIAL
BROKEN
BLOCKED
FIXED
TESTING
VERIFIED
REGRESSION_VERIFIED
COMPLETE

Do not use COMPLETE until:

REAL END-TO-END = PASS
AND
SECURITY = PASS
AND
REGRESSION = PASS

========================================================
MANDATORY FINAL REPORT
========================================================

PHASE:
FEATURE:

PREVIOUS REPORT CLAIM:
...

ACTUAL STATUS:
...

EXISTING CODE:
KEEP / REPAIR / REFACTOR / REBUILD

CUSTOMER APP:
...

PARTNER APP:
...

BACKEND:
...

DATABASE:
...

POSTGIS:
...

REDIS:
...

SOCKET.IO:
...

FCM/APNs:
...

CLOUDINARY:
...

SECURITY:
PASS / FAIL

REAL DEVICE:
PASS / FAIL / NOT_TESTED

END-TO-END:
PASS / FAIL

REGRESSION:
PASS / FAIL

FILES INSPECTED:
...

FILES CHANGED:
...

API TESTS:
...

DATABASE TESTS:
...

REAL FLOW EXECUTED:
...

BUGS FOUND:
...

ROOT CAUSE:
...

FIX:
...

RETEST:
...

REMAINING BLOCKERS:
...

FINAL STATUS:
...

========================================================
DO NOT START THE NEXT PHASE
========================================================

Do not begin the next phase until this phase reaches:

REGRESSION_VERIFIED

my backend store in this locaation CabBooking\apps\driver-app>
PS C:\Users\panka\OneDrive\Desktop\CabBooking\backend 