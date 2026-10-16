# FamilyGuard — Codex Master Build Prompt

> **Purpose:** Give this entire document to Codex as the authoritative implementation brief. Build an Android-only, consent-based parental supervision platform with a Flutter parent app, Flutter child app with native Kotlin modules, and Node.js backend. **Do not implement any camera or microphone access, capture, streaming, recording, or remote activation.** Do not add covert surveillance capabilities.

## 0. Your role and working rules

Act as lead Android engineer, Flutter engineer, backend engineer, security architect, QA engineer, and technical writer. First inspect the existing repository and reuse sound existing code; do not overwrite working functionality without reason. If no repository exists, scaffold the monorepo described below. Work in small, testable commits on a feature branch named `feature/familyguard-android` when Git is available. Before coding, generate `docs/implementation-plan.md` and `docs/capability-matrix.md`. Then implement incrementally. Never claim a feature is operational unless tested on an actual eligible Android device. Mark unsupported capabilities clearly in UI and docs. Do not bypass Android permissions, enrollment requirements, platform security, or Google Play policies.

**Non-negotiable scope:** Android only. Two apps: Parent and Child. Transparent family supervision with verified parent authorization and child-facing notice. No camera, microphone, private chat interception, keystroke capture, SMS/call log scraping, stealth mode, hidden recording, or credential harvesting. No `CAMERA`, `RECORD_AUDIO`, or related capture permission in either app; audit merged manifests and transitive dependencies. Do not collect sensitive information unnecessarily. Maintain emergency calling and SOS even during restrictions.

## 1. Project outcomes

Build a production-oriented MVP and expandable architecture for:
1. Secure parent registration, sign-in, family membership and child device enrollment.
2. Screen-time reporting and time-limit notifications.
3. Installed app visibility within Android package visibility rules.
4. App-specific schedules and best-effort restrictions in standard mode; strict app suspension only when a supported managed-device policy permits it.
5. Authorized remote screen locking using eligible Android device-admin/device-owner capabilities, with honest UX.
6. Kiosk/study-only mode **only** on correctly provisioned, eligible managed devices.
7. Website filtering through user-approved DNS/VPN methods, with explicit limitations and bypass indicators.
8. Location sharing and geofences with appropriate permissions and visible status.
9. Tamper/permission-revocation detection; uninstall prevention **only where supported in managed-device mode**.
10. Secure notifications, remote command delivery, reports, safety tools and privacy controls.

**Two operating modes:**
- **Standard Family Mode:** Existing consumer Android device. Usage stats, app information permitted by Android, usage warnings, schedules, location with permission, website filtering with explicit VPN approval, and limited enforcement. Do not mislabel overlay/accessibility workarounds as strict OS app blocking. Never silently grant special permissions.
- **Managed Child Device Mode:** Dedicated eligible device provisioned using supported Android Enterprise/device-owner or other legitimate device-management flow. Add policy-backed suspension, lock-task/kiosk, stronger restrictions and uninstall protection **only after confirming API and provisioning eligibility**. Document ownership, factory-reset/setup implications, and policy/legal suitability; do not assume any regular family phone can be converted in place.

## 2. Feature catalog with acceptance criteria

### A. Authentication and family setup
- Firebase Authentication: email/password, optional Google sign-in; verified email, password reset, session handling.
- Family records; primary parent and optional co-parent roles; least-privilege authorization.
- Pair child device with expiring one-time code/QR, authenticated parent confirmation and child-visible disclosure; device-bound keypair; prevent arbitrary remote enrollment.
- Multiple children/devices; device name, OS/API level, manufacturer, app version, last seen, management mode, capabilities.
- Unpair, recover, revoke, delete; parental reauthentication for high-impact commands.
- **Done when:** unrelated parents cannot access a device; expired/reused codes fail; revocation stops further commands.

