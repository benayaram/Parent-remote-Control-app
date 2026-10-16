package com.familyguard.nativeguard
import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
object PushRegistration{fun request(context:Context,callback:(String?)->Unit){
 if(FirebaseApp.getApps(context).isEmpty()){callback(null);return}
 FirebaseMessaging.getInstance().isAutoInitEnabled=true
 FirebaseMessaging.getInstance().token.addOnCompleteListener{task->val token=if(task.isSuccessful)task.result else null;if(token!=null)context.getSharedPreferences("device",0).edit().putString("pushToken",token).apply();callback(token)}
}}
