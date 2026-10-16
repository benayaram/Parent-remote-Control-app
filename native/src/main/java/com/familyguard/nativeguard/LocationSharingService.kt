package com.familyguard.nativeguard
import android.app.*
import android.content.*
import android.location.*
import android.os.*
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.time.Instant
import java.util.concurrent.Executors
class LocationSharingService:Service(),LocationListener{
 private val io=Executors.newSingleThreadExecutor();private var manager:LocationManager?=null
 override fun onBind(intent:Intent?):IBinder?=null
 override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int{
  val notifications=getSystemService(NotificationManager::class.java);notifications.createNotificationChannel(NotificationChannel("location_sharing","Visible location sharing",NotificationManager.IMPORTANCE_LOW))
  val stop=PendingIntent.getService(this,12,Intent(this,LocationSharingService::class.java).setAction("stop"),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  if(intent?.action=="stop"){stopSelf();return START_NOT_STICKY}
  startForeground(12,NotificationCompat.Builder(this,"location_sharing").setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentTitle("FamilyGuard location sharing is ON").setContentText("Your family receives timestamped fixes. Tap Stop to end sharing.").addAction(0,"Stop sharing",stop).setOngoing(true).build())
  getSharedPreferences("device",0).edit().putBoolean("locationSharing",true).apply()
  try{manager=getSystemService(LocationManager::class.java);val provider=if(manager!!.isProviderEnabled(LocationManager.GPS_PROVIDER))LocationManager.GPS_PROVIDER else LocationManager.NETWORK_PROVIDER;manager!!.requestLocationUpdates(provider,60000,50f,this,Looper.getMainLooper())}catch(_:Exception){stopSelf()}
  return START_NOT_STICKY
 }
 override fun onLocationChanged(location:Location){
  if(System.currentTimeMillis()-location.time>120000)return
  io.execute{try{
   val api=DeviceApi(this);val id=api.deviceId;val captured=Instant.ofEpochMilli(location.time).toString()
   api.call("POST","/devices/$id/location",JSONObject().put("lat",location.latitude).put("lng",location.longitude).put("accuracyMeters",location.accuracy.toDouble()).put("capturedAt",captured).put("consent",true))
   val policy=LocalCache(this).read()?.let{JSONObject(it)};val zones=policy?.optJSONArray("geofences")?:return@execute
   val state=getSharedPreferences("geofence_state",0)
   for(i in 0 until zones.length()){val zone=zones.getJSONObject(i);val zoneId=zone.getString("id");val previous=if(state.contains(zoneId))state.getBoolean(zoneId,false)else null
    val distance=GeoMath.distance(location.latitude,location.longitude,zone.getDouble("lat"),zone.getDouble("lng"));val inside=GeoMath.inside(distance,zone.getDouble("radiusMeters"),location.accuracy.toDouble(),previous)
    if(inside!=null&&inside!=previous){if(previous!=null)api.call("POST","/devices/$id/geofence-events",JSONObject().put("geofenceId",zoneId).put("transition",if(inside)"enter" else "exit").put("capturedAt",captured));state.edit().putBoolean(zoneId,inside).apply()}
   }
  }catch(_:Exception){ // No queued location history; next fresh fix retries. No delivery guarantee.
  }}
 }
 @Deprecated("Legacy location callback") override fun onStatusChanged(provider:String?,status:Int,extras:Bundle?){}
 override fun onProviderEnabled(provider:String){}
 override fun onProviderDisabled(provider:String){}
 override fun onDestroy(){manager?.removeUpdates(this);io.shutdown();getSharedPreferences("device",0).edit().putBoolean("locationSharing",false).apply();super.onDestroy()}
}
