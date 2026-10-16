package com.familyguard.nativeguard
import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.app.NotificationCompat
import androidx.work.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import org.json.JSONArray
import java.util.concurrent.TimeUnit
class SyncWorker(context:Context,params:WorkerParameters):Worker(context,params){
 override fun doWork():Result{
  val prefs=applicationContext.getSharedPreferences("device",0);val id=prefs.getString("id",null)?:return Result.success();val base=prefs.getString("api",null)?:return Result.failure()
  if(!base.startsWith("https://"))return Result.failure()
  val client=OkHttpClient.Builder().connectTimeout(10,TimeUnit.SECONDS).readTimeout(15,TimeUnit.SECONDS).build()
  fun call(method:String,path:String,payload:JSONObject?=null):String{
   val url="/api/v1$path";val body=payload?.toString().orEmpty();val request=Request.Builder().url(base.trimEnd('/')+url).method(method,if(method=="GET")null else body.toRequestBody("application/json".toMediaType()))
   Identity(applicationContext).headers(method,url,body).forEach{(k,v)->request.header(k,v)}
   return client.newCall(request.build()).execute().use{r->if(!r.isSuccessful)throw java.io.IOException("HTTP ${r.code}");r.body?.string()?:"{}"}
  }
  return try{
   val controls=DeviceControls(applicationContext)
   call("POST","/devices/$id/heartbeat",JSONObject().put("managementMode",if(controls.owner())"managed" else "standard").put("capabilities",JSONObject(controls.capabilities())))
   prefs.getString("pushToken",null)?.let{call("POST","/devices/$id/push-token",JSONObject().put("token",it))}
   val policy=JSONObject(call("GET","/devices/$id/policy")).put("geofences",JSONArray(call("GET","/devices/$id/geofences"))).toString();LocalCache(applicationContext).save(policy)
   val inventoryDate=java.time.LocalDate.now().toString()
   if(prefs.getString("inventoryDate",null)!=inventoryDate){call("POST","/devices/$id/apps",JSONObject().put("partial",true).put("apps",org.json.JSONArray(UsageAdapter(applicationContext).inventory().take(200))));prefs.edit().putString("inventoryDate",inventoryDate).apply()}
   val usage=UsageAdapter(applicationContext).report();if(usage["permission"]==true){call("POST","/devices/$id/usage",JSONObject(usage.filterKeys{it!="permission"}));warnBudget(JSONObject(policy),usage)}
   val commands=JSONArray(call("GET","/devices/$id/commands"));for(i in 0 until commands.length()){val c=commands.getJSONObject(i);val result=controls.execute(c.getString("id"),c.getString("type"),c.getString("expiresAt"));call("POST","/commands/${c.getString("id")}/ack",JSONObject(result))}
   Result.success()
  }catch(_:Exception){ // Cached rules continue locally even when server cannot be reached.
   try{LocalCache(applicationContext).read()?.let{warnBudget(JSONObject(it),UsageAdapter(applicationContext).report())}}catch(_:Exception){}
   if(runAttemptCount>=5)Result.failure()else Result.retry()
  }
 }
 private fun warnBudget(policy:JSONObject,usage:Map<String,Any>){
  if(usage["permission"]!=true)return
  val samples=usage["samples"] as? List<*>?:return
  val totals=samples.mapNotNull{val m=it as? Map<*,*>?:return@mapNotNull null;val name=m["packageName"] as? String?:return@mapNotNull null;name to ((m["foregroundSeconds"] as? Number)?.toLong()?:0)}.toMap()
  val extra=policy.optJSONObject("extraTime");val grant=if(extra!=null&&!PolicyEngine.expired(extra.getString("expiresAt"),System.currentTimeMillis()))extra.optInt("minutes",0)else 0
  val reminders=mutableListOf<Pair<String,String>>()
  if(totals.values.sum()>=(policy.optInt("dailyMinutes",120)+grant)*60L*8/10)reminders+="overall" to "You are approaching today's screen-time budget."
  val appRules=policy.optJSONArray("appRules")
  if(appRules!=null)for(i in 0 until appRules.length()){val rule=appRules.getJSONObject(i);val name=rule.getString("packageName");if((totals[name]?:0)>0&&(totals[name]?:0)>=rule.getInt("dailyMinutes")*60L*8/10)reminders+="app:$name" to "One app is approaching its time budget. Review your rules."}
  val at=java.time.ZonedDateTime.now(java.time.ZoneId.of(policy.optString("timezone",java.time.ZoneId.systemDefault().id)))
  for(key in listOf("studyWindows","bedtimeWindows")){val windows=policy.optJSONArray(key)?:continue
   for(i in 0 until windows.length()){val w=windows.getJSONObject(i);val days=w.getJSONArray("days");val window=TimeWindow((0 until days.length()).map{days.getInt(it)}.toSet(),java.time.LocalTime.parse(w.getString("start")),java.time.LocalTime.parse(w.getString("end")));if(window.active(at))reminders+=key to if(key=="studyWindows")"Your study schedule is active. Choose your approved activities." else "Your bedtime schedule is active. Consider putting your phone away."}
  }
  val c=applicationContext;if(android.os.Build.VERSION.SDK_INT>=33&&c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return
  val date=usage["localDate"].toString();val p=c.getSharedPreferences("notifications",0)
  val manager=c.getSystemService(NotificationManager::class.java);manager.createNotificationChannel(NotificationChannel("budget","Time budget and schedule reminders",NotificationManager.IMPORTANCE_DEFAULT))
  for((key,text)in reminders){if(p.getString(key,null)==date)continue;manager.notify(key.hashCode(),NotificationCompat.Builder(c,"budget").setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("FamilyGuard reminder").setContentText("$text Reminders do not block apps or emergency calls.").setAutoCancel(true).build());p.edit().putString(key,date).apply()}
 }
 companion object{fun schedule(context:Context){val request=PeriodicWorkRequestBuilder<SyncWorker>(15,TimeUnit.MINUTES).setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS).build();WorkManager.getInstance(context).enqueueUniquePeriodicWork("familyguard.sync",ExistingPeriodicWorkPolicy.KEEP,request)}}
}
