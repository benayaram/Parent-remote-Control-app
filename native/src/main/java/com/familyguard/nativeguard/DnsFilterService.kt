package com.familyguard.nativeguard
import android.app.*
import android.content.Intent
import android.net.VpnService
import android.os.*
import androidx.core.app.NotificationCompat
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetAddress
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
class DnsFilterService:VpnService(){
 private var tun:ParcelFileDescriptor?=null;private val io=Executors.newSingleThreadExecutor();private val handler=Handler(Looper.getMainLooper())
 private val beat=object:Runnable{override fun run(){getSharedPreferences("device",0).edit().putLong("vpnSeen",System.currentTimeMillis()).apply();handler.postDelayed(this,30000)}}
 override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int{
  if(intent?.action=="stop"){stopSelf();return START_NOT_STICKY};if(tun!=null)return START_NOT_STICKY
  val manager=getSystemService(NotificationManager::class.java);manager.createNotificationChannel(NotificationChannel("dns","Visible DNS filtering",NotificationManager.IMPORTANCE_LOW))
  val stop=PendingIntent.getService(this,13,Intent(this,DnsFilterService::class.java).setAction("stop"),PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  startForeground(13,NotificationCompat.Builder(this,"dns").setSmallIcon(android.R.drawable.ic_secure).setContentTitle("FamilyGuard DNS filtering is ON").setContentText("DNS only. Encrypted DNS and other VPNs can bypass it.").addAction(0,"Stop filtering",stop).setOngoing(true).build())
  tun=Builder().setSession("FamilyGuard visible DNS filter").addAddress("10.83.0.1",32).addDnsServer("10.83.0.2").addRoute("10.83.0.2",32).setBlocking(true).establish()
  val fd=tun?:run{stopSelf();return START_NOT_STICKY};getSharedPreferences("device",0).edit().putBoolean("vpn",true).apply();handler.post(beat)
  io.execute{val input=FileInputStream(fd.fileDescriptor);val output=FileOutputStream(fd.fileDescriptor)
   // Only the virtual DNS /32 is routed through TUN. DoH goes over the normal
   // underlying network, with hostname/TLS verification and fixed resolver IP.
   val client=OkHttpClient.Builder().dns(object:Dns{override fun lookup(hostname:String)=listOf(InetAddress.getByName("1.1.1.3"))}).connectTimeout(5,TimeUnit.SECONDS).readTimeout(5,TimeUnit.SECONDS).build()
   val buffer=ByteArray(32767)
   try{while(!Thread.currentThread().isInterrupted){val size=input.read(buffer);if(size<=0)break;val packet=buffer.copyOf(size);val dns=DnsPacket.query(packet)?:continue;val host=DnsPacket.domain(dns)?:continue
    val rules=LocalCache(this).read()?.let{JSONObject(it).optJSONObject("webRules")};fun domains(key:String):List<String>{val a=rules?.optJSONArray(key)?:return emptyList();return (0 until a.length()).map{a.getString(it)}}
    val denied=PolicyEngine.domainBlocked(host,domains("deny"),domains("allow"))
    val answer=if(denied)DnsPacket.refused(dns)else try{val request=Request.Builder().url("https://family.cloudflare-dns.com/dns-query").header("Accept","application/dns-message").post(dns.toRequestBody("application/dns-message".toMediaType())).build();client.newCall(request).execute().use{r->if(!r.isSuccessful)throw java.io.IOException();r.body?.bytes()?.takeIf{it.size<=32000&&it.size>=12&&it[0]==dns[0]&&it[1]==dns[1]}?:throw java.io.IOException()}}catch(_:Exception){DnsPacket.refused(dns,2)}
    output.write(DnsPacket.response(packet,answer))
   }}catch(_:Exception){}finally{stopSelf()}
  };return START_NOT_STICKY
 }
 override fun onRevoke(){stopSelf();super.onRevoke()}
 override fun onDestroy(){handler.removeCallbacks(beat);getSharedPreferences("device",0).edit().putBoolean("vpn",false).apply();try{tun?.close()}catch(_:Exception){};tun=null;io.shutdownNow();super.onDestroy()}
}
