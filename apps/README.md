# Flutter apps

Install Flutter stable (Dart >=3.6), Android SDK 35, Java 17+. In each apps/parent_app and apps/child_app run flutter pub get, flutter analyze, flutter test, flutter build apk --debug.
Run with --dart-define=API_URL=https://your-api and, for parent Firebase initialization, --dart-define=FIREBASE_API_KEY=... --dart-define=FIREBASE_APP_ID=... --dart-define=FIREBASE_SENDER_ID=... --dart-define=FIREBASE_PROJECT_ID=... . Firebase public app configuration is not an admin credential. Configure authorized Firebase Android package IDs. No service-account credentials belong in apps.
Child uses device-bound Keystore signing after parent-confirmed pairing. Native methods require Android; web will show unavailable. Parent and child Android shells are committed; Flutter SDK is required to resolve the embedding. No APK or real-device behavior is claimed until build and hardware gates pass.
