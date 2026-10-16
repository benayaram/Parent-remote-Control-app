package com.familyguard.nativeguard
import org.junit.Test
import org.junit.Assert.*
class SafetyTest{
 @Test fun overnightWindowsUsePreviousStartDay(){val w=TimeWindow(setOf(5),java.time.LocalTime.of(22,0),java.time.LocalTime.of(7,0));assertTrue(w.active(java.time.ZonedDateTime.parse("2026-10-17T06:00:00Z")));assertFalse(w.active(java.time.ZonedDateTime.parse("2026-10-18T06:00:00Z")));assertFalse(w.active(java.time.ZonedDateTime.parse("2026-10-17T08:00:00Z")))}
 @Test fun locationUncertaintyAndHysteresis(){assertTrue(GeoMath.distance(0.0,0.0,0.0,1.0)>111000);assertEquals(true,GeoMath.inside(20.0,100.0,10.0,false));assertEquals(false,GeoMath.inside(200.0,100.0,10.0,true));assertNull(GeoMath.inside(95.0,100.0,30.0,null));assertEquals(true,GeoMath.inside(500.0,100.0,200.0,true))}
 @Test fun dnsLabelsAndMalformedQueries(){val query=byteArrayOf(1,2,1,0,0,1,0,0,0,0,0,0,7)+"example".toByteArray()+byteArrayOf(4)+"test".toByteArray()+byteArrayOf(0,0,1,0,1);assertEquals("example.test",DnsPacket.domain(query));val denied=DnsPacket.refused(query);assertEquals(3,denied[3].toInt() and 15);assertEquals(0x80,denied[2].toInt() and 0x80);assertNull(DnsPacket.domain(byteArrayOf(0,1)));assertNull(DnsPacket.query(ByteArray(10)))}
}
