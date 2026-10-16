package com.familyguard.nativeguard
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import androidx.work.*
class PushWakeup:FirebaseMessagingService(){
 override fun onNewToken(token:String){getSharedPreferences("device",0).edit().putString("pushToken",token).apply();wake()}
 override fun onMessageReceived(message:RemoteMessage){if(message.data["type"] in setOf("command_available","policy_updated"))wake()}
 private fun wake(){WorkManager.getInstance(this).enqueueUniqueWork("familyguard.wakeup",ExistingWorkPolicy.KEEP,OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build())}
}
