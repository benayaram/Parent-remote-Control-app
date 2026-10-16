package com.familyguard.nativeguard
import org.junit.Test
import org.junit.Assert.*
import java.time.*
class PolicyEngineTest{
 @Test fun clipsAndHandlesSwitches(){val e=listOf(ForegroundEvent(0,"a",true),ForegroundEvent(3000,"b",true),ForegroundEvent(6000,"b",false));val x=PolicyEngine.aggregate(e,1000,5000);assertEquals(2L,x["a"]);assertEquals(2L,x["b"])}
 @Test fun midnightAndDst(){val z=ZoneId.of("America/New_York");val(a,b)=PolicyEngine.bounds(LocalDate.of(2026,3,8),z);assertEquals(23*3600000L,b-a);val(c,d)=PolicyEngine.bounds(LocalDate.of(2026,11,1),z);assertEquals(25*3600000L,d-c)}
 @Test fun expiryAndDomainBoundaries(){assertTrue(PolicyEngine.expired("2026-10-16T00:00:00Z",Instant.parse("2026-10-16T00:00:00Z").toEpochMilli()));assertFalse(PolicyEngine.domainBlocked("notexample.test",listOf("example.test"),emptyList()));assertTrue(PolicyEngine.domainBlocked("ads.example.test",listOf("example.test"),emptyList()));assertFalse(PolicyEngine.domainBlocked("safe.example.test",listOf("example.test"),listOf("safe.example.test")))}
}
