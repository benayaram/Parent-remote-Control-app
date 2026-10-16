# Capability matrix v1
No physical Android device is attached. All hardware results: UNTESTED.

| Capability | API / standard | Managed requirement | State |
|---|---|---|---|
| Usage | API 26+, user grants Usage Access | same | Native adapter; hardware untested |
| Inventory | Launcher-visible packages only | same partial inventory | Native adapter; partial notice |
| Lock | Active declared device admin | owner also eligible | Native adapter; hardware untested |
| App suspension | Unsupported | device owner + safe package checks | Native adapter; hardware untested |
| Uninstall protection | Unsupported | device owner | Native adapter; hardware untested |
| Kiosk | Unsupported | owner + emergency recovery validation | Disabled pending hardware safety integration |
| Location | Foreground coarse/fine opt in | same | last-known adapter; background/geofences pending |
| DNS filtering | VPN consent required | policy dependent | domain evaluator only; VPN NOT operational |
| Camera/microphone | Child starts visible local session | same | local activity; hardware untested |
| Remote capture | Unsupported | Unsupported | deliberately unavailable |

Target API 35, min API 26. OEM-specific results must be recorded with model, OS build, mode, permissions, date, observed result before marking operational.
