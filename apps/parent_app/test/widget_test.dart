import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:familyguard_ui/familyguard_ui.dart';
void main(){testWidgets('disclosure and configuration state are honest',(tester) async {
 await tester.pumpWidget(const MaterialApp(home: ConfigurationNotice()));
 expect(find.text('FamilyGuard setup'),findsOneWidget);
 expect(find.textContaining('Firebase'),findsWidgets);
});}
