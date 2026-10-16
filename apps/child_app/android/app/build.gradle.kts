plugins { id("com.android.application"); id("org.jetbrains.kotlin.android"); id("dev.flutter.flutter-gradle-plugin") }
android {
 namespace="com.familyguard.child"
 compileSdk=35
 defaultConfig { applicationId="com.familyguard.child"; minSdk=26; targetSdk=35; versionCode=1; versionName="0.1.0" }
 compileOptions { sourceCompatibility=JavaVersion.VERSION_17; targetCompatibility=JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget="17" }
}
flutter { source="../.." }
dependencies { implementation(project(":native")) }
