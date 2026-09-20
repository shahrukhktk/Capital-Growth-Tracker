import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTracker } from '@/context/TrackerContext';
import { formatMoney } from '@/lib/calculations';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { snapshot, updateSettings, resetTracker } = useTracker();
  const [capital, setCapital] = useState(String(snapshot.settings.initialCapital));
  const [target, setTarget] = useState(String(snapshot.settings.dailyTargetPct));

  const saveNumber = (key: 'initialCapital' | 'dailyTargetPct', value: string) => {
    const amount = Number(value.replace(',', '.'));
    if (Number.isFinite(amount) && amount >= 0) updateSettings({ [key]: amount });
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.accentForeground }]}>CONFIGURATION</Text><Text style={[styles.title, { color: colors.foreground }]}>Tracking settings</Text></View><View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}><Feather name="sliders" size={18} color={colors.accentForeground} /></View></View>
      <View style={[styles.introCard, { backgroundColor: colors.navy }]}>
        <Text style={styles.introTitle}>Keep the model honest.</Text>
        <Text style={styles.introCopy}>Change your assumptions here and every future target, graph point, monthly card, and projection will recalculate together.</Text>
      </View>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CORE ASSUMPTIONS</Text>
      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Starting capital</Text><Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>Used to rebuild actual history</Text><View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}><Text style={[styles.prefix, { color: colors.mutedForeground }]}>SAR</Text><TextInput value={capital} onChangeText={setCapital} onEndEditing={() => saveNumber('initialCapital', capital)} keyboardType="decimal-pad" style={[styles.input, { color: colors.foreground }]} /></View></View>
        <View style={styles.divider} />
        <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Daily target</Text><Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>Compounded on active tracking days</Text><View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}><TextInput value={target} onChangeText={setTarget} onEndEditing={() => saveNumber('dailyTargetPct', target)} keyboardType="decimal-pad" style={[styles.input, { color: colors.foreground }]} /><Text style={[styles.prefix, { color: colors.mutedForeground }]}>%</Text></View></View>
      </View>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACTIVE TRACKING DAYS</Text>
      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>Choose which weekdays receive a target. Seeded actual records remain visible even if their weekday is turned off.</Text>
        <View style={styles.weekRow}>
          {weekdayLabels.map((label, index) => {
            const active = snapshot.settings.tradingDays.includes(index);
            return <Pressable key={label} onPress={() => updateSettings({ tradingDays: active ? snapshot.settings.tradingDays.filter((day) => day !== index) : [...snapshot.settings.tradingDays, index].sort() })} style={[styles.dayButton, { backgroundColor: active ? colors.navy : colors.background, borderColor: active ? colors.navy : colors.border }]}><Text style={[styles.dayText, { color: active ? colors.white : colors.mutedForeground }]}>{label}</Text><View style={[styles.dayDot, { backgroundColor: active ? colors.primary : colors.border }]} /></Pressable>;
          })}
        </View>
      </View>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TRACKING WINDOW</Text>
      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.readonlyRow}><View><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Official start</Text><Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>19 September 2026</Text></View><Feather name="calendar" size={18} color={colors.mutedForeground} /></View>
        <View style={styles.divider} />
        <View style={styles.readonlyRow}><View><Text style={[styles.fieldLabel, { color: colors.foreground }]}>Projection end</Text><Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>31 December 2026</Text></View><Feather name="calendar" size={18} color={colors.mutedForeground} /></View>
      </View>
      <View style={[styles.reconcileCard, { backgroundColor: colors.secondary }]}>
        <View style={[styles.reconcileIcon, { backgroundColor: colors.accent }]}><Feather name="shield" size={16} color={colors.accentForeground} /></View>
        <View style={styles.reconcileCopy}><Text style={[styles.reconcileTitle, { color: colors.foreground }]}>Numbers reconcile</Text><Text style={[styles.reconcileText, { color: colors.mutedForeground }]}>{formatMoney(snapshot.currentCapital)} current capital · {snapshot.records.length} actual records</Text></View>
      </View>
      <Pressable onPress={() => Alert.alert('Reset tracker?', 'This restores the two seeded September records and default assumptions.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: resetTracker }])} style={({ pressed }) => [styles.resetButton, { opacity: pressed ? 0.6 : 1 }]}><Feather name="rotate-ccw" size={15} color={colors.destructive} /><Text style={[styles.resetText, { color: colors.destructive }]}>Reset seeded tracker</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 15 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: 10, letterSpacing: 1.4, fontWeight: '700' },
  title: { fontSize: 27, fontWeight: '700', letterSpacing: -0.8, marginTop: 5 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  introCard: { borderRadius: 21, padding: 19, gap: 7 },
  introTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  introCopy: { color: '#A9C1B9', fontSize: 12, lineHeight: 18 },
  sectionLabel: { fontSize: 10, letterSpacing: 1.4, fontWeight: '700', marginTop: 7 },
  formCard: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 4 },
  field: { paddingVertical: 13, gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  fieldHint: { fontSize: 11, lineHeight: 16 },
  inputWrap: { marginTop: 6, borderRadius: 11, borderWidth: 1, height: 45, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  prefix: { fontSize: 13, fontWeight: '700' },
  input: { flex: 1, fontSize: 16, fontWeight: '700', paddingVertical: 0, marginHorizontal: 8 },
  divider: { height: 1, backgroundColor: '#EDF1ED' },
  weekRow: { flexDirection: 'row', gap: 6, marginVertical: 14 },
  dayButton: { flex: 1, height: 54, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  dayText: { fontSize: 10, fontWeight: '700' },
  dayDot: { width: 5, height: 5, borderRadius: 3 },
  readonlyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  reconcileCard: { borderRadius: 16, padding: 13, flexDirection: 'row', gap: 10, alignItems: 'center' },
  reconcileIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reconcileCopy: { flex: 1 },
  reconcileTitle: { fontSize: 12, fontWeight: '700' },
  reconcileText: { fontSize: 10, marginTop: 3 },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12 },
  resetText: { fontSize: 12, fontWeight: '700' },
});