### B. Screen-time reporting
- Kotlin `UsageStatsManager`/`UsageEvents` with user-enabled Usage Access (`PACKAGE_USAGE_STATS` app-op; not ordinary runtime permission).
- Aggregate foreground usage by app, day and week; show timezone, sampling gaps, last sync and confidence limitations.
- App-level and overall usage budgets; weekday/weekend/holiday rules; warnings at configurable thresholds.
- Local notification when time is nearly exhausted; requests for extra time; parent approval, expiration and audit.
- Continue computing against cached policies offline. Define midnight rollover, clock changes, device restarts and daylight-saving behavior.
- **Done when:** reports reconcile against device observations in test cases; offline rules persist; warnings do not imply impossible hard blocking.

### C. Installed app visibility
- Display only installed packages that the app can lawfully and technically query. Use narrowly scoped `<queries>` declarations where practical; avoid `QUERY_ALL_PACKAGES` unless a justified core use case meets Play policy and approval requirements.
- Show app label, icon, package identifier, version when available, allowed/restricted classification and last usage when accessible.
- Detect eligible installation changes via supported Android mechanisms, while handling package visibility restrictions.
- **Done when:** UI indicates partial inventory and does not assert completeness when Android hides packages.

### D. App limits and strict blocking
- Standard mode: configurable limits and reminders, child-facing rule screen, optional compliant user-initiated focus flows. No unsupported claims of guaranteed third-party app suspension.
- Managed mode: investigate and implement eligible `DevicePolicyManager` policies (e.g. package suspension where permitted), exemptions for dialer, emergency, accessibility necessities and system components.
- Rules: per-app time budgets, school hours, bedtime, allowlist and override request; parent receives execution acknowledgements.
- **Done when:** each rule reports `supported`, `unsupported`, `permission_required`, `pending`, `applied`, or `failed` based on real enforcement result.

### E. Remote screen lock
- Only offer when device admin or managed-device role actually supports `DevicePolicyManager.lockNow()` and required admin setup has been completed.
- Child device receives authenticated command, validates device/policy, invokes API, reports result. If unavailable, disable action with explanation.
- Do not implement bypass of system lock screen or remotely unlock the phone.
- **Done when:** lock action is tested on enrolled hardware; errors and delayed commands are visible.

### F. Kiosk / study-only mode
- Managed-device-only feature using eligible lock-task/device policy APIs and explicit provisioning.
- Parent chooses approved study apps; maintain emergency escape path and OS-required affordances; test power/reboot and accessibility.
- Do not use consumer overlays or accessibility abuse to simulate secure kiosk.
- **Done when:** only eligible devices show toggle; actual managed device passes start/stop/reboot tests.

### G. Website and internet safety
- Optional user-approved `VpnService`-based local DNS/domain filtering or policy-compatible DNS configuration; disclose VPN notification, VPN conflicts and limitations.
- Domain denylist/allowlist, family-safe DNS resolver integration where appropriate, study-mode allowlist, filter status and rule sync.
- Explain limits: encrypted DNS, ECH/HTTPS, browser/app-specific transports, VPN conflicts, cellular changes and circumvention; cannot promise visibility into full HTTPS URLs or messages.
- No TLS interception, certificate installation, decryption of private messages, or secret traffic collection.
- **Done when:** test domains are blocked under supported configurations, and bypass/offline behavior is reported accurately.

### H. Location and geofences
- Opt-in location sharing with runtime fine/coarse location consent; background location only when genuinely needed, separately requested and policy-approved.
- Current/last-known location, accuracy radius, timestamp, geofence arrival/departure, home/school safe zones, battery-aware update frequency.
- SOS button: child-triggered alert, location if permitted, and direct emergency contact/call option. Do not imply backend delivery is guaranteed.
- Short location retention by default, configurable deletion, and visibility to authorized family members only.
- **Done when:** permission-denied state is graceful, location timestamps are honest, and geofence transitions are tested on device.

### I. Uninstall/tamper/permission monitoring
- Detect loss of usage access, VPN approval, notification permission, location permission, background execution eligibility and stale heartbeat where detectable.
- Explain that standard consumer mode cannot guarantee uninstall prevention or immediate alert after uninstall/offline shutdown.
- Managed-device-only uninstall blocking when relevant policy and ownership permit it; document recovery/unprovisioning.
- **Done when:** revocation and offline status are accurately labeled, not treated as proof of malicious action.

