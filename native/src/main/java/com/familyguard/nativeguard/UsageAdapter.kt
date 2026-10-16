package com.familyguard.nativeguard
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import java.time.LocalDate
import java.time.ZoneId
class UsageAdapter(private val context:Context){
 fun granted():Boolean {val ops=context.getSystemService(AppOpsManager::class.java);return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,Process.myUid(),context.packageName)==AppOpsManager.MODE_ALLOWED}
 fun settings()=Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
 fun report():Map<String,Any>{
  val zone=ZoneId.systemDefault();val day=LocalDate.now(zone);val (start,_)=PolicyEngine.bounds(day,zone);val end=System.currentTimeMillis()
  if(!granted())return mapOf("permission" to false,"samples" to emptyList<Any>(),"timezone" to zone.id,"localDate" to day.toString())
  val stream=context.getSystemService(UsageStatsManager::class.java).queryEvents(start-86400000,end)
  val events=mutableListOf<ForegroundEvent>();val event=UsageEvents.Event()
  while(stream.hasNextEvent()){stream.getNextEvent(event);when(event.eventType){UsageEvents.Event.MOVE_TO_FOREGROUND->events+=ForegroundEvent(event.timeStamp,event.packageName,true);UsageEvents.Event.MOVE_TO_BACKGROUND->events+=ForegroundEvent(event.timeStamp,event.packageName,false)}}
  val totals=PolicyEngine.aggregate(events,start,end)
  return mapOf("permission" to true,"timezone" to zone.id,"localDate" to day.toString(),"samples" to totals.entries.take(200).map{mapOf("packageName" to it.key,"foregroundSeconds" to it.value,"sourceQuality" to "partial")})
 }
 fun inventory():List<Map<String,Any>>{
  val pm=context.packageManager;val intent=Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
  return pm.queryIntentActivities(intent,0).map{it.activityInfo.packageName}.distinct().mapNotNull {name->try{val info=pm.getPackageInfo(name,0);mapOf("packageName" to name,"label" to pm.getApplicationLabel(pm.getApplicationInfo(name,0)).toString(),"version" to (info.versionName?:"unknown"),"visibility" to "partial")}catch(_:Exception){null}}
 }
}
