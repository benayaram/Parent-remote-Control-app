package com.familyguard.nativeguard
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.UUID
class Identity(private val context: Context) {
 private val alias="familyguard.device.p256"
 private fun store()=KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
 @Synchronized fun ensureKey(){if(!store().containsAlias(alias))KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC,"AndroidKeyStore").apply {initialize(KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY).setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1")).setDigests(KeyProperties.DIGEST_SHA256).build())}.generateKeyPair()}
 fun publicKey():String{ensureKey();val b=Base64.encodeToString(store().getCertificate(alias).publicKey.encoded,Base64.NO_WRAP).chunked(64).joinToString("\n");return "-----BEGIN PUBLIC KEY-----\n$b\n-----END PUBLIC KEY-----\n"}
 fun headers(method:String,path:String,body:String):Map<String,String>{
  ensureKey();val prefs=context.getSharedPreferences("device",0);val id=prefs.getString("id",null)?:error("Not paired")
  val time=System.currentTimeMillis().toString();val nonce=UUID.randomUUID().toString();val hash=MessageDigest.getInstance("SHA-256").digest(body.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
  val message=listOf(method.uppercase(),path,time,nonce,hash).joinToString("\n")
  val key=store().getKey(alias,null) as java.security.PrivateKey
  val signature=Signature.getInstance("SHA256withECDSA").apply{initSign(key);update(message.toByteArray(Charsets.UTF_8))}.sign()
  return mapOf("x-device-id" to id,"x-device-time" to time,"x-device-nonce" to nonce,"x-device-signature" to Base64.encodeToString(signature,Base64.NO_WRAP))
 }
}
