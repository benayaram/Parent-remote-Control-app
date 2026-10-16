#!/usr/bin/env python3
"""Audit source manifests, plus any merged manifests produced by Android builds."""
from pathlib import Path
import xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]
android='{http://schemas.android.com/apk/res/android}'
forbidden={'android.permission.QUERY_ALL_PACKAGES','android.permission.READ_SMS','android.permission.READ_CALL_LOG','android.permission.BIND_ACCESSIBILITY_SERVICE','android.permission.ACCESS_BACKGROUND_LOCATION'}
paths=list(root.glob('apps/*/android/app/src/main/AndroidManifest.xml'))+[root/'native/src/main/AndroidManifest.xml']
paths+=list(root.glob('apps/*/build/**/merged_manifests/**/AndroidManifest.xml'))
for path in paths:
 tree=ET.parse(path);permissions={e.attrib.get(android+'name') for e in tree.iter('uses-permission')}
 assert not permissions&forbidden,(str(path),permissions&forbidden)
 if 'parent_app' in str(path):assert not permissions&{'android.permission.CAMERA','android.permission.RECORD_AUDIO'},'Parent capture permission forbidden'
 print('PASS',path.relative_to(root),sorted(permissions))
print('Release gate: both app merged manifests must also be audited after APK builds. Child-only capture is the documented user override.')
