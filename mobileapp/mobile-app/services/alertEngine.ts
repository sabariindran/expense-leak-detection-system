/**
 * Client-side intelligent alert engine.
 * Analyzes transaction data and generates meaningful expense leak alerts.
 *
 * Alerts are only generated when:
 * 1. Repeated small transactions accumulate into high monthly spending
 * 2. Category spending is too high compared to total (>40%)
 * 3. High frequency spending at the same merchant (>=7 visits)
 */

import { Transaction, Alert } from './api';

// ─── Thresholds ───────────────────────────────────────────────
const SMALL_TXN_AVG_LIMIT = 200;        // avg amount considered "small"
const SMALL_TXN_MIN_COUNT = 5;          // minimum repeat visits
const SMALL_TXN_MIN_TOTAL = 500;        // minimum accumulated total
const CATEGORY_OVERSPEND_PCT = 40;      // category > 40% of total
const HIGH_FREQUENCY_COUNT = 7;         // merchant visited >= 7 times
const MAX_ALERTS = 5;                   // cap alerts to avoid spam

// ─── Types ────────────────────────────────────────────────────

interface MerchantStats {
  merchant: string;
  totalSpent: number;
  count: number;
  avgAmount: number;
}

interface CategoryStats {
  category: string;
  totalSpent: number;
  percentage: number;
}

// ─── Alert Generators ─────────────────────────────────────────

function detectAccumulatedSmallSpending(transactions: Transaction[]): Alert[] {
  const alerts: Alert[] = [];
  const merchantMap = new Map<string, { total: number; count: number }>();

  for (const txn of transactions) {
    const key = txn.merchant.toLowerCase();
    const existing = merchantMap.get(key) || { total: 0, count: 0 };
    existing.total += txn.amount;
    existing.count += 1;
    merchantMap.set(key, existing);
  }

  for (const [merchant, stats] of merchantMap) {
    const avg = stats.total / stats.count;
    if (
      avg < SMALL_TXN_AVG_LIMIT &&
      stats.count >= SMALL_TXN_MIN_COUNT &&
      stats.total >= SMALL_TXN_MIN_TOTAL
    ) {
      // Use original casing from first matching transaction
      const originalName =
        transactions.find((t) => t.merchant.toLowerCase() === merchant)?.merchant ?? merchant;
      alerts.push({
        type: 'Expense Leak',
        message: `You spent ₹${Math.round(stats.total).toLocaleString('en-IN')} at ${originalName} this month. This may be an expense leak.`,
        severity: stats.total > 1000 ? 'high' : 'medium',
      });
    }
  }

  return alerts;
}

function detectCategoryOverspend(transactions: Transaction[]): Alert[] {
  const alerts: Alert[] = [];
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  if (totalSpent === 0) return alerts;

  const categoryMap = new Map<string, number>();
  for (const txn of transactions) {
    const cat = txn.category;
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + txn.amount);
  }

  for (const [category, amount] of categoryMap) {
    const pct = (amount / totalSpent) * 100;
    if (pct >= CATEGORY_OVERSPEND_PCT) {
      alerts.push({
        type: 'Category Alert',
        message: `You are frequently spending on ${category} (${Math.round(pct)}% of total). Consider reviewing your habits.`,
        severity: pct >= 60 ? 'high' : 'medium',
      });
    }
  }

  return alerts;
}

function detectHighFrequencyMerchant(transactions: Transaction[]): Alert[] {
  const alerts: Alert[] = [];
  const merchantCounts = new Map<string, number>();

  for (const txn of transactions) {
    const key = txn.merchant.toLowerCase();
    merchantCounts.set(key, (merchantCounts.get(key) || 0) + 1);
  }

  for (const [merchant, count] of merchantCounts) {
    if (count >= HIGH_FREQUENCY_COUNT) {
      const originalName =
        transactions.find((t) => t.merchant.toLowerCase() === merchant)?.merchant ?? merchant;
      alerts.push({
        type: 'Habit Alert',
        message: `${originalName} is becoming a habit — ${count} visits this month.`,
        severity: count >= 12 ? 'high' : 'low',
      });
    }
  }

  return alerts;
}

// ─── Main Export ───────────────────────────────────────────────

/**
 * Generate intelligent alerts from transaction list.
 * Returns at most MAX_ALERTS alerts, deduplicated by message.
 */
export function generateAlerts(transactions: Transaction[]): Alert[] {
  if (!transactions || transactions.length === 0) return [];

  const accumulated = detectAccumulatedSmallSpending(transactions);
  const categoryAlerts = detectCategoryOverspend(transactions);
  const frequencyAlerts = detectHighFrequencyMerchant(transactions);

  // Combine and deduplicate
  const allAlerts = [...accumulated, ...categoryAlerts, ...frequencyAlerts];
  const seen = new Set<string>();
  const unique: Alert[] = [];

  for (const alert of allAlerts) {
    if (!seen.has(alert.message)) {
      seen.add(alert.message);
      unique.push(alert);
    }
  }

  // Sort: high severity first
  unique.sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (order[a.severity ?? 'medium'] ?? 1) - (order[b.severity ?? 'medium'] ?? 1);
  });

  return unique.slice(0, MAX_ALERTS);
}

/**
 * Get top spending category from transactions.
 */
export function getTopCategory(transactions: Transaction[]): { category: string; amount: number } | null {
  if (!transactions || transactions.length === 0) return null;

  const categoryMap = new Map<string, number>();
  for (const txn of transactions) {
    categoryMap.set(txn.category, (categoryMap.get(txn.category) || 0) + txn.amount);
  }

  let topCat = '';
  let topAmount = 0;
  for (const [cat, amount] of categoryMap) {
    if (amount > topAmount) {
      topCat = cat;
      topAmount = amount;
    }
  }

  return topCat ? { category: topCat, amount: topAmount } : null;
}
