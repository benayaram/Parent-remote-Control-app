#!/usr/bin/env bash
set -euo pipefail
cd /workspace/Parent-remote-Control-app
export NPM_CONFIG_CACHE=/workspace/familyguard-tools/npm-cache
export JAVA_HOME=/workspace/familyguard-tools/jdk-17.0.16+8
export ANDROID_USER_HOME=/workspace/familyguard-tools/android-user
export GRADLE_USER_HOME=/workspace/familyguard-tools/gradle-cache
if [[ ! -x "$JAVA_HOME/bin/javac" ]]; then
  printf '%s\n' 'Prepared JDK missing; install a trusted JDK 17 and update JAVA_HOME.' >&2
  exit 1
fi
npm --prefix backend ci --no-audit --no-fund
npm --prefix backend run check
npm --prefix backend test
npm --prefix backend run build
# Use the injected proxy and system CA trust. Do not disable TLS verification.
./gradlew -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts \
  -Dhttps.proxyHost=proxy -Dhttps.proxyPort=8080 \
  -Dhttp.proxyHost=proxy -Dhttp.proxyPort=8080 \
  :native:testDebugUnitTest :native:assembleDebug --console=plain
python scripts/audit-manifests.py
