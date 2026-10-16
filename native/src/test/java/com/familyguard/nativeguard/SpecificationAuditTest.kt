package com.familyguard.nativeguard
import org.junit.Test
import org.junit.Assert.*
import java.time.*
/** Additional pure JVM acceptance checks; these are not Android device tests. */
class SpecificationAuditTest{
 @Test fun usageClipsBothMidnightEdges(){val usage=PolicyEngine.aggregate(listOf(ForegroundEvent(0,"a",true),ForegroundEvent(5000,"a",false)),1000,4000);assertEquals(mapOf("a" to 3L),usage)}
 @Test fun usageBackgroundBeforeDayDoesNotLeakIntoNextDay(){val usage=PolicyEngine.aggregate(listOf(ForegroundEvent(0,"a",true),ForegroundEvent(500,"a",false)),1000,4000);assertEquals(0L,usage["a"]?:0L)}
 @Test fun packageSwitchesDoNotDoubleCountTime(){val usage=PolicyEngine.aggregate(listOf(ForegroundEvent(0,"a",true),ForegroundEvent(2000,"b",true),ForegroundEvent(5000,"b",false)),0,5000);assertEquals(2L,usage["a"]);assertEquals(3L,usage["b"]);assertEquals(5L,usage.values.sum())}
 @Test fun halfHourTimezoneUsesLocalMidnight(){val(a,b)=PolicyEngine.bounds(LocalDate.of(2026,10,16),ZoneId.of("Asia/Kolkata"));assertEquals(Instant.parse("2026-10-15T18:30:00Z").toEpochMilli(),a);assertEquals(86400000L,b-a)}
 @Test fun schoolWindowStartInclusiveEndExclusive(){val w=TimeWindow(setOf(5),LocalTime.of(9,0),LocalTime.of(15,0));assertTrue(w.active(ZonedDateTime.parse("2026-10-16T09:00:00Z")));assertFalse(w.active(ZonedDateTime.parse("2026-10-16T15:00:00Z")));assertFalse(w.active(ZonedDateTime.parse("2026-10-17T10:00:00Z")))}
 @Test fun denyBoundaryAndAllowSubdomainAreExact(){assertTrue(PolicyEngine.domainBlocked("ADS.Example.Test.",listOf("example.test"),emptyList()));assertFalse(PolicyEngine.domainBlocked("badexample.test",listOf("example.test"),emptyList()));assertFalse(PolicyEngine.domainBlocked("cdn.school.example.test",listOf("example.test"),listOf("school.example.test")))}
 @Test fun dnsUdpReplyMirrorsAddressesPortsAndHasValidIpChecksum(){
  val query=byteArrayOf(1,2,1,0,0,1,0,0,0,0,0,0,7)+"example".toByteArray()+byteArrayOf(4)+"test".toByteArray()+byteArrayOf(0,0,1,0,1)
  val packet=ByteArray(28+query.size);fun put(i:Int,v:Int){packet[i]=(v shr 8).toByte();packet[i+1]=v.toByte()};packet[0]=0x45;put(2,packet.size);packet[8]=64;packet[9]=17;byteArrayOf(10,83,0,1).copyInto(packet,12);byteArrayOf(10,83,0,2).copyInto(packet,16);put(20,53001);put(22,53);put(24,query.size+8);query.copyInto(packet,28)
  assertArrayEquals(query,DnsPacket.query(packet));val reply=DnsPacket.response(packet,DnsPacket.refused(query));assertArrayEquals(byteArrayOf(10,83,0,2),reply.copyOfRange(12,16));assertArrayEquals(byteArrayOf(10,83,0,1),reply.copyOfRange(16,20));assertEquals(53,((reply[20].toInt() and 255) shl 8) or (reply[21].toInt() and 255));var sum=0;for(i in 0 until 20 step 2)sum+=((reply[i].toInt() and 255) shl 8) or (reply[i+1].toInt() and 255);while(sum shr 16!=0)sum=(sum and 65535)+(sum shr 16);assertEquals(65535,sum)
 }
 @Test fun expiryRejectsExactDeadline(){val now=Instant.parse("2026-10-16T10:00:00Z").toEpochMilli();assertTrue(PolicyEngine.expired("2026-10-16T10:00:00Z",now));assertFalse(PolicyEngine.expired("2026-10-16T10:00:01Z",now))}
}
