package com.familyguard.nativeguard
import android.content.Context
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit
class DeviceApi(private val context:Context){
 private val prefs=context.getSharedPreferences("device",0)
 val deviceId:String get()=prefs.getString("id",null)?:error("Not paired")
 private val client=OkHttpClient.Builder().connectTimeout(10,TimeUnit.SECONDS).readTimeout(15,TimeUnit.SECONDS).build()
 fun call(method:String,path:String,payload:JSONObject?=null):String{
  val base=prefs.getString("api",null)?:error("Not configured");require(base.startsWith("https://"))
  val url="/api/v1$path";val body=payload?.toString().orEmpty();val request=Request.Builder().url(base.trimEnd('/')+url).method(method,if(method=="GET")null else body.toRequestBody("application/json".toMediaType()))
  Identity(context).headers(method,url,body).forEach{(k,v)->request.header(k,v)}
  return client.newCall(request.build()).execute().use{r->if(!r.isSuccessful)throw java.io.IOException("HTTP ${r.code}");r.body?.string()?:"{}"}
 }
}
