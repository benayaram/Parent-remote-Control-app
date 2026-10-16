package com.familyguard.nativeguard
import java.time.Instant
import java.time.ZoneId
import java.time.LocalDate
// Foreground events are clipped to local day boundaries. Incomplete intervals are
// marked partial by the adapter; events are not a complete source of OS truth.
data class ForegroundEvent(val time:Long,val packageName:String,val resumed:Boolean)
object PolicyEngine {
 fun aggregate(events:List<ForegroundEvent>,start:Long,end:Long):Map<String,Long>{
  val totals=mutableMapOf<String,Long>();var active:String?=null;var since=start
  for(e in events.sortedBy{it.time}){
   if(e.time>end)break
   if(e.resumed){if(active!=null&&e.time>start)totals[active!!]=(totals[active!!]?:0)+(e.time-maxOf(start,since)).coerceAtLeast(0);active=e.packageName;since=e.time}
   else if(active==e.packageName){totals[e.packageName]=(totals[e.packageName]?:0)+(minOf(end,e.time)-maxOf(start,since)).coerceAtLeast(0);active=null}
  }
  if(active!=null)totals[active!!]=(totals[active!!]?:0)+(end-maxOf(start,since)).coerceAtLeast(0)
  return totals.mapValues{it.value/1000}
 }
 fun bounds(day:LocalDate,zone:ZoneId):Pair<Long,Long> = day.atStartOfDay(zone).toInstant().toEpochMilli() to day.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()
 fun expired(iso:String,now:Long)=Instant.parse(iso).toEpochMilli()<=now
 fun domainBlocked(host:String,deny:List<String>,allow:List<String>):Boolean{
  val d=host.lowercase().trimEnd('.');fun matches(x:String):Boolean{val n=x.lowercase().trimEnd('.');return d==n||d.endsWith(".$n")}
  return !allow.any(::matches)&&deny.any(::matches)
 }
}
