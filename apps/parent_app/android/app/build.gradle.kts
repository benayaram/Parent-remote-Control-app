plugins { id("com.android.application"); id("org.jetbrains.kotlin.android"); id("dev.flutter.flutter-gradle-plugin") }
android {
 namespace="com.familyguard.parent"
 compileSdk=35
 defaultConfig { applicationId="com.familyguard.parent"; minSdk=26; targetSdk=35; versionCode=1; versionName="0.1.0" }
 compileOptions { sourceCompatibility=JavaVersion.VERSION_17; targetCompatibility=JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget="17" }
}
flutter { source="../.." }

if(file("google-services.json").exists()) apply(plugin="com.google.gms.google-services")
dependencies { implementation("com.google.firebase:firebase-messaging:24.1.1") }
