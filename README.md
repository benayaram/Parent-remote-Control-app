# FamilyGuard

Transparent Android parental supervision: Flutter parent and child apps, native Kotlin adapters, TypeScript/Express API, Firebase Auth, MongoDB. **Development build, not a production-complete or hardware-validated product.** See [feature status](docs/feature-status.md) for exact evidence and remaining work.

The repository was empty. Work follows [the implementation plan](docs/implementation-plan.md) and the preserved [master specification](docs/master-specification.md). The user's camera/microphone override is limited to visible, child-started local check-ins, without remote activation or upload.

## Development

Node 24: `cd backend && npm ci && npm run check && npm test && npm run build`.

Backend runtime: configure `MONGODB_URI` (MongoDB replica set), `FIREBASE_PROJECT_ID` and Firebase Application Default Credentials securely, then `npm start`. Production entrypoint has no demo auth or memory-store fallback. HTTPS is required by mobile; API binds loopback by default for TLS reverse proxy deployment.

See [apps setup](apps/README.md) for Flutter/Firebase options. In each app run `flutter pub get`, `flutter analyze`, `flutter test`, `flutter build apk --debug`. Native-only: configure Android SDK in ignored `local.properties`, then `./gradlew :native:testDebugUnitTest :native:assembleDebug`.

## Components

- `backend/src`: strict validation, verified Firebase accounts, parent roles, single-use pairing, P-256 device signing/replay protection, policies, commands, reports, SOS, extra-time approvals and family deletion.
- `apps/parent_app`, `apps/child_app`, `packages/familyguard_ui`: sign-in/verification, family/pairing, reports, policy budgets, device diagnostics, command status, SOS, foreground location sharing, privacy and capture consent.
- `native`: UsageEvents, partial launcher package inventory, device-admin lock, encrypted Room policy payloads, WorkManager sync and local notifications. Managed suspension/uninstall adapters are not exposed remotely before hardware/recovery validation.
- `demo/walkthrough`: synthetic dashboard walkthrough; not Android device evidence.

## Honest boundaries

Standard mode does not guarantee app blocking/uninstall prevention. Device admin is not device owner. Kiosk, VPN packet forwarding, geofence/background-location integration, production FCM registration, scheduled per-app enforcement, rich reporting/export files and full co-parent UI remain incomplete. Backend supports co-parent invitation endpoints. Location is foreground, user-triggered, and timestamped. SOS API storage is not guaranteed emergency delivery; the child can open the system dialer without backend access. Camera/microphone require a visible child action, stop on leaving, have no network upload path and are never remote commands.

## Verification and release

Run `python scripts/audit-manifests.py` and see [test plan](docs/test-plan.md), [permissions](docs/permissions.md), [security model](docs/security-threat-model.md), [API](docs/api.md), [deployment](docs/deployment.md), and [managed provisioning](docs/managed-provisioning.md). No actual child/parent account, physical Android device, owner enrollment or production deployment has been tested unless recorded explicitly in feature status. Never distribute before closing these gates.
