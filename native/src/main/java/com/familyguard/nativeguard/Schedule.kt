package com.familyguard.nativeguard
import java.time.*
data class TimeWindow(val days:Set<Int>,val start:LocalTime,val end:LocalTime){
 fun active(at:ZonedDateTime):Boolean{val time=at.toLocalTime();val day=at.dayOfWeek.value;if(start==end)return false
  return if(start<end)day in days&&time>=start&&time<end else (day in days&&time>=start)||(at.minusDays(1).dayOfWeek.value in days&&time<end)
 }
}
