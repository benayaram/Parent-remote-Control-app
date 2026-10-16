package com.familyguard.nativeguard
import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.view.WindowManager
import android.widget.*
import androidx.core.content.FileProvider
import java.io.File
class LocalCheckInActivity:Activity(){
 private var player:android.media.MediaPlayer?=null;private var recorder:MediaRecorder?=null;private var audio:File?=null;private var photo:File?=null
 private lateinit var status:TextView;private lateinit var image:ImageView
 private val handler=Handler(Looper.getMainLooper());private var started=0L
 private val tick=object:Runnable{override fun run(){if(recorder!=null){val seconds=(System.currentTimeMillis()-started)/1000;status.text="● MICROPHONE RECORDING — ${seconds}s / 60s. Tap Stop.";if(seconds>=60)stopAudio()else handler.postDelayed(this,500)}}}
 override fun onCreate(state:Bundle?){super.onCreate(state);File(cacheDir,"checkins").listFiles()?.forEach{it.delete()};window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
  val layout=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(28,36,28,28)}
  status=TextView(this).apply{text="Local check-in. Only you can start capture. No automatic upload. Everything is deleted when you close this screen.";textSize=19f};layout.addView(status)
  fun button(label:String,action:()->Unit){layout.addView(Button(this).apply{text=label;setOnClickListener{action()}})}
  button("Take a photo — opens visible camera"){if(checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED)requestPermissions(arrayOf(Manifest.permission.CAMERA),11)else takePhoto()}
  button("Start microphone — maximum 60 seconds"){if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED)requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO),12)else startAudio()}
  button("Stop microphone"){stopAudio()}
  button("Listen to my local voice check-in"){stopAudio();player?.release();try{player=android.media.MediaPlayer().apply{setDataSource(audio?.absolutePath?:error("No recording"));prepare();start()};status.text="Playing your local voice check-in. Close to stop and discard."}catch(_:Exception){status.text="No local voice recording to play."}}
  button("Delete check-in"){stopAudio();player?.release();player=null;audio?.delete();photo?.delete();image.setImageDrawable(null);status.text="Local check-in deleted."}
  button("Share this photo with family — Firebase Storage"){
   val file=photo
   if(file==null||!file.exists()){status.text="Take a photo first."}else android.app.AlertDialog.Builder(this).setTitle("Share this photo?").setMessage("Your authorized family can view it for 24 hours. Only this photo is uploaded. Voice stays local. You can choose Cancel.").setNegativeButton("Cancel",null).setPositiveButton("Share photo"){_,_->
    status.text="Sharing the photo you selected…"
    Thread{try{
     val bitmap=android.graphics.BitmapFactory.decodeFile(file.absolutePath)?:error("No photo")
     val scale=minOf(1.0,1600.0/maxOf(bitmap.width,bitmap.height));val resized=android.graphics.Bitmap.createScaledBitmap(bitmap,(bitmap.width*scale).toInt().coerceAtLeast(1),(bitmap.height*scale).toInt().coerceAtLeast(1),true)
     val output=java.io.ByteArrayOutputStream();resized.compress(android.graphics.Bitmap.CompressFormat.JPEG,82,output);val bytes=output.toByteArray();require(bytes.size<=2*1024*1024)
     val api=DeviceApi(this);api.call("POST","/devices/${api.deviceId}/images",org.json.JSONObject().put("base64",android.util.Base64.encodeToString(bytes,android.util.Base64.NO_WRAP)).put("childConfirmedShare",true))
     runOnUiThread{if(!isDestroyed)status.text="Selected photo shared with your family. Expires in 24 hours."}
    }catch(_:Exception){runOnUiThread{if(!isDestroyed)status.text="Photo was not confirmed shared. Check pairing, storage configuration and connection."}}}.start()
   }.show()
  }
  button("Close and discard local files"){finish()}
  image=ImageView(this).apply{adjustViewBounds=true};layout.addView(image);setContentView(layout)
 }
 private fun file(suffix:String):File{val dir=File(cacheDir,"checkins").apply{mkdirs()};return File.createTempFile("checkin-",suffix,dir)}
 private fun takePhoto(){stopAudio();photo?.delete();photo=file(".jpg");val uri=FileProvider.getUriForFile(this,"$packageName.checkins",photo!!);try{startActivityForResult(Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION),20)}catch(_:Exception){status.text="No camera application is available.";photo?.delete()}}
 @Deprecated("Android activity callback") override fun onActivityResult(requestCode:Int,resultCode:Int,data:Intent?){super.onActivityResult(requestCode,resultCode,data);if(requestCode==20){if(resultCode==RESULT_OK){image.setImageURI(android.net.Uri.fromFile(photo));status.text="Photo stays on this device. Delete or close to discard."}else{photo?.delete();status.text="Camera cancelled."}}}
 private fun startAudio(){if(recorder!=null)return;player?.release();player=null;audio?.delete();audio=file(".m4a");try{
  recorder=MediaRecorder().apply{setAudioSource(MediaRecorder.AudioSource.MIC);setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);setAudioEncoder(MediaRecorder.AudioEncoder.AAC);setOutputFile(audio!!.absolutePath);setMaxDuration(60000);prepare();start()};started=System.currentTimeMillis();handler.post(tick)
 }catch(_:Exception){stopAudio();audio?.delete();status.text="Microphone unavailable or permission denied."}}
 private fun stopAudio(){handler.removeCallbacks(tick);recorder?.let{try{it.stop()}catch(_:Exception){audio?.delete()};it.release()};if(recorder!=null)status.text="Microphone stopped. Local file will be discarded when closing.";recorder=null}
 override fun onRequestPermissionsResult(requestCode:Int,permissions:Array<out String>,grantResults:IntArray){super.onRequestPermissionsResult(requestCode,permissions,grantResults);if(grantResults.firstOrNull()==PackageManager.PERMISSION_GRANTED){if(requestCode==11)takePhoto();if(requestCode==12)startAudio()}else status.text="Permission denied. No capture started."}
 override fun onStop(){stopAudio();player?.release();player=null;super.onStop()}
 override fun onDestroy(){stopAudio();audio?.delete();photo?.delete();super.onDestroy()}
}
