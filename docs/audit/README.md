# FamilyGuard specification acceptance audit

**Verdict: NOT COMPLETE.** The current application does not satisfy the master document's Definition of Done. Passing the original tests did not establish complete feature coverage.

Audit date: 2026-10-16. Application code reviewed: `62a6d92c310073416f88401bcc663b2a46457746`. This audit adds tests/evidence and changes the default backend test command to include new acceptance tests. It does not fix the application defects below.

The master specification is [preserved here](../master-specification.md). Later user instructions permitting child-started camera/microphone check-ins and Firebase image storage are treated as explicit overrides. Original blanket capture exclusions (including minimum test 15) are therefore **superseded**, not claimed as passing. Remote/covert activation remains deliberately unsupported.

## Checks actually executed

| Check                                         | Result                             | Scope / evidence                                                                                                         |
| --------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Backend TypeScript check and build            | PASS                               | Real compiler; [original test log](evidence/backend-existing-tests.txt) and files on disk                                |
| Original backend suite                        | 20 passed, 0 failed, 0 skipped     | Express API + injected identities + transactional memory database; not live Firebase/Mongo                               |
| New specification acceptance suite            | 9 passed, **3 failed**, 0 skipped  | [Reproducible tests](../../backend/audit/spec-acceptance.test.ts); [results](evidence/backend-acceptance-tests.txt)      |
| Combined backend default `npm test`           | **29 passed, 3 failed**, 0 skipped | Both suites now execute by default; failures are not skipped/expected-failure exceptions                                 |
| Native Kotlin JVM tests                       | **14 passed**, 0 failed/skipped    | Original 6 + 8 new checks; [run](evidence/native-expanded-tests.txt)                                                     |
| Native Android library build                  | PASS                               | `:native:assembleDebug`; output is an **AAR**, not either app APK                                                        |
| Android native lint                           | **FAIL: 1 error, 17 warnings**     | [Full lint findings](evidence/android-lint-details.txt)                                                                  |
| Source manifest audit                         | PASS under user override           | Parent no capture permissions; [audit](evidence/source-manifests.txt). Not both merged app manifests                     |
| Dart source/test syntax parsing               | 5 files accepted                   | [Parser results](evidence/dart-syntax.json). Does not resolve Flutter types or run widgets                               |
| Demo TypeScript check                         | PASS                               | Remotion prototype source only; video is not Android app footage                                                         |
| Flutter analysis, widget tests, APK builds    | **BLOCKED / NOT RUN**              | Flutter/Dart absent; official download host returns proxy CONNECT 403. No app APK/merged manifest exists                 |
| Firebase Auth/Storage/FCM + Mongo integration | **NOT RUN**                        | No runtime project/bucket/database/ADC bindings or native google-services.json files                                     |
| Physical/managed Android acceptance           | **NOT RUN**                        | No eligible device supplied; ADB aborts initializing read-only `/home/agent/.android`; no hardware observations inferred |
| GitHub Actions result                         | UNVERIFIED                         | GitHub API request forbidden; a checked-in workflow is not evidence it passed                                            |

Full machine-readable outcomes: [summary.json](evidence/summary.json). Tests use synthetic identities/keys/images; no real child accounts or sensors were accessed.

## Reproduced defects

### AUD-01 — Expired Firebase images can remain stored indefinitely beyond the first query page

**Priority: high.** `MongoStore.find` always applies `.limit(2000)`. `cleanupImages` queries all images without an expiry filter or pagination. With 2,000 earlier unexpired rows and an expired row after them, cleanup never reaches/deletes the expired row. Repeated invocations can keep seeing the same first page.

The new test reproduces the production adapter's 2,000-row limit using a bounded in-memory store. It expects the expired object's deletion; actual deletions are `[]`. This is not a live MongoDB/Firebase execution claim. Parent reads still deny expired images; the defect concerns object retention/deletion, not demonstrated unauthorized viewing. The cleanup-job scan has the same bounded-query concern when early jobs continually fail.

