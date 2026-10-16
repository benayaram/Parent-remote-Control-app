plugins { id("com.android.library"); id("org.jetbrains.kotlin.android"); id("com.google.devtools.ksp") }
android {
 namespace = "com.familyguard.nativeguard"
 compileSdk = 35
 defaultConfig { minSdk = 26; testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner" }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget = "17" }
}
dependencies {
 implementation("com.google.firebase:firebase-messaging:24.1.1")
 implementation("androidx.core:core-ktx:1.15.0")
 implementation("androidx.room:room-runtime:2.6.1")
 ksp("androidx.room:room-compiler:2.6.1")
 implementation("androidx.work:work-runtime-ktx:2.10.0")
 implementation("com.squareup.okhttp3:okhttp:4.12.0")
 testImplementation("junit:junit:4.13.2")
}
