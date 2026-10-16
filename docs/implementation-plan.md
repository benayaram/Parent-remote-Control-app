# Implementation plan

Repository inspection: empty unborn repository; no code, dependencies, CI, or agents to reuse. Branch: feature/familyguard-android. The attached specification is preserved in master-specification.md.

1. Phase 0: document capability boundaries, consent, architecture and test strategy before enforcement code.
2. Phase 1: Node 24/TypeScript/Express/Zod, Firebase verified parent authentication, MongoDB persistence, family isolation, expiring pairing and Keystore-bound child signatures; Flutter onboarding.
3. Phase 2: UsageEvents aggregation, partial app inventory, offline Room cache, policy schedules and dashboard analytics.
4. Phase 3: versioned policies, expiring idempotent command pull/ack, recent parent reauthentication, supported remote locking, extra-time requests.
5. Phase 4: opt-in location/SOS, explicit permission diagnostics; domain rule evaluator. VPN packet forwarding/geofences require further integration and will stay disabled until implemented.
6. Phase 5: device-owner-only suspension/uninstall APIs with emergency and system exemptions. Kiosk remains unavailable until emergency escape is verified on hardware.
7. Phase 6: authz/replay/TTL/deletion tests, static checks, device test checklist, demo video and push commits.

User override (2026-10-16): camera/microphone may be used ONLY for child-initiated, visible local check-ins with just-in-time permission, bounded duration, stop/delete, no remote activation, no background capture, no automatic upload. Parent cannot retrieve recordings. This supersedes only the original blanket camera/microphone exclusion. All other anti-surveillance restrictions remain.

Required release gates: both APK builds, Firebase/Mongo integration, actual Android permission/usage/admin tests, managed enrollment tests, manifest review. A browser demonstration is not evidence of Android enforcement. Missing gates remain explicit, not waived.

User clarification after initial phases: frontend remains Flutter, backend Node.js/MongoDB for text/structured records; Firebase Storage for images. Added explicit child-confirmed photo upload, private family access and 24h cleanup. This permits selected photo sharing but still prohibits remote activation, covert capture and voice upload.
