package com.familyguard.child
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import com.familyguard.nativeguard.*
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.location.LocationManager
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import java.time.Instant
import java.util.concurrent.Executors
class MainActivity:FlutterActivity(){
 private val executor=Executors.newSingleThreadExecutor()
 override fun configureFlutterEngine(engine:FlutterEngine){super.configureFlutterEngine(engine)
  MethodChannel(engine.dartExecutor.binaryMessenger,"familyguard/device").setMethodCallHandler{call,result->
   fun answer(block:()->Any?){executor.execute{try{val value=block();runOnUiThread{result.success(value)}}catch(_:Exception){runOnUiThread{result.error("unavailable","Capability unavailable or permission required",null)}}}}
   val prefs=getSharedPreferences("device",0);val controls=DeviceControls(this)
   when(call.method){
    "status"->result.success(mapOf("deviceId" to prefs.getString("id",null),"deviceName" to Build.MODEL,"manufacturer" to Build.MANUFACTURER,"androidApi" to Build.VERSION.SDK_INT,"managementMode" to if(controls.owner())"managed" else "standard","capabilities" to controls.capabilities()))
    "publicKey"->answer{Identity(this).publicKey()}
    "sign"->answer{Identity(this).headers(call.argument<String>("method")!!,call.argument<String>("path")!!,call.argument<String>("body")?:"")}
    "configure"->{val url=call.argument<String>("apiUrl")!!;if(!url.startsWith("https://")){result.error("https_required","HTTPS required",null)}else{prefs.edit().putString("id",call.argument<String>("deviceId")).putString("api",url).apply();SyncWorker.schedule(this);result.success(true)}}
    "usage"->answer{UsageAdapter(this).report()}
    "inventory"->answer{UsageAdapter(this).inventory()}
    "cachePolicy"->answer{LocalCache(this).save(call.argument<String>("json")!!);true}
    "execute"->answer{controls.execute(call.argument<String>("id")!!,call.argument<String>("type")!!,call.argument<String>("expiresAt")!!)}
    "usageSettings"->{startActivity(UsageAdapter(this).settings());result.success(true)}
    "requestAdmin"->{startActivity(controls.adminIntent());result.success(true)}
    "notificationPermission"->{if(Build.VERSION.SDK_INT>=33)requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS),31);result.success(true)}
    "openCapture"->{startActivity(Intent(this,LocalCheckInActivity::class.java));result.success(true)}
    "emergencyDialer"->{startActivity(Intent(Intent.ACTION_DIAL));result.success(true)}
    "openAppSettings"->{startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:$packageName")));result.success(true)}
    "location"->{if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED){requestPermissions(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION,Manifest.permission.ACCESS_FINE_LOCATION),30);result.error("permission_required","Choose location permission and tap Share again",null)}else answer{
      val manager=getSystemService(LocationManager::class.java);val loc=manager.getProviders(true).mapNotNull{try{manager.getLastKnownLocation(it)}catch(_:SecurityException){null}}.maxByOrNull{it.time}
      loc?.let{mapOf("lat" to it.latitude,"lng" to it.longitude,"accuracyMeters" to it.accuracy.toDouble(),"capturedAt" to Instant.ofEpochMilli(it.time).toString())}
    }}
    else->result.notImplemented()
   }
  }
 }
 override fun onDestroy(){executor.shutdown();super.onDestroy()}
}
