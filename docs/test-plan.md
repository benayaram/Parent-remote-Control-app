# Test plan

Automated backend integration: verified/invalid accounts, family isolation, atomic expiring/replayed pairing, signed device access/body tampering/replay, capability checks, stale commands, deduplicated acks, revocation, time requests, retention/export/deletion. Domain matching and usage aggregation boundaries receive focused tests.
Run Flutter analyze/test and Android debug build for each app where SDK access permits. Audit source and merged manifests; parent must not request capture permissions, child capture must remain activity-only.
Hardware gates: Usage Access denied/granted/revoked; foreground interval/midnight/DST/reboot; admin lock errors; properly provisioned owner suspension and emergency exemptions; camera/mic denial/stop/background behavior; location stale/denied; offline SOS direct dialer; reboot policy sync. Record device/build and observations. Browser screenshots/video only demonstrate dashboard interactions with synthetic data.

Added tests cover real image normalization/metadata stripping with a memory object-store adapter, consent flag, cross-family image access, expiry and durable cleanup; FCM privacy-minimal outbox/backoff; partial inventory; geofence scoping; DNS parsing and location uncertainty. These do not validate live Firebase, VPN TUN traffic or hardware location/capture.
