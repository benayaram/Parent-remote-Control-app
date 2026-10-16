pluginManagement {
 val flutterSdkPath = java.util.Properties().apply { file("local.properties").inputStream().use { load(it) } }.getProperty("flutter.sdk") ?: error("flutter.sdk missing")
 includeBuild("$flutterSdkPath/packages/flutter_tools/gradle")
 repositories { google(); mavenCentral(); gradlePluginPortal() }
}
plugins {
 id("dev.flutter.flutter-plugin-loader") version "1.0.0"
 id("com.android.application") version "8.7.3" apply false
 id("org.jetbrains.kotlin.android") version "2.0.21" apply false
 id("com.android.library") version "8.7.3" apply false
 id("com.google.devtools.ksp") version "2.0.21-1.0.28" apply false
}
include(":app")
