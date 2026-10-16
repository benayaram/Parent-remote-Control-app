package com.familyguard.parent
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import com.google.firebase.messaging.FirebaseMessaging
import android.Manifest
import android.os.Build
class MainActivity:FlutterActivity(){override fun configureFlutterEngine(engine:FlutterEngine){super.configureFlutterEngine(engine);MethodChannel(engine.dartExecutor.binaryMessenger,"familyguard/device").setMethodCallHandler{call,result->when(call.method){
 "registerPush"->{if(Build.VERSION.SDK_INT>=33)requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS),33);FirebaseMessaging.getInstance().token.addOnCompleteListener{task->if(task.isSuccessful)result.success(task.result)else result.error("firebase_configuration_required","Configure Firebase and try again",null)}}
 else->result.notImplemented()
}}}}
