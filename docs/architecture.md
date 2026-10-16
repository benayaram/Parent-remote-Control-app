# Architecture
Parent Flutter → HTTPS + Firebase ID token → Express API → MongoDB.
Child Flutter → Kotlin MethodChannel → UsageStats, DevicePolicyManager, LocationManager, Keystore and Room. Child requests sign method + exact URL + timestamp + nonce + SHA256(raw body), using P-256 SHA256withECDSA; the API rejects stale timestamps and stores replay nonces atomically.
Parent membership and device ownership are checked server-side. Firebase Admin verifies revoked tokens and verified email. High impact requests require auth_time within five minutes. FCM only wakes the child; command pull/ack is authoritative. Standard background execution is best effort; persistent synchronization integration is tracked separately.
Database TTL cleans expired data asynchronously; reads also enforce expiry. Commands never become applied merely on delivery. Demo UI is a separately labeled browser walkthrough with synthetic data and never pretends to connect to hardware.
