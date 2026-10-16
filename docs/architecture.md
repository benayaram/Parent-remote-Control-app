# Architecture

Parent Flutter → HTTPS + Firebase Auth → Node/Express API → MongoDB for structured/text data. Child Flutter → Kotlin MethodChannel → UsageStats, Keystore, DevicePolicyManager, Room, visible location and DNS services. Firebase Storage holds only child-explicitly-shared photo bytes; image metadata/authorization/retention lives in MongoDB. Voice stays local.

Requests from children use P-256 SHA256withECDSA signing over method, exact URL, timestamp, nonce and raw-body SHA256. Server timestamps/replay records and revocation protect device APIs. Pairing requires short-lived code, child disclosure/key and parent confirmation. Parent membership and recent authentication are checked server-side.

Durable FCM outbox sends privacy-minimal wakeup hints after transaction commit, with leases/backoff. FCM never implies command application. Child pulls commands, validates capabilities/expiry, caches outcomes and acknowledges. WorkManager polling is fallback; background work and free hosting cannot guarantee timely commands/SOS.

Room encrypts policy payloads with Android Keystore AES-GCM. Cached daily/per-app/overnight schedules generate reminders offline; standard mode never claims strict third-party blocking. Managed adapters require owner role and safe-target exclusions; remote exposure/kiosk is disabled pending recovery and hardware verification.

The DNS VPN routes only a virtual DNS address. It forwards permitted UDP DNS over verified HTTPS to a family-safe resolver; no TLS interception and no query history. Encrypted/custom DNS, TCP DNS and other transports can bypass it. Location foreground service starts only from visible child action, displays Stop, reports sample accuracy/time and evaluates cached circles with hysteresis.

Photo upload decodes/re-encodes and strips metadata server-side, writes a private Storage object, then marks Mongo metadata ready. Reads enforce family membership and expiry. Deletion creates durable Firebase cleanup jobs that survive removal of family records; cleanup retries failures. No image bytes are persisted in MongoDB. Storage client rules deny all direct access; backend Admin credentials must be least privilege.

Demo video is separately authored with synthetic data; it is not footage from the Flutter apps.
