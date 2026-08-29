GLOBAL EXECUTION RULE

This is an EXISTING production-grade project.

Do NOT create a parallel implementation.

Use the existing audited codebase.

For THIS PHASE ONLY:

1. Read the relevant audit findings.
2. Locate exact existing implementation.
3. Determine what is already working.
4. Keep correct code.
5. Repair broken/partial code.
6. Implement missing pieces only.
7. Run the actual application.
8. Execute the real business flow.
9. Verify the API request/response.
10. Verify actual PostgreSQL state.
11. Verify PostGIS where applicable.
12. Verify Redis where applicable.
13. Verify Socket.IO where applicable.
14. Verify FCM/APNs where applicable.
15. Verify Customer App result.
16. Verify Partner App result.
17. Test failure cases.
18. Test authorization/security.
19. Test concurrency where applicable.
20. Test Android/iOS lifecycle where applicable.
21. Run regression tests.
22. Document every change.

IMPORTANT:

Compilation success is NOT completion.

HTTP 200 is NOT completion.

Automated test PASS is NOT sufficient by itself.

A feature is COMPLETE only after the real business flow works
from Customer/Partner UI → API → Backend → Database → realtime/
notification → opposite application → final state.

NO production mock data.
NO fake customer.
NO fake Partner.
NO fake GPS.
NO fake fare.
NO fake earnings.
NO fake payment.
NO fake OTP.

Do not mark COMPLETE until:

END-TO-END = PASS
SECURITY = PASS
REGRESSION = PASS

Final status must be one of:

NOT_STARTED
AUDITING
PARTIAL
BROKEN
FIXED
TESTING
VERIFIED
REGRESSION_VERIFIED
COMPLETE

Every modified file must be documented with:
path, reason, change, API, DB, realtime, security, tests,
result.