### J. Dashboard, alerts and reporting
- Parent home: child cards, last sync, screen time today, top apps, active rules, location timestamp, battery if legitimately available, device mode/capability badges.
- Charts: daily/weekly usage, limit exceedances, approval history and website filter health (aggregate only).
- FCM alerts: extra-time request, SOS, location/geofence, permission revoked, device offline, command success/failure.
- Export CSV/PDF only if useful; enforce retention and data minimization. AI insights are optional and must use aggregate non-sensitive data, with no paid API required.

### K. Child experience and safeguards
- Clear supervision disclosure and persistent visible status as applicable; understandable rules and remaining time.
- Ask-for-time flow, study schedule, SOS, trusted contacts, privacy information, and safe supervision removal/escalation flow.
- Never disable emergency dialer or critical device functions; avoid interfering with accessibility services.

## 3. Feasibility and capability matrix

Create `docs/capability-matrix.md` and maintain a versioned matrix per Android API level, manufacturer/device, mode, enrollment, permission and tested result.

| Capability | Standard mode | Managed mode | Implementation note |
|---|---|---|---|
| Screen-time reporting | Yes, with usage access | Yes, subject to access | `UsageStatsManager` |
| Installed app visibility | Partial/limited | Potentially broader, still verify | Package visibility |
| Time-limit notifications | Yes, with notification permission where required | Yes | Local notifications |
| Strict app blocking | Not guaranteed | Eligible policy-backed controls | `DevicePolicyManager` |
| Remote screen lock | Eligible active admin only | Eligible management role | `lockNow()` |
| Kiosk/study-only | No guaranteed secure kiosk | Eligible lock-task policy | Lock task APIs |
| Website filtering | User-approved VPN/DNS, limited | Additional policy options possible | `VpnService` |
| Location/geofences | Permission-dependent | Permission/policy-dependent | Fused/location APIs |
| Uninstall prevention | No guarantee | Eligible managed-device policy | DPM |
| Camera/microphone access | **Excluded** | **Excluded** | No permissions or code |

Do not conflate active legacy device admin with device owner: device admin may enable locking but not the full set of managed-device restrictions. Check current official Android and Play documentation during implementation, and record exact source links and access dates in `docs/platform-research.md`.

## 4. Architecture

```text
Parent Flutter App -- HTTPS + Firebase Auth --> Node.js/Express API
             |                                    |
             |                              MongoDB Atlas
             |                                    |
             +<-- FCM alerts -- Firebase Admin ----+
                                                  |
                                Command queue / policy versions
                                                  |
                                FCM wake-up + HTTPS pull/ack
                                                  |
                             Child Flutter + Kotlin App
                             | UsageStats / local scheduler
                             | DevicePolicy (when eligible)
                             | VPN/DNS filter (if approved)
                             | Location / geofencing
                             + Room encrypted local policy cache
```

- **Server is authority** for family membership, commands, policy versions, permissions and audit.
- **Child device is enforcement point** for permitted local policies, including offline behavior.
- **FCM is a hint/wakeup**, not guaranteed command transport. Device fetches commands over HTTPS, acknowledges outcome and deduplicates by command ID.
- Prefer polling/backoff and WorkManager for resilient synchronization. Do not depend on permanent WebSocket connections or exact background execution.
- Separate API interfaces from platform adapters so each feature can report its capabilities.

## 5. Stack and repository layout

- Flutter/Dart for parent and child interfaces; Riverpod or Bloc for state; go_router; Dio; Material 3.
- Kotlin Android platform channels or a maintained Flutter plugin module for native functionality.
- Node.js LTS + TypeScript + Express + Zod validation + Firebase Admin SDK.
- MongoDB/Mongoose with indexes, TTL for short-lived tokens and retention records.
- Firebase Auth + FCM. Local Room for offline policy, usage aggregates and queued acknowledgements; use Android Keystore for sensitive local keys.
- GitHub Actions for static checks and tests; no paid services required for prototype.

