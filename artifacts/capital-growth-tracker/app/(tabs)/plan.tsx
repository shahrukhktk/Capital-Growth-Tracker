import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTracker } from '@/context/TrackerContext';
import { formatLongDate, formatMoney, formatShortDate } from '@/lib/calculations';

export default function MonthlyPlanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { snapshot } = useTracker();
  const params = useLocalSearchParams<{ month?: string }>();
  const selectedKey = Array.isArray(params.month) ? params.month[0] : params.month;
  const selectedMonth = snapshot.monthly.find((month) => month.key === selectedKey) ?? snapshot.monthly[0];
  const entries = useMemo(
    () => snapshot.dailyEntries.filter((entry) => entry.date.startsWith(selectedMonth.key)),
    [selectedMonth.key, snapshot.dailyEntries],
  );

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View><Text style={[styles.eyebrow, { color: colors.accentForeground }]}>MONTHLY PLAN</Text><Text style={[styles.title, { color: colors.foreground }]}>Your performance</Text></View>
        <View style={[styles.monthCount, { backgroundColor: colors.secondary }]}><Text style={[styles.monthCountText, { color: colors.accentForeground }]}>{snapshot.monthly.length} months</Text></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthTabs}>
        {snapshot.monthly.map((month) => (
          <Pressable key={month.key} onPress={() => router.setParams({ month: month.key })} style={[styles.monthTab, { backgroundColor: month.key === selectedMonth.key ? colors.navy : colors.card, borderColor: colors.border }]}>
            <Text style={[styles.monthTabText, { color: month.key === selectedMonth.key ? colors.white : colors.mutedForeground }]}>{month.label.split(' ')[0]}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.summaryTop}><View><Text style={[styles.monthTitle, { color: colors.foreground }]}>{selectedMonth.label}</Text><Text style={[styles.subtle, { color: colors.mutedForeground }]}>{selectedMonth.isUpcoming ? 'Upcoming' : `${selectedMonth.completedDays} completed tracking days`}</Text></View><View style={[styles.statusPill, { backgroundColor: selectedMonth.isUpcoming ? colors.secondary : colors.accent }]}><Text style={[styles.statusPillText, { color: colors.accentForeground }]}>{selectedMonth.isUpcoming ? 'PROJECTED' : 'IN PROGRESS'}</Text></View></View>
        <View style={styles.bigMetric}><Text style={[styles.bigNumber, { color: colors.foreground }]}>{formatMoney(selectedMonth.currentCapital ?? selectedMonth.projectedMonthEndBalance)}</Text><Text style={[styles.subtle, { color: colors.mutedForeground }]}>Current / projected closing balance</Text></View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}><View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min(100, selectedMonth.progress)}%` }]} /></View>
        <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>{Math.round(selectedMonth.progress)}% of tracking days completed</Text>
      </View>
      <View style={styles.metricsGrid}>
        {[
          ['Starting balance', formatMoney(selectedMonth.startingBalance)],
          ['Target profit', formatMoney(selectedMonth.targetProfit, true)],
          ['Actual profit', selectedMonth.completedDays ? formatMoney(selectedMonth.actualProfit, true) : 'Projected'],
          ['Achievement rate', selectedMonth.completedDays ? `${selectedMonth.achievementRate.toFixed(0)}%` : '—'],
          ['Days remaining', String(selectedMonth.remainingDays)],
          ['Targets missed', String(selectedMonth.targetsMissed)],
        ].map(([label, value]) => (
          <View key={label} style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text></View>
        ))}
      </View>
      <View style={styles.sectionHeader}><View><Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>DAILY RECORDS</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{selectedMonth.label}</Text></View></View>
      <View style={[styles.recordsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {entries.map((entry) => {
          const isActual = entry.actualBalance !== undefined;
          const statusLabel = entry.status === 'achieved' ? 'Achieved' : entry.status === 'partial' ? 'Partial' : entry.status === 'loss' ? 'Loss' : entry.status === 'skipped' ? 'Skipped' : entry.date === snapshot.nextTargetDate ? 'Pending' : 'Upcoming';
          return (
            <View key={entry.date} style={styles.recordRow}>
              <View style={[styles.recordDateBox, { backgroundColor: isActual ? colors.accent : colors.background }]}><Text style={[styles.recordDay, { color: isActual ? colors.accentForeground : colors.foreground }]}>{new Date(`${entry.date}T00:00:00`).getDate()}</Text><Text style={[styles.recordMonth, { color: colors.mutedForeground }]}>{formatShortDate(entry.date).split(' ')[1]}</Text></View>
              <View style={styles.recordCopy}><Text style={[styles.recordDate, { color: colors.foreground }]}>{formatLongDate(entry.date)}</Text><Text style={[styles.recordType, { color: colors.mutedForeground }]}>{isActual ? `Actual ${formatMoney(entry.actualProfit ?? 0, true)}` : `Target ${formatMoney(entry.targetProfit, true)}`}</Text></View>
              <View style={styles.recordStatus}><Text style={[styles.recordStatusLabel, { color: isActual ? colors.accentForeground : colors.mutedForeground }]}>{statusLabel}</Text><Feather name={isActual ? 'check-circle' : 'clock'} size={15} color={isActual ? colors.primary : colors.mutedForeground} /></View>
            </View>
          );
        })}
      </View>
      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>Future values are targets only and are never counted as completed transactions.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 15 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { fontSize: 10, letterSpacing: 1.4, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.7, marginTop: 5 },
  monthCount: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  monthCountText: { fontSize: 11, fontWeight: '700' },
  monthTabs: { gap: 8 },
  monthTab: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  monthTabText: { fontSize: 12, fontWeight: '700' },
  summaryCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  monthTitle: { fontSize: 18, fontWeight: '700' },
  subtle: { fontSize: 11, marginTop: 4 },
  statusPill: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  statusPillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  bigMetric: { marginTop: 2 },
  bigNumber: { fontSize: 27, fontWeight: '700', letterSpacing: -0.8 },
  progressTrack: { height: 7, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 5 },
  progressLabel: { fontSize: 10 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: { width: '31%', minHeight: 73, borderRadius: 14, borderWidth: 1, padding: 10, justifyContent: 'space-between' },
  metricLabel: { fontSize: 10, lineHeight: 13 },
  metricValue: { fontSize: 13, fontWeight: '700' },
  sectionHeader: { marginTop: 3 },
  sectionTitle: { fontSize: 19, fontWeight: '700', marginTop: 4 },
  recordsCard: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12 },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8E0D6' },
  recordDateBox: { width: 41, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recordDay: { fontSize: 16, fontWeight: '700' },
  recordMonth: { fontSize: 9, marginTop: 1, textTransform: 'uppercase' },
  recordCopy: { flex: 1 },
  recordDate: { fontSize: 12, fontWeight: '700' },
  recordType: { fontSize: 10, marginTop: 4 },
  recordStatus: { alignItems: 'flex-end', gap: 5 },
  recordStatusLabel: { fontSize: 10, fontWeight: '700' },
  disclaimer: { fontSize: 10, lineHeight: 15, marginBottom: 4 },
});