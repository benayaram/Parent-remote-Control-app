package com.familyguard.nativeguard
import android.Manifest
import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.telecom.TelecomManager
class GuardAdmin:DeviceAdminReceiver()
class DeviceControls(private val context:Context){
 private val dpm=context.getSystemService(DevicePolicyManager::class.java)
 private val admin=ComponentName(context,GuardAdmin::class.java)
 fun owner()=dpm.isDeviceOwnerApp(context.packageName)
 fun capabilities()=mapOf("usage" to UsageAdapter(context).granted(),"lock" to dpm.isAdminActive(admin),"location" to (context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED),"suspend" to owner(),"kiosk" to false,"uninstall" to owner())
 fun adminIntent()=Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN,admin).putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,"Allow your family to request a screen lock. This does not make this phone a managed device.")
 companion object{private val executionLock=Any()}
 fun execute(id:String,type:String,expiresAt:String):Map<String,String> = synchronized(executionLock){executeLocked(id,type,expiresAt)}
 private fun executeLocked(id:String,type:String,expiresAt:String):Map<String,String>{
  if(PolicyEngine.expired(expiresAt,System.currentTimeMillis()))return mapOf("status" to "failed","reason" to "Command expired")
  val prefs=context.getSharedPreferences("commands",0)
  prefs.getString(id,null)?.let{return mapOf("status" to it)}
  val status=try{when(type){"lock"->if(dpm.isAdminActive(admin)){dpm.lockNow();"applied"}else "permission_required";"sync_policy"->if(LocalCache(context).read()!=null)"applied" else "failed";else->"unsupported"}}catch(_:SecurityException){"permission_required"}catch(_:Exception){"failed"}
  prefs.edit().putString(id,status).apply();return mapOf("status" to status)
 }
 private fun safeTarget(name:String):Boolean{
  if(name==context.packageName||name==context.getSystemService(TelecomManager::class.java).defaultDialerPackage)return false
  val pm=context.packageManager
  val home=pm.resolveActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME),PackageManager.MATCH_DEFAULT_ONLY)?.activityInfo?.packageName
  if(name==home)return false
  val services=Settings.Secure.getString(context.contentResolver,Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES).orEmpty()
  if(services.split(':').any{it.startsWith("$name/")})return false
  return try{val info=pm.getApplicationInfo(name,0);(info.flags and (ApplicationInfo.FLAG_SYSTEM or ApplicationInfo.FLAG_UPDATED_SYSTEM_APP))==0}catch(_:Exception){false}
 }
 // These adapters are not exposed as remote commands until enrollment/recovery
 // and emergency exemptions are validated on owned hardware.
 fun suspend(packageName:String,enabled:Boolean):String{
  if(!owner())return "unsupported";if(!safeTarget(packageName))return "unsupported"
  return try{if(dpm.setPackagesSuspended(admin,arrayOf(packageName),enabled).isEmpty())"applied" else "failed"}catch(_:SecurityException){"permission_required"}
 }
 fun uninstallProtection(enabled:Boolean):String{if(!owner())return "unsupported";return try{dpm.setUninstallBlocked(admin,context.packageName,enabled);"applied"}catch(_:SecurityException){"permission_required"}}
}