```text
familyguard/
  apps/parent_app/
  apps/child_app/
    android/app/src/main/kotlin/.../usage/
    android/app/src/main/kotlin/.../policy/
    android/app/src/main/kotlin/.../filtering/
    android/app/src/main/kotlin/.../location/
    android/app/src/main/kotlin/.../management/
  backend/src/
    auth/ families/ devices/ policies/ commands/
    usage/ location/ alerts/ audit/ common/
  packages/shared_contracts/
  docs/
    prd.md
    architecture.md
    implementation-plan.md
    capability-matrix.md
    permissions.md
    security-threat-model.md
    api.md
    deployment.md
    platform-research.md
    test-plan.md
  .github/workflows/
  README.md
```

## 6. Database schema and API contracts

Collections: `users`, `families`, `family_memberships`, `children`, `devices`, `pairing_sessions`, `device_capabilities`, `policies`, `usage_summaries`, `geofences`, `location_samples`, `commands`, `command_acknowledgements`, `alerts`, `audit_events`, `deletion_requests`.

Required fields:
- `users`: `firebaseUid`, `createdAt`, `status`.
- `families`: `id`, `createdBy`, `createdAt`.
- `family_memberships`: `familyId`, `uid`, `role`, `verifiedAt`, `revokedAt`.
- `devices`: `id`, `childId`, `familyId`, `publicKey`, `androidApi`, `manufacturer`, `managementMode`, `capabilities`, `lastSeenAt`, `revokedAt`.
- `policies`: `deviceId`, `version`, `timezone`, `dailyMinutes`, `appRules`, `studyWindows`, `bedtimeWindows`, `webRules`, `updatedBy`, `updatedAt`.
- `commands`: `id`, `deviceId`, `familyId`, `type`, `payload`, `issuedBy`, `issuedAt`, `expiresAt`, `status`, `result`, `idempotencyKey`.
- `usage_summaries`: `deviceId`, `localDate`, `timezone`, `packageName`, `foregroundSeconds`, `sourceQuality`, `syncedAt`.
- `location_samples`: `deviceId`, `lat`, `lng`, `accuracyMeters`, `capturedAt`, `expiresAt`.
- `audit_events`: `actorUid`, `familyId`, `action`, `targetId`, `result`, `createdAt`.

Endpoints (versioned `/api/v1`):
- `POST /families`, `GET /families/:id`, `POST /families/:id/invitations`
- `POST /pairing/sessions`, `POST /pairing/confirm`, `POST /devices/:id/revoke`
- `GET /devices/:id`, `GET /devices/:id/capabilities`, `POST /devices/:id/heartbeat`
- `GET /devices/:id/policy`, `PUT /devices/:id/policy`
- `POST /devices/:id/commands`, `GET /devices/:id/commands`, `POST /commands/:id/ack`
- `POST /devices/:id/usage`, `GET /devices/:id/usage`
- `POST /devices/:id/location`, `GET /devices/:id/location`
- `POST /devices/:id/sos`, `GET /families/:id/alerts`
- `POST /devices/:id/time-requests`, `POST /time-requests/:id/decision`
- `POST /families/:id/export`, `DELETE /families/:id/data`

For every endpoint, implement Firebase ID-token verification, server-side family membership and role authorization, device-bound auth for child ingestion, input validation, rate limiting, request IDs, safe errors and audit logs. Do not trust `familyId`, `role` or `deviceId` from client input without verifying relationships.

Command statuses: `pending`, `delivered`, `acknowledged`, `applied`, `unsupported`, `permission_required`, `failed`, `expired`, `cancelled`. Include capability checks and TTL. Never report `applied` based only on FCM delivery.

## 7. Android permissions and policy

Request only when relevant and just in time. Explain why before opening Settings/runtime dialogs. Design UI for denial and revocation.