Evidence: `backend/src/store.ts` find, `backend/src/images.ts` cleanupImages; new acceptance test `SPEC-privacy`.

Needed correction: query expired records explicitly and drain/paginate them safely; likewise prevent failed cleanup jobs starving later jobs. Validate with a real Mongo replica set and Firebase Storage afterward.

### AUD-02 — Android lint fails location permission validation

**Priority: release blocker.** `LocationSharingService.kt:19` triggers `MissingPermission` around `requestLocationUpdates`. The activity checks permissions and the service catches generic exceptions, but lint does not accept the service's permission handling. No runtime crash or bypass is claimed from this static finding.

Needed correction: explicit permission checks and appropriate SecurityException handling inside the service, followed by lint plus on-device denial/revocation tests. The 17 warnings also need review; they include untranslated capture-screen strings.

### AUD-03 — Impossible daily foreground usage is accepted

**Priority: medium.** For one app on a UTC date, POST usage accepts `foregroundSeconds:172800` (48 hours) and returns HTTP 200. The acceptance test expects HTTP 400. Even a DST day cannot contain 48 foreground hours for one app.

Needed correction: validate against the selected date/timezone's actual day length and define sampling/clock-change behavior; device reconciliation is still required.

### AUD-04 — Required audit logging is incomplete

**Priority: medium.** Creating a family produces no `audit_events` entry. The master API section requires audit logs for every endpoint. The new test checks an accepted family-create event and fails. Existing logging covers only selected actions; failed authorization auditing is also absent on review.

Needed correction: consistent, privacy-safe audit recording with a defined retention/error strategy; test both successful changes and relevant denied actions.

## Additional source-confirmed gaps

- **Offline reminders do not meet the document.** The only periodic work is constrained to `NetworkType.CONNECTED`. Cached-policy fallback runs when a started worker encounters an error, but the worker is not periodically scheduled while fully offline. There is no independent offline alarm/scheduler. Room persists only a policy row, not the specified usage aggregates or queued acknowledgements. The child UI also does not restore/display the cached policy on startup.
- **Managed kiosk is missing.** Capability is hardcoded false, and no lock-task start/stop/reboot implementation exists. Owner suspension/uninstall adapters are not exposed by remote command schemas or UI, and recovery is unfinished.
- **Tamper/offline monitoring is incomplete.** Some usage/admin/location capabilities are sampled, but notification/VPN/background eligibility are not in heartbeat; no stale-heartbeat/offline worker or permission-revocation alerts exists. Raw last-seen text is not an offline detection feature.
- **Several notification types are missing.** SOS, extra-time and geofence hints exist; command success/failure, permission-revoked and offline parent alerts are not queued. Real FCM delivery/Doze behavior is untested. Default command TTL is 2 minutes while fallback polling is 15 minutes, so polling cannot guarantee delivery before expiry.
- **Usage rules/reporting remain partial.** Warnings use a fixed 80% threshold; holiday budgets/configurable thresholds are absent. Daily inventory refresh/manual sync is not an installation-change receiver. Inventory has no app icons, last-usage/classification UI. No per-rule applied/failed acknowledgement model exists for ordinary schedule/reminder policies.
- **Dashboard/UI coverage is incomplete.** Actual Flutter UI has daily bars and lists, not the richer Remotion dashboard. There is no location map, trusted emergency-contact management, kiosk page or complete recovery flow. Parent UI offers Approve but no Deny action even though the API supports denial. Child views budget/requests but do not provide the full schedule/time-remaining experience. The two widget tests only render ConfigurationNotice; neither tests actual user workflows, and neither was executable here.
- **DNS/location checks are not feature acceptance.** DNS label/packet/domain unit tests do not show that real domains are blocked or that VPN conflict/bypass state is accurate. Geofence math/API tests do not validate real delayed transitions, approximate permission or network changes. Location sharing state is a stored flag that can become stale after process death.
- **Release/privacy work remains.** Retention periods are hardcoded; policy/legal review, secure backup validation, release signing, current Play target/policy review, both merged app manifests, closed-beta/device tests and live deployment are unverified.

