import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { getDashboard, getTransactions, DashboardData, Alert as ApiAlert, Transaction } from '../../services/api';
import { generateAlerts, getTopCategory } from '../../services/alertEngine';
import StatCard from '../../components/StatCard';
import AlertCard from '../../components/AlertCard';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [smartAlerts, setSmartAlerts] = useState<ApiAlert[]>([]);
  const [topCategory, setTopCategory] = useState<{ category: string; amount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('User');
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [])
  );

  useEffect(() => {
    AsyncStorage.getItem('userName').then((name) => {
      if (name) setUserName(name);
    });
  }, []);

  const fetchDashboard = async () => {
    try {
      setError('');
      const [dashResult, txns] = await Promise.all([
        getDashboard(),
        getTransactions(),
      ]);
      setData(dashResult);

      // Generate intelligent alerts from transactions
      const alerts = generateAlerts(txns);
      setSmartAlerts(alerts);

      // Compute top spending category
      setTopCategory(getTopCategory(txns));
    } catch (err: any) {
      setError('Could not connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={Colors.gradientDark} style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {userName} 👋</Text>
            <Text style={styles.subtitle}>Your spending intelligence</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Stat Cards */}
        <View style={styles.statsRow}>
          <StatCard
            icon="💰"
            label="Total Spent"
            value={data?.total_spent ?? 0}
            gradient={Colors.gradientCard}
          />
          <StatCard
            icon="📂"
            label="Top Category"
            value={topCategory?.category ?? '—'}
            gradient={Colors.gradientCard}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            icon="🔔"
            label="Active Alerts"
            value={String(smartAlerts.length)}
            gradient={Colors.gradientCard}
            textColor={
              smartAlerts.length > 0 ? Colors.danger : Colors.success
            }
          />
          <StatCard
            icon="⚡"
            label="Habit Score"
            value={`${data?.habit_score ?? 0}/100`}
            gradient={Colors.gradientCard}
            textColor={
              (data?.habit_score ?? 100) >= 70
                ? Colors.success
                : (data?.habit_score ?? 100) >= 40
                  ? Colors.warning
                  : Colors.danger
            }
          />
        </View>

        {/* Summary Insight */}
        {topCategory && (
          <View style={styles.insightCard}>
            <Text style={styles.insightText}>
              📌 Your highest spending this month is on{' '}
              <Text style={styles.insightHighlight}>{topCategory.category}</Text>
              {' '}(₹{Math.round(topCategory.amount).toLocaleString('en-IN')}).
            </Text>
          </View>
        )}

        {/* Spending by Merchant - Bar Chart */}
        {data?.spending_by_merchant && data.spending_by_merchant.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💳 Spending by Merchant</Text>
            <View style={styles.chartCard}>
              {data.spending_by_merchant.slice(0, 6).map((item, index) => {
                const maxAmount = Math.max(
                  ...data.spending_by_merchant.map((s) => s.amount)
                );
                const barWidth = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
                const barColors = [
                  Colors.primary,
                  Colors.success,
                  Colors.warning,
                  Colors.info,
                  Colors.danger,
                  Colors.primaryLight,
                ];

                return (
                  <View key={index} style={styles.barRow}>
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {item.merchant}
                    </Text>
                    <View style={styles.barTrack}>
                      <LinearGradient
                        colors={[barColors[index % barColors.length], barColors[index % barColors.length] + '80']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.barFill, { width: `${barWidth}%` }]}
                      />
                    </View>
                    <Text style={styles.barValue}>
                      ₹{item.amount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Monthly Trend */}
        {data?.monthly_trend && data.monthly_trend.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Monthly Trend</Text>
            <View style={styles.chartCard}>
              {data.monthly_trend.map((item, index) => {
                const maxAmount = Math.max(
                  ...data.monthly_trend.map((t) => t.amount)
                );
                const barHeight = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;

                return (
                  <View key={index} style={styles.trendColumn}>
                    <Text style={styles.trendValue}>
                      ₹{(item.amount / 1000).toFixed(1)}k
                    </Text>
                    <View style={styles.trendBarTrack}>
                      <LinearGradient
                        colors={Colors.gradientPrimary}
                        style={[styles.trendBarFill, { height: `${barHeight}%` }]}
                      />
                    </View>
                    <Text style={styles.trendLabel}>
                      {item.month.split('-')[1]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🚨 Alerts ({smartAlerts.length})
          </Text>
          {smartAlerts.length > 0 ? (
            smartAlerts.map((alert, index) => (
              <AlertCard
                key={index}
                type={alert.type}
                message={alert.message}
                severity={alert.severity}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>No alerts — you're spending wisely!</Text>
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorCard: {
    backgroundColor: Colors.danger + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.danger + '30',
  },
  errorIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  errorText: {
    flex: 1,
    color: Colors.danger,
    fontSize: FontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // Horizontal bar chart styles
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  barLabel: {
    width: 80,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  barValue: {
    width: 70,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginLeft: Spacing.sm,
  },
  // Vertical trend chart styles
  trendColumn: {
    flex: 1,
    alignItems: 'center',
  },
  trendValue: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  trendBarTrack: {
    width: 24,
    height: 80,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  trendBarFill: {
    width: '100%',
    borderRadius: BorderRadius.sm,
  },
  trendLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  insightCard: {
    backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  insightText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  insightHighlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
});