- Usage access: `PACKAGE_USAGE_STATS` app-op via Settings; verify `AppOpsManager`/API state.
- App inventory: narrowly scoped manifest `<queries>`; `QUERY_ALL_PACKAGES` only if demonstrably necessary and Play-approved.
- Location: `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`; `ACCESS_BACKGROUND_LOCATION` only if essential and approved, separately disclosed.
- Notifications: `POST_NOTIFICATIONS` on Android 13+.
- Foreground services: declare only valid foreground service types and associated Android-version-specific permissions.
- VPN: `VpnService` with explicit user consent and ongoing disclosure.
- Device administration: declared `DeviceAdminReceiver` and required metadata **only** for legitimately supported lock functionality; device owner provisioning separately.
- Boot receiver: use only for permitted reinitialization; respect Android background limits.
- Battery: do not coerce disabling power optimizations or circumvent restrictions.
- **Explicitly prohibited:** `CAMERA`, `RECORD_AUDIO`, audio capture, video capture, screenshots, MediaProjection, covert screen monitoring, SMS/call-log scraping, notification-content spying, password capture, hidden location tracking, arbitrary shell/root commands, evasion of uninstall/system security.

Produce `docs/permissions.md` mapping each permission to feature, Android version, user-facing rationale, revocation behavior and Google Play policy implications. Validate final merged manifests for both applications and check third-party dependencies.

## 8. UI screens

**Parent app:** Splash; Onboarding; Sign in/up; Family creation; Pair device QR/code; Children list; Child dashboard; Screen-time charts; Installed apps and visibility limitations; App limits; Bedtime/school schedule; Remote actions with capability/status explanation; Study kiosk settings (managed only); Web filtering and VPN status; Location map/geofences; Alerts/SOS; Time approval inbox; Reports; Device capabilities/permissions; Co-parent management; Privacy/export/delete; Settings.

**Child app:** Introduction and supervision disclosure; Pairing confirmation; Permission walkthrough; Monitoring status; Today’s usage; Rules and schedule; Time remaining; Extra-time request; Approved/denied request status; SOS and emergency contacts; Privacy/data details; Device capability diagnostics; Safe unlink/supervision-removal flow.

Design accessible Material 3 layouts, dark/light themes, loading/error/empty states, low-connectivity indicators and explicit status timestamps. Do not render a disabled capability as a working button.

## 9. Security and privacy engineering

- Threat-model unauthorized parent account access, pairing hijack, replayed commands, stolen tokens, malicious device reports, location leakage, backend compromise and domestic abuse/misuse.
- Short-lived pairing codes; device keypairs in Android Keystore; TLS everywhere; refresh/revocation strategy.
- Reauthenticate before high-impact actions. Record who issued them, when, and outcome.
- Minimal location history (e.g. default 24–72 hours, configurable), aggregate usage retention (e.g. 30 days), TTL deletion; make these configurable and document actual behavior.
- Secure backups; do not log tokens, full location payloads or personal secrets.
- Explicit disclosure, user-visible supervision, guardian authorization, age-appropriate notices, consent/legal review for jurisdictions served.
- Privacy policy, Play Data Safety, monitoring-app declaration (`isMonitoringTool` with appropriate classification where required), foreground service and background location declarations as applicable.
- Emergency calls, SOS and essential accessibility must never be blocked by policy.

## 10. Zero-extra-cost deployment plan

- Local dev: Android Studio, Flutter, Node.js, local MongoDB or Atlas free cluster, Firebase Spark.
- Firebase Auth + FCM no-cost tiers subject to current quotas and provider requirements.
- MongoDB Atlas free cluster subject to limits.
- Render free backend **if currently available**; free services may sleep, so remote commands and SOS are not guaranteed timely. Verify current terms and pricing before choosing.
- OpenStreetMap data can be used, but public tile servers are not an unlimited free production tile CDN; follow tile usage policy or select compliant provider.
- Cloudinary not needed for MVP; no video/audio assets.
- Never claim 24/7 dependable emergency operation on sleeping/free backend. Display delivery status and provide direct emergency call path.
- Keep secrets in environment variables; provide `.env.example`, Firebase configuration instructions and deployment walkthrough. Never commit secrets.

## 11. Development phases and deliverables

**Phase 0 — Research & feasibility:** official Android API / Google Play documentation review; capability matrix by API level/mode; security threat model; consent flow. Deliver docs before writing enforcement code.

**Phase 1 — Foundation:** monorepo, shared contracts, CI, Firebase Auth, family memberships, backend skeleton, MongoDB schemas, parent/child onboarding and secure pairing.

