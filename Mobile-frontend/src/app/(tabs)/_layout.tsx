import { NativeTabs } from 'expo-router/build/native-tabs';
import { Colors, Fonts } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={Colors.primary}
      iconColor={Colors.text.muted}
      labelStyle={{ color: Colors.text.muted, fontFamily: Fonts.semibold }}
      backgroundColor={Colors.background}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="Loan">
        <NativeTabs.Trigger.Label>Loans</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="banknote.fill" md="account_balance" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="Repay">
        <NativeTabs.Trigger.Label>Repay</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="creditcard.fill" md="payments" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="Settings">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
