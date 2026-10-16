# Permission and consent map

| Permission / declaration                                            | Feature and API                                   | Consent/revocation                                                                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| INTERNET                                                            | Both apps HTTPS API/Firebase                      | No runtime prompt; TLS mandatory                                                                                             |
| POST_NOTIFICATIONS                                                  | API 33+ reminders, FCM/visible services           | Requested from relevant child/parent actions; denial does not imply alerts delivered                                         |
| PACKAGE_USAGE_STATS                                                 | Child usage app-op                                | User opens Usage Access settings; denied/revoked means no fabricated report                                                  |
| ACCESS_COARSE_LOCATION / ACCESS_FINE_LOCATION                       | Child opt-in location/geofences                   | Ask at Share/Start; approximate fixes handled with accuracy uncertainty; denial graceful                                     |
| FOREGROUND_SERVICE / FOREGROUND_SERVICE_LOCATION                    | User-started visible location sharing             | Persistent notification/Stop; not secretly started in background; no BACKGROUND_LOCATION                                     |
| FOREGROUND_SERVICE_SPECIAL_USE, BIND_VPN_SERVICE service permission | Explicitly user-approved DNS VPN                  | System VPN approval, visible notification/Stop; conflicts and bypass limitations disclosed; Play special-use review required |
| CAMERA                                                              | Child-started external camera/photo check-in only | Just-in-time prompt; no capture when denied; visible camera and local preview                                                |
| RECORD_AUDIO                                                        | Child-started visible voice check-in only         | Separate prompt; visible status, 60s max, stop on leaving; local playback/delete; no upload                                  |
| BIND_DEVICE_ADMIN receiver permission                               | Declared force-lock only                          | System device-admin consent. Active admin is not device owner; never grants owner restrictions                               |
| narrow launcher/camera queries                                      | Partial inventory/camera app discovery            | No QUERY_ALL_PACKAGES; incomplete inventory clearly labeled                                                                  |

Monitoring-tool metadata: child_monitoring. No accessibility listener, SMS/call-log permissions, notification-content interception, MediaProjection, screenshots or arbitrary shell/root access. Parent has no capture permission.

The user superseded the original blanket camera/microphone exclusion. Capture remains child-started and visible. A photo uploads to Firebase Storage ONLY after a separate explicit Share confirmation; authorized parents may view that selected photo for 24h. Local unshared files are discarded on close; interrupted-process cache is cleaned on next check-in open. Voice stays local and is never a remote command.

Review both final merged app manifests/transitive dependencies, foreground service declarations, current monitoring policy, Data Safety and privacy disclosures before release. Source audit and native library build do not replace this review or hardware tests.