**Phase 2 — Usage analytics:** native Kotlin usage adapter, usage access walkthrough, local aggregation, upload, parent charts, schedule model, time-limit notifications and offline cache.

**Phase 3 — Remote policies:** versioned policies, command queue, FCM wake-up, pull/ack, time requests, error handling, permission status, remote lock on eligible admin devices.

**Phase 4 — Safety:** location consent, geofences, SOS/direct call, notifications, VPN/DNS prototype, filter health and limitations.

**Phase 5 — Managed mode:** separate provisioning guide and hardware test harness; eligible strict app suspension, lock-task study mode, uninstall controls. Never enable without validated ownership/role.

**Phase 6 — Hardening and release:** unit/widget/integration tests, Android real-device tests, authz tests, privacy deletion, manifest audit, policy review, closed beta docs, troubleshooting and deployment.

After each phase: run formatting, static analysis, unit tests and relevant integration tests; report completed functionality, untested hardware-dependent features, limitations and exact next steps.

## 12. Test and acceptance matrix

Minimum tests:
1. Pairing code expires; duplicate/replay pairing rejected; unauthorized parent blocked.
2. Usage permission denied/granted/revoked with truthful UI and reports.
3. Package visibility incomplete on newer Android versions; UI says so.
4. Daily screen-time aggregation, timezone/midnight and offline/reboot cases.
5. Time-limit notification and extra-time approval workflow.
6. Standard-mode strict blocking marked unsupported if not truly enforceable.
7. Device admin remote lock tested only with authorized active admin; failures acknowledged.
8. Managed kiosk and app suspension tested on legitimately provisioned device; emergency exceptions remain available.
9. VPN filtering and VPN conflict/bypass behavior reported accurately.
10. Background location denied and geofence delivery delayed cases handled.
11. Device offline, FCM delayed, command duplicate/expired, stale heartbeat.
12. Uninstall/permission revocation behavior does not claim impossible guarantees.
13. SOS direct-call path available even with no internet; delivery status shown.
14. Data export/deletion and family isolation verified.
15. **Both merged Android manifests contain no camera or microphone permission; source and dependencies contain no camera/microphone capture implementation.**
16. No secret monitoring, SMS interception, private chat access, screenshots or covert capture.

## 13. Codex execution instructions

1. Inspect the repository; summarize reusable modules, existing dependencies and conflicts.
2. Write `docs/prd.md`, `docs/architecture.md`, `docs/capability-matrix.md`, `docs/permissions.md`, `docs/security-threat-model.md`, `docs/api.md`, `docs/implementation-plan.md`, and `docs/test-plan.md` from this prompt.
3. Validate current Android SDK/Play policy requirements from official documentation. If network unavailable, record assumptions as unverified; do not invent policy approvals.
4. Scaffold or update parent Flutter app, child Flutter app and TypeScript backend; set up tests and environment examples.
5. Implement Phase 1 completely, run tests, and report exact commands and results.
6. Proceed through phases in dependency order when tool/session constraints allow. Never pretend a hardware-only capability was verified in an emulator or without enrollment.
7. Maintain a `docs/feature-status.md` table with `planned`, `implemented`, `tested`, `blocked`, `unsupported` and evidence.
8. Do not stop after writing docs if implementation is possible. Implement as much as can be safely verified; explain missing Firebase credentials, physical test devices, deployment secrets or enrollment prerequisites without fabricating them.
9. Include setup commands, Android test instructions, architecture decisions, API examples, deployment steps and known limitations in `README.md`.
10. Provide a final concise report listing files changed, tests run, features working, features unverified, platform restrictions, and next actions.

## 14. Definition of done

The MVP is done only when: parent/child apps build; authenticated pairing and authorization work; usage reports and alerts work on a tested Android device; policies sync with offline persistence; supported remote lock and other controls truthfully report outcomes; permission revocation is handled; location/SOS are consent-based; privacy deletion works; tests pass; documentation is complete; and **no camera or microphone access exists anywhere in the application**.

**Priority:** Security, transparency, correctness and child safety take precedence over adding a feature that Android does not permit.