## Catalog A–K: complete or not

No catalog area is accepted as end-to-end complete under the document's hardware/build requirements.

| Document area                     | Current verdict                       | What is verified / what prevents completion                                                                                                                                         |
| --------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Authentication/families/pairing | PARTIAL                               | API isolation, expiry, reuse, roles, signed requests and revoke tested. Real Firebase sign-in, app enrollment, app version metadata, QR/recovery/unpair UI unverified/missing       |
| B Screen time                     | PARTIAL; defects found                | JVM interval/DST/zone/schedule checks and API uploads pass existing cases. 48h sample accepted; offline scheduler/usage queue absent; real reconciliation unrun                     |
| C Installed apps                  | PARTIAL                               | Partial flag and family isolation tested. Launcher inventory compiles; icons/classification/last usage and install-change detection incomplete; device visibility untested          |
| D Limits/strict blocking          | PARTIAL                               | Budgets/schedules/API and reminder source exist. No per-rule result model; owner adapters not remote-enabled. Standard strict blocking correctly unsupported                        |
| E Remote lock                     | IMPLEMENTED, DEVICE-UNVERIFIED        | Active-admin API adapter builds; command auth/TTL tested. No actual lock/denial/enrollment test                                                                                     |
| F Kiosk/study-only                | NOT IMPLEMENTED                       | Hardcoded unavailable; no lock-task or emergency recovery implementation                                                                                                            |
| G Website safety                  | PROTOTYPE, DEVICE-UNVERIFIED          | DNS parser/packet/matcher checks pass; TUN service builds. No real block/bypass/conflict/offline acceptance or filter-health reporting                                              |
| H Location/geofences/SOS          | PARTIAL                               | API consent/isolation, geofence math and SOS storage tested. Native lint fails; no on-device permission/transition/dialer delivery tests; contacts/map incomplete                   |
| I Tamper/uninstall                | PARTIAL / MOSTLY MISSING              | Basic capability sampling; owner adapter compiles. No comprehensive revocation/offline monitoring or recovery; uninstall control not exposed/tested                                 |
| J Dashboard/alerts/reports        | PARTIAL                               | List/bars UI source, some API alerts and FCM outbox tests. Several alert types absent; actual Flutter widgets/live push untested                                                    |
| K Child safeguards                | PARTIAL                               | Disclosure, request/SOS/dialer/settings source. Full offline rules, schedule/time remaining, contacts and removal/recovery incomplete; accessibility/emergency device testing unrun |
| Later override: camera/microphone | IMPLEMENTED SOURCE, DEVICE-UNVERIFIED | Child-visible local capture, stop/delete and explicit photo-share source compile; no permission-denial/background/sensor tests on hardware                                          |
| Later override: Firebase images   | PARTIAL; retention defect found       | Real image normalization plus adapter authorization/expiry/failure cleanup tests pass. Pagination cleanup test fails; live Firebase not tested                                      |

## Minimum acceptance matrix from document section 12

