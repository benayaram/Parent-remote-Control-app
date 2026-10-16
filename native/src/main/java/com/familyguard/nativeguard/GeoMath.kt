package com.familyguard.nativeguard
import kotlin.math.*
object GeoMath{
 fun distance(lat1:Double,lng1:Double,lat2:Double,lng2:Double):Double{val r=6371000.0;val a=Math.toRadians(lat2-lat1);val b=Math.toRadians(lng2-lng1);val h=sin(a/2).pow(2)+cos(Math.toRadians(lat1))*cos(Math.toRadians(lat2))*sin(b/2).pow(2);return 2*r*asin(sqrt(h.coerceIn(0.0,1.0)))}
 // Hysteresis and uncertainty keep noisy fixes from creating false transitions.
 fun inside(distance:Double,radius:Double,accuracy:Double,previous:Boolean?):Boolean?{if(accuracy>radius)return previous;if(distance+accuracy<radius)return true;if(distance-accuracy>radius+30)return false;return previous}
}
