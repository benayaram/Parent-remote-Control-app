package com.familyguard.nativeguard
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.room.*
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import java.security.KeyStore
@Entity(tableName="policies") data class CachedPolicy(@PrimaryKey val id:String="active",val encrypted:String,val updatedAt:Long)
@Dao interface PolicyDao{@Query("SELECT * FROM policies WHERE id='active'") fun active():CachedPolicy?;@Insert(onConflict=OnConflictStrategy.REPLACE) fun put(row:CachedPolicy)}
@Database(entities=[CachedPolicy::class],version=1,exportSchema=false) abstract class GuardDb:RoomDatabase(){abstract fun policies():PolicyDao}
class LocalCache(context:Context){
 companion object{@Volatile private var instance:GuardDb?=null;private fun database(context:Context):GuardDb=instance?:synchronized(this){instance?:Room.databaseBuilder(context.applicationContext,GuardDb::class.java,"familyguard.db").build().also{instance=it}}}
 private val db=database(context)
 private val alias="familyguard.policy.aes"
 @Synchronized private fun key():SecretKey{val ks=KeyStore.getInstance("AndroidKeyStore").apply{load(null)};if(!ks.containsAlias(alias))KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply{init(KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())}.generateKey();return ks.getKey(alias,null) as SecretKey}
 fun save(json:String){val cipher=Cipher.getInstance("AES/GCM/NoPadding").apply{init(Cipher.ENCRYPT_MODE,key())};val bytes=cipher.iv+cipher.doFinal(json.toByteArray(Charsets.UTF_8));db.policies().put(CachedPolicy(encrypted=Base64.encodeToString(bytes,Base64.NO_WRAP),updatedAt=System.currentTimeMillis()))}
 fun read():String?{val row=db.policies().active()?:return null;val bytes=Base64.decode(row.encrypted,Base64.NO_WRAP);return Cipher.getInstance("AES/GCM/NoPadding").apply{init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,bytes.copyOfRange(0,12)))}.doFinal(bytes.copyOfRange(12,bytes.size)).toString(Charsets.UTF_8)}
}