| #   | Required acceptance                       | Audit outcome                                                                                                                                        |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pair expiry/replay/unrelated parent       | API tests pass; mobile/live enrollment unrun                                                                                                         |
| 2   | Usage permission denied/granted/revoked   | Source present; hardware scenarios NOT RUN                                                                                                           |
| 3   | Limited package visibility truthful UI    | API partial flag passes; actual Android visibility NOT RUN                                                                                           |
| 4   | Day/timezone/offline/reboot               | Pure logic tests pass; offline scheduler missing, impossible usage accepted, reboot NOT RUN                                                          |
| 5   | Notification + extra-time approval        | API approve/deny/expiry pass; notification/mobile delivery NOT RUN                                                                                   |
| 6   | Standard strict blocking unsupported      | Confirmed in command/capability/UI source; consumer strict suspension unavailable                                                                    |
| 7   | Eligible admin lock and failures          | API capability/TTL checks pass; enrolled hardware NOT RUN                                                                                            |
| 8   | Managed kiosk/suspension/emergency        | Kiosk missing; owner adapters not enabled or hardware-tested                                                                                         |
| 9   | VPN blocking/conflicts/bypass             | Parser/matcher tests pass; actual traffic/conflict scenarios NOT RUN                                                                                 |
| 10  | Location denial/delayed geofence          | API/math pass; lint fails; real denial/delay NOT RUN                                                                                                 |
| 11  | Offline/FCM/dedupe/expiry/stale heartbeat | API dedupe/expiry/retry pass; offline detection missing, delayed FCM/15-minute polling remains unvalidated                                           |
| 12  | Uninstall/permission revocation truth     | Limited capabilities source; full alerts and managed recovery missing                                                                                |
| 13  | SOS direct-call offline and status        | API storage label tested; dialer source exists, actual offline device path NOT RUN                                                                   |
| 14  | Export/delete/isolation                   | API cases pass; image cleanup pagination FAIL; live cloud deletion NOT RUN                                                                           |
| 15  | No camera/microphone anywhere             | SUPERSEDED by your later explicit override. Parent source permissions pass revised boundary; child capture exists; merged app manifests NOT RUN      |
| 16  | No covert/private communications capture  | No prohibited source patterns found in targeted manifest/adapter review. Not a comprehensive binary/dependency or live-device security certification |

## Phase and Definition of Done verdict

All phases have work or acceptance outstanding: Phase 0 current policy/device matrix; Phase 1 real builds/auth/database; Phase 2 offline accuracy; Phase 3 real delivery/lock/ack persistence; Phase 4 real safety/VPN and lint; Phase 5 kiosk/managed recovery; Phase 6 full regression/release review. Documentation and source scaffolding do not close these gates.

| Definition of Done gate                        | Accepted?                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| Both apps build                                | NO — APK builds not run                                                |
| Pairing/authorization works                    | API adapter checks pass; live mobile/Firebase gate open                |
| Usage/reports/alerts on eligible hardware      | NO — no hardware acceptance                                            |
| Policies sync and persist offline as specified | NO — scheduler/usage/ack persistence gaps                              |
| Eligible remote control truthfully tested      | NO — hardware tests unrun, kiosk unavailable                           |
| Permission revocation handled                  | NO — lint and monitoring/denial gaps                                   |
| Consent-based location/SOS validated           | PARTIAL API/source only                                                |
| Privacy deletion passes                        | NO — Storage cleanup pagination regression                             |
| All required tests pass                        | NO — 3 API acceptance failures and lint error; required suites blocked |
| Documentation/release review complete          | NO — evidence gaps and current policy review outstanding               |

## Reproduce and next actions

1. `cd backend && npm run check && npm test && npm run build`. `npm test` intentionally returns nonzero until the three real defects are fixed; assertions are not disabled.
2. Activate the retained JDK/SDK environment using scripts/check-cloud.sh, then run `./gradlew :native:testDebugUnitTest :native:assembleDebug :native:lintDebug` with this cloud's proxy/system CA settings. Tests/build pass; lint currently fails.
3. Fix AUD-01–04 and implement a real offline scheduler/queues; add missing managed/recovery and monitoring flows before treating the spec as complete.
4. Apply the previously saved environment network settings to allow the official Flutter host. Set up MongoDB replica set, Firebase project/native app configs, ADC and Storage securely in environment settings. Do not send secrets in chat.
5. Run both Flutter analyzers/widget/integration suites and APK builds; audit their merged manifests. Then execute the standard and managed physical-device cases above, recording model/API/permissions and actual observations.

No complete-app or production-readiness claim is supported by this audit. The earlier video remains a synthetic UI walkthrough, not acceptance evidence.
