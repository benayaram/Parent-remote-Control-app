package com.familyguard.nativeguard
object DnsPacket{
 private fun u(b:Byte)=b.toInt() and 255
 private fun n(b:ByteArray,i:Int)=(u(b[i]) shl 8) or u(b[i+1])
 fun query(packet:ByteArray):ByteArray?{if(packet.size<40||u(packet[0]) shr 4!=4||u(packet[9])!=17)return null;val h=(u(packet[0]) and 15)*4;if(h<20||packet.size<h+20||n(packet,2)>packet.size||(n(packet,6) and 0x3fff)!=0||n(packet,h+2)!=53)return null;val size=n(packet,h+4);if(size<20||h+size>packet.size)return null;return packet.copyOfRange(h+8,h+size)}
 fun domain(dns:ByteArray):String?{if(dns.size<17||n(dns,4)!=1||(u(dns[2]) and 0x80)!=0)return null;var pos=12;val labels=mutableListOf<String>();while(pos<dns.size){val len=u(dns[pos++]);if(len==0)return if(pos+4<=dns.size&&labels.isNotEmpty())labels.joinToString(".").lowercase() else null;if(len>63||pos+len>dns.size)return null;val part=dns.copyOfRange(pos,pos+len).toString(Charsets.US_ASCII);if(!part.all{it.isLetterOrDigit()||it=='-'||it=='_'})return null;labels+=part;pos+=len;if(pos>267)return null};return null}
 fun refused(dns:ByteArray,rcode:Int=3):ByteArray=dns.copyOf().apply{this[2]=(u(this[2]) or 0x80).toByte();this[3]=((u(this[3]) and 0xf0) or rcode).toByte();for(i in 6..11)this[i]=0}
 fun response(packet:ByteArray,dns:ByteArray):ByteArray{val h=(u(packet[0]) and 15)*4;val out=ByteArray(28+dns.size);fun put(i:Int,v:Int){out[i]=(v shr 8).toByte();out[i+1]=v.toByte()};out[0]=0x45;put(2,out.size);out[8]=64;out[9]=17;packet.copyInto(out,12,16,20);packet.copyInto(out,16,12,16);out[20]=packet[h+2];out[21]=packet[h+3];out[22]=packet[h];out[23]=packet[h+1];put(24,8+dns.size);dns.copyInto(out,28);var sum=0;for(i in 0 until 20 step 2)sum+=n(out,i);while(sum shr 16!=0)sum=(sum and 65535)+(sum shr 16);put(10,sum.inv() and 65535);return out}
}
