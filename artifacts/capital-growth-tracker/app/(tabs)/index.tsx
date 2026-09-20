import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTracker } from '@/context/TrackerContext';
import {
  DailyEntry,
  formatLongDate,
  formatMoney,
  formatShortDate,
  roundMoney,
} from '@/lib/calculations';

type Range = '7D' | '30D' | 'Monthly' | 'Until Dec';
const screenWidth = Dimensions.get('window').width;

function formatAxisValue(value: number) {
  const absoluteValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const compact = (divisor: number, suffix: string) => {
    const amount = absoluteValue / divisor;
    const decimals = amount >= 100 ? 0 : 1;
    return `SAR ${sign}${amount.toFixed(decimals).replace(/\.0$/, '')}${suffix}`;
  };

  if (absoluteValue >= 1_000_000_000) return compact(1_000_000_000, 'B');
  if (absoluteValue >= 1_000_000) return compact(1_000_000, 'M');
  if (absoluteValue >= 1_000) return compact(1_000, 'K');
  return `SAR ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function StatChip({ icon, label, value, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.statChip, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed && onPress ? 0.72 : 1 }]}
    >
      <View style={[styles.statIcon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={14} color={colors.accentForeground} /></View>
      <View><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text></View>
    </Pressable>
  );
}

function Chart({ entries, onSelect, selectedDate }: { entries: DailyEntry[]; onSelect: (entry: DailyEntry) => void; selectedDate?: string }) {
  const colors = useColors();
  const [width, setWidth] = useState(screenWidth - 56 - 78);
  const height = 190;
  const actuals = entries.flatMap((entry) => (entry.actualBalance ? [entry.actualBalance] : []));
  const values = [...entries.map((entry) => entry.targetBalance), ...actuals];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, max);
  const range = Math.max(max - min, 1);
  const yAxisValues = [0, 1, 2, 3].map((step) => max - (range * step) / 3);
  const x = (index: number) => (entries.length > 1 ? (index / (entries.length - 1)) * (width - 16) + 8 : width / 2);
  const y = (value: number) => height - 20 - ((value - min) / range) * (height - 38);
  const pathFor = (items: Array<{ index: number; value: number }>) => items.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.index)} ${y(point.value)}`).join(' ');
  const targetPath = pathFor(entries.map((entry, index) => ({ index, value: entry.targetBalance })));
  const actualPoints = entries.flatMap((entry, index) => entry.actualBalance === undefined ? [] : [{ index, value: entry.actualBalance }]);
  const actualPath = pathFor(actualPoints);
  const labelIndexes = entries.length > 1 ? [0, Math.floor((entries.length - 1) / 2), entries.length - 1] : [0];

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartRow}>
        <View style={styles.yAxisLabels}>
          {yAxisValues.map((value, index) => (
            <Text key={index} style={[styles.yAxisLabel, { color: colors.mutedForeground }]}>{formatAxisValue(value)}</Text>
          ))}
        </View>
        <View style={styles.chartArea} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          <Svg width={width} height={height}>
            {[0, 1, 2, 3].map((line) => {
              const lineY = 14 + (line / 3) * (height - 38);
              return <Line key={line} x1="0" x2={width} y1={lineY} y2={lineY} stroke={colors.border} strokeWidth="1" />;
            })}
            <Path d={targetPath} fill="none" stroke={colors.gold} strokeWidth="3" strokeLinecap="round" />
            {actualPath ? <Path d={actualPath} fill="none" stroke={colors.primary} strokeWidth="3" strokeLinecap="round" /> : null}
            {entries.map((entry, index) => (
              <Circle key={entry.date} cx={x(index)} cy={y(entry.targetBalance)} r={selectedDate === entry.date ? 6 : 4} fill={colors.card} stroke={colors.gold} strokeWidth="2" onPress={() => onSelect(entry)} />
            ))}
            {entries.map((entry, index) => entry.actualBalance === undefined ? null : (
              <Circle key={`actual-${entry.date}`} cx={x(index)} cy={y(entry.actualBalance)} r={selectedDate === entry.date ? 6 : 4} fill={colors.primary} stroke={colors.card} strokeWidth="2" onPress={() => onSelect(entry)} />
            ))}
          </Svg>
          <View style={styles.chartLabels}>{labelIndexes.map((index) => <Text key={entries[index].date} style={[styles.chartLabel, { color: colors.mutedForeground }]}>{formatShortDate(entries[index].date)}</Text>)}</View>
        </View>
      </View>
    </View>
  );
}

function ActualEntryModal({ visible, onClose, date, targetProfit, onSave }: { visible: boolean; onClose: () => void; date: string; targetProfit: number; onSave: (value: number) => void }) {
  const colors = useColors();
  const [value, setValue] = useState(String(targetProfit.toFixed(2)));
  const [error, setError] = useState('');
  function submit() {
    const amount = Number(value.replace(',', '.'));
    if (!Number.isFinite(amount)) { setError('Enter a valid profit amount.'); return; }
    onSave(amount);
    setValue(String(targetProfit.toFixed(2)));
    setError('');
  }
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View><Text style={[styles.modalEyebrow, { color: colors.accentForeground }]}>DAILY RESULT</Text><Text style={[styles.modalTitle, { color: colors.foreground }]}>Enter actual result</Text></View>
            <Pressable onPress={onClose} hitSlop={12}><Feather name="x" size={22} color={colors.mutedForeground} /></Pressable>
          </View>
          <Text style={[styles.modalDate, { color: colors.mutedForeground }]}>{formatLongDate(date)}</Text>
          <View style={[styles.targetHint, { backgroundColor: colors.secondary }]}><Text style={[styles.targetHintLabel, { color: colors.mutedForeground }]}>Target profit</Text><Text style={[styles.targetHintValue, { color: colors.accentForeground }]}>{formatMoney(targetProfit)}</Text></View>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>Actual profit</Text>
          <View style={[styles.currencyInput, { borderColor: colors.border, backgroundColor: colors.background }]}><Text style={[styles.currencyPrefix, { color: colors.mutedForeground }]}>SAR</Text><TextInput value={value} onChangeText={setValue} keyboardType="decimal-pad" style={[styles.input, { color: colors.foreground }]} autoFocus selectTextOnFocus /></View>
          {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
          <Pressable onPress={submit} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.84 : 1 }]}><Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>SAVE ACTUAL RESULT</Text><Feather name="check" size={17} color={colors.primaryForeground} /></Pressable>
          <Text style={[styles.modalNote, { color: colors.mutedForeground }]}>Your actual balance will be recalculated across all records.</Text>
        </View>
      </View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { snapshot, hydrated, addRecord } = useTracker();
  const [range, setRange] = useState<Range>('30D');
  const [insightView, setInsightView] = useState<'performance' | 'projection'>('performance');
  const [selectedDate, setSelectedDate] = useState(snapshot.latestActualDate);
  const [showEntry, setShowEntry] = useState(false);
  const [activeEntry, setActiveEntry] = useState(snapshot.dailyEntries.find((entry) => entry.date === snapshot.nextTargetDate));
  const chartEntries = useMemo(() => {
    const all = snapshot.dailyEntries;
    if (range === 'Until Dec') return all;
    if (range === '7D') return all.slice(0, Math.min(7, all.length));
    if (range === 'Monthly') return all.filter((entry) => entry.date.endsWith('-01') || entry.date === snapshot.latestActualDate || entry.date === snapshot.settings.projectionEndDate);
    return all.slice(0, Math.min(30, all.length));
  }, [range, snapshot]);
  const selectedEntry = snapshot.dailyEntries.find((entry) => entry.date === selectedDate) ?? snapshot.dailyEntries[0];
  const nextEntry = snapshot.dailyEntries.find((entry) => entry.date === snapshot.nextTargetDate);
  const onSaveActual = (amount: number) => {
    if (!activeEntry) return;
    addRecord(activeEntry.date, roundMoney(amount));
    setShowEntry(false);
  };
  const monthlyPlanSection = (
    <>
      <View style={styles.sectionHeader}><View><Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>MONTHLY PLAN</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your plan at a glance</Text></View><Pressable onPress={() => router.push('/plan')}><Text style={[styles.linkText, { color: colors.accentForeground }]}>View all</Text></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthScroll}>{snapshot.monthly.map((month) => <Pressable key={month.key} onPress={() => router.push(`/plan?month=${month.key}`)} style={({ pressed }) => [styles.monthCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.78 : 1 }]}><Text style={[styles.monthName, { color: colors.foreground }]}>{month.label.split(' ')[0].toUpperCase()}</Text><Text style={[styles.monthCapital, { color: colors.foreground }]}>{formatMoney(month.currentCapital ?? (month.isUpcoming ? month.targetClosingBalance : month.projectedMonthEndBalance))}</Text><Text style={[styles.monthCaption, { color: colors.mutedForeground }]}>{month.isUpcoming ? 'Projected close' : 'Current / projected close'}</Text><View style={styles.progressRow}><View style={[styles.progressTrack, { backgroundColor: colors.muted }]}><View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min(100, month.progress)}%` }]} /></View><Text style={[styles.progressText, { color: colors.mutedForeground }]}>{Math.round(month.progress)}%</Text></View><Text style={[styles.monthMeta, { color: colors.mutedForeground }]}>{month.completedDays} / {month.trackingDays} days completed</Text></Pressable>)}</ScrollView>
    </>
  );
  if (!hydrated) return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <View style={styles.brandCluster}>
          <View accessibilityLabel="CapGrow app logo" style={[styles.logoFrame, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Image source={require('../../assets/images/icon.png')} style={styles.logoImage} />
          </View>
          <View>
            <Text style={[styles.appName, { color: colors.foreground }]}>CapGrow</Text>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Your trajectory</Text>
          </View>
        </View>
      </View>
      <View style={[styles.heroCard, { backgroundColor: colors.navy }]}>
        <View style={styles.heroTopLine}><Text style={styles.heroLabel}>CURRENT CAPITAL</Text><View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>TRACKING</Text></View></View>
        <Text style={styles.heroNumber}>{formatMoney(snapshot.currentCapital)}</Text>
        <View style={styles.heroBottom}><View><Text style={styles.heroMetaLabel}>Total profit</Text><Text style={styles.heroMetaValue}>{formatMoney(snapshot.totalProfit, true)}</Text></View><View style={styles.heroDivider} /><View><Text style={styles.heroMetaLabel}>Growth</Text><Text style={styles.heroMetaValue}>+{snapshot.growthPct.toFixed(2)}%</Text></View><View style={styles.heroChartMark}><Feather name="trending-up" size={26} color={colors.primary} /></View></View>
      </View>
      <View style={styles.statsRow}><StatChip icon="check-circle" label="Targets achieved" value={`${snapshot.achievedCount} / ${snapshot.records.length}`} onPress={() => router.push(`/plan?month=${snapshot.latestActualDate.slice(0, 7)}`)} /><StatChip icon="zap" label="Current streak" value={`${snapshot.currentStreak} days`} onPress={() => router.push('/plan')} /></View>
      <View style={styles.sectionHeader}><View><Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>NEXT TARGET</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{formatLongDate(snapshot.nextTargetDate)}</Text></View><View style={[styles.percentBadge, { backgroundColor: colors.accent }]}><Text style={[styles.percentBadgeText, { color: colors.accentForeground }]}>{snapshot.settings.dailyTargetPct}%</Text></View></View>
      <View style={[styles.targetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.targetMain}><View style={[styles.targetIcon, { backgroundColor: colors.secondary }]}><Feather name="arrow-up-right" size={20} color={colors.accentForeground} /></View><View><Text style={[styles.targetLabel, { color: colors.mutedForeground }]}>Target profit</Text><Text style={[styles.targetAmount, { color: colors.foreground }]}>{formatMoney(snapshot.nextTargetProfit, true)}</Text></View></View>
        <View style={styles.targetBalanceBlock}><Text style={[styles.targetLabel, { color: colors.mutedForeground }]}>Target balance</Text><Text style={[styles.targetBalance, { color: colors.foreground }]}>{formatMoney(snapshot.nextTargetBalance)}</Text></View>
        <Pressable onPress={() => { setActiveEntry(nextEntry); setShowEntry(true); }} style={({ pressed }) => [styles.targetButton, { backgroundColor: colors.navy, opacity: pressed ? 0.85 : 1 }]}><Text style={styles.targetButtonText}>ENTER ACTUAL RESULT</Text><Feather name="plus" size={17} color={colors.white} /></Pressable>
      </View>
      <View style={styles.quickActions}>
        <Pressable accessibilityRole="button" onPress={() => router.push(`/plan?month=${snapshot.nextTargetDate.slice(0, 7)}`)} style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.76 : 1 }]}>
          <View style={[styles.quickActionIcon, { backgroundColor: colors.secondary }]}><Feather name="calendar" size={16} color={colors.accentForeground} /></View>
          <View style={styles.quickActionCopy}><Text style={[styles.quickActionTitle, { color: colors.foreground }]}>View this month</Text><Text style={[styles.quickActionSubtitle, { color: colors.mutedForeground }]}>Plan and history</Text></View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.76 : 1 }]}>
          <View style={[styles.quickActionIcon, { backgroundColor: colors.secondary }]}><Feather name="sliders" size={16} color={colors.accentForeground} /></View>
          <View style={styles.quickActionCopy}><Text style={[styles.quickActionTitle, { color: colors.foreground }]}>Adjust tracking</Text><Text style={[styles.quickActionSubtitle, { color: colors.mutedForeground }]}>Target and days</Text></View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
      {monthlyPlanSection}
      <View style={[styles.insightsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.insightTabs, { backgroundColor: colors.background }]}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: insightView === 'performance' }} onPress={() => setInsightView('performance')} style={[styles.insightTab, { backgroundColor: insightView === 'performance' ? colors.navy : 'transparent' }]}>
            <Feather name="activity" size={15} color={insightView === 'performance' ? colors.white : colors.mutedForeground} />
            <Text style={[styles.insightTabText, { color: insightView === 'performance' ? colors.white : colors.mutedForeground }]}>Performance</Text>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: insightView === 'projection' }} onPress={() => setInsightView('projection')} style={[styles.insightTab, { backgroundColor: insightView === 'projection' ? colors.navy : 'transparent' }]}>
            <Feather name="bar-chart-2" size={15} color={insightView === 'projection' ? colors.white : colors.mutedForeground} />
            <Text style={[styles.insightTabText, { color: insightView === 'projection' ? colors.white : colors.mutedForeground }]}>Projection</Text>
          </Pressable>
        </View>
        {insightView === 'performance' ? (
          <View style={[styles.chartCard, styles.insightPanel, { backgroundColor: colors.card, borderColor: colors.card }]}>
            <View style={styles.cardHeader}><View><Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>PERFORMANCE OVERVIEW</Text><Text style={[styles.cardTitle, { color: colors.foreground }]}>Target vs actual growth</Text></View><View style={[styles.legend, { backgroundColor: colors.background }]}><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.gold }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>Target</Text></View><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>Actual</Text></View></View></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{(['7D', '30D', 'Monthly', 'Until Dec'] as Range[]).map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: range === item }} onPress={() => setRange(item)} style={[styles.filter, { backgroundColor: range === item ? colors.navy : colors.background }]}><Text style={[styles.filterText, { color: range === item ? colors.white : colors.mutedForeground }]}>{item}</Text></Pressable>)}</ScrollView>
            <Chart entries={chartEntries} selectedDate={selectedDate} onSelect={(entry) => setSelectedDate(entry.date)} />
            {selectedEntry ? <View style={[styles.tooltip, { backgroundColor: colors.secondary }]}><View><Text style={[styles.tooltipDate, { color: colors.foreground }]}>{formatLongDate(selectedEntry.date)}</Text><Text style={[styles.tooltipLabel, { color: colors.mutedForeground }]}>{selectedEntry.actualBalance === undefined ? 'Projected target' : 'Actual result recorded'}</Text></View><View style={styles.tooltipValues}><Text style={[styles.tooltipValue, { color: colors.accentForeground }]}>{formatMoney(selectedEntry.targetBalance)}</Text>{selectedEntry.actualBalance !== undefined ? <Text style={[styles.tooltipActual, { color: colors.primary }]}>{formatMoney(selectedEntry.actualBalance)}</Text> : null}</View></View> : null}
          </View>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Open December growth projection" onPress={() => router.push('/plan?month=2026-12')} style={({ pressed }) => [styles.projectionCard, { backgroundColor: colors.navySoft, opacity: pressed ? 0.86 : 1 }]}>
            <View style={styles.projectionHeading}><View><Text style={styles.heroLabel}>YOUR GROWTH PROJECTION</Text><Text style={styles.projectionTitle}>Through 31 December 2026</Text></View><Feather name="bar-chart-2" size={22} color={colors.gold} /></View>
            <View style={styles.projectionGrid}><View style={styles.projectionCell}><Text style={styles.projectionLabel}>Current</Text><Text style={styles.projectionValue}>{formatMoney(snapshot.currentCapital)}</Text></View><View style={styles.projectionCell}><Text style={styles.projectionLabel}>Projected target</Text><Text style={styles.projectionValue}>{formatMoney(snapshot.projectedDecemberTarget)}</Text></View><View style={styles.projectionCell}><Text style={styles.projectionLabel}>Remaining target days</Text><Text style={styles.projectionValue}>{snapshot.remainingTradingDays}</Text></View><View style={styles.projectionCell}><Text style={styles.projectionLabel}>Daily target</Text><Text style={styles.projectionValue}>{snapshot.settings.dailyTargetPct}%</Text></View></View>
            <View style={styles.projectionFooter}><Text style={styles.projectionLink}>Open December plan</Text><Feather name="arrow-up-right" size={15} color={colors.gold} /></View>
            <Text style={styles.disclaimer}>Projection assumes the selected daily target is achieved on every active tracking day. It is not a prediction or guaranteed investment return.</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.sectionHeader}><View><Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>RECENT ACTIVITY</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Daily records</Text></View><Pressable onPress={() => router.push('/plan?month=2026-09')}><Text style={[styles.linkText, { color: colors.accentForeground }]}>History</Text></Pressable></View>
      <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{snapshot.records.slice(-3).reverse().map((record) => <Pressable key={record.id} accessibilityRole="button" accessibilityLabel={`Open ${formatShortDate(record.date)} activity`} onPress={() => router.push(`/plan?month=${record.date.slice(0, 7)}`)} style={({ pressed }) => [styles.activityRow, { opacity: pressed ? 0.68 : 1 }]}><View style={[styles.activityIcon, { backgroundColor: colors.accent }]}><Feather name="check" size={14} color={colors.accentForeground} /></View><View style={styles.activityCopy}><Text style={[styles.activityDate, { color: colors.foreground }]}>{formatShortDate(record.date)}</Text><Text style={[styles.activityStatus, { color: colors.mutedForeground }]}>Target achieved · closing {formatMoney(record.closingBalance ?? 0)}</Text></View><Text style={[styles.activityProfit, { color: colors.primary }]}>{formatMoney(record.actualProfit, true)}</Text><Feather name="chevron-right" size={15} color={colors.mutedForeground} /></Pressable>)}{snapshot.records.length === 0 ? <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No actual results recorded yet.</Text> : null}</View>
      <ActualEntryModal visible={showEntry} onClose={() => setShowEntry(false)} date={activeEntry?.date ?? snapshot.nextTargetDate} targetProfit={activeEntry?.targetProfit ?? snapshot.nextTargetProfit} onSave={onSaveActual} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { paddingHorizontal: 20, gap: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 46 },
  brandCluster: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  logoFrame: { width: 43, height: 43, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImage: { width: 41, height: 41, borderRadius: 20 },
  appName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, marginBottom: 3 },
  eyebrow: { fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
  greeting: { fontSize: 11, fontWeight: '500', letterSpacing: 0.1 },
  heroCard: { borderRadius: 22, padding: 20, gap: 18, shadowColor: '#2B2119', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 9 }, elevation: 4 },
  heroTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { color: '#C3B29A', fontSize: 10, letterSpacing: 1.4, fontWeight: '700' },
  livePill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(212,175,103,0.17)', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D4AF67' },
  liveText: { color: '#EBD8B1', fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  heroNumber: { color: '#FFFFFF', fontSize: 34, fontWeight: '700', letterSpacing: -1.2 },
  heroBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 18 },
  heroMetaLabel: { color: '#C3B29A', fontSize: 11, marginBottom: 4 },
  heroMetaValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroChartMark: { marginLeft: 'auto', width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,175,103,0.14)' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statChip: { flex: 1, borderRadius: 14, padding: 11, flexDirection: 'row', gap: 9, alignItems: 'center', borderWidth: 1 },
  statIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 10, marginBottom: 3 },
  statValue: { fontSize: 13, fontWeight: '700' },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickAction: { flex: 1, minHeight: 58, borderRadius: 14, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickActionIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickActionCopy: { flex: 1 },
  quickActionTitle: { fontSize: 11, fontWeight: '700' },
  quickActionSubtitle: { fontSize: 9, marginTop: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
  sectionEyebrow: { fontSize: 10, letterSpacing: 1.3, fontWeight: '700' },
  sectionTitle: { fontSize: 19, fontWeight: '700', letterSpacing: -0.3, marginTop: 4 },
  percentBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  percentBadgeText: { fontSize: 12, fontWeight: '700' },
  targetCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 15 },
  targetMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  targetIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  targetLabel: { fontSize: 11, marginBottom: 4 },
  targetAmount: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  targetBalanceBlock: { paddingTop: 2 },
  targetBalance: { fontSize: 17, fontWeight: '600' },
  targetButton: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  targetButtonText: { color: '#FFFFFF', fontSize: 11, letterSpacing: 0.7, fontWeight: '700' },
  insightsCard: { borderRadius: 18, borderWidth: 1, padding: 8, gap: 8 },
  insightTabs: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: 12 },
  insightTab: { flex: 1, minHeight: 38, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  insightTabText: { fontSize: 11, fontWeight: '700' },
  insightPanel: { borderWidth: 0, padding: 7 },
  chartCard: { borderRadius: 18, borderWidth: 1, padding: 15, gap: 13 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 7, alignSelf: 'flex-start' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 9, fontWeight: '600' },
  filters: { gap: 7 },
  filter: { borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8 },
  filterText: { fontSize: 11, fontWeight: '700' },
  chartWrap: { height: 224, justifyContent: 'flex-start' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-start' },
  yAxisLabels: { width: 78, height: 190, justifyContent: 'space-between', paddingTop: 8, paddingBottom: 17, paddingRight: 8 },
  yAxisLabel: { fontSize: 9, textAlign: 'right' },
  chartArea: { flex: 1 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  chartLabel: { fontSize: 10 },
  tooltip: { borderRadius: 13, padding: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tooltipDate: { fontSize: 12, fontWeight: '700' },
  tooltipLabel: { fontSize: 10, marginTop: 3 },
  tooltipValues: { alignItems: 'flex-end', gap: 2 },
  tooltipValue: { fontSize: 13, fontWeight: '700' },
  tooltipActual: { fontSize: 11, fontWeight: '700' },
  projectionCard: { borderRadius: 20, padding: 17, gap: 15 },
  projectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  projectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 4 },
  projectionGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 15 },
  projectionCell: { width: '50%' },
  projectionLabel: { color: '#C3B29A', fontSize: 10, marginBottom: 4 },
  projectionValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  projectionFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  projectionLink: { color: '#F3CC67', fontSize: 11, fontWeight: '700' },
  disclaimer: { color: '#C3B29A', fontSize: 10, lineHeight: 15 },
  linkText: { fontSize: 12, fontWeight: '700' },
  monthScroll: { gap: 11 },
  monthCard: { width: 182, borderRadius: 16, padding: 14, borderWidth: 1, gap: 6 },
  monthName: { fontSize: 11, letterSpacing: 1.1, fontWeight: '700' },
  monthCapital: { fontSize: 19, fontWeight: '700', marginTop: 5 },
  monthCaption: { fontSize: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  progressTrack: { height: 6, flex: 1, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 10, width: 28, textAlign: 'right' },
  monthMeta: { fontSize: 10, marginTop: 2 },
  activityCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 13 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8E0D6' },
  activityIcon: { width: 29, height: 29, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1 },
  activityDate: { fontSize: 13, fontWeight: '700' },
  activityStatus: { fontSize: 10, marginTop: 3 },
  activityProfit: { fontSize: 12, fontWeight: '700' },
  emptyText: { paddingVertical: 20, fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(36,29,24,0.45)' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 11, paddingBottom: 28, gap: 13 },
  modalHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#E4DBCE', alignSelf: 'center', marginBottom: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalEyebrow: { fontSize: 10, letterSpacing: 1.4, fontWeight: '700' },
  modalTitle: { fontSize: 23, fontWeight: '700', marginTop: 4 },
  modalDate: { fontSize: 13 },
  targetHint: { borderRadius: 13, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetHintLabel: { fontSize: 12 },
  targetHintValue: { fontSize: 14, fontWeight: '700' },
  inputLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  currencyInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, height: 51, flexDirection: 'row', alignItems: 'center' },
  currencyPrefix: { fontSize: 14, fontWeight: '700', marginRight: 9 },
  input: { flex: 1, fontSize: 17, fontWeight: '600' },
  errorText: { fontSize: 11 },
  primaryButton: { borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryButtonText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  modalNote: { fontSize: 10, lineHeight: 15, textAlign: 'center' },
});