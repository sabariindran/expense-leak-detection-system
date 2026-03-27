import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { getTransactions, Transaction } from '../../services/api';
import TransactionItem from '../../components/TransactionItem';

const CATEGORIES = ['All', 'Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Grocery', 'Other'];

export default function HistoryScreen() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [error, setError] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchTransactions();
        }, [])
    );

    const fetchTransactions = async () => {
        try {
            setError('');
            const data = await getTransactions();
            setTransactions(data);
        } catch {
            setError('Could not load transactions. Check backend connection.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchTransactions();
    };

    const filtered =
        selectedCategory === 'All'
            ? transactions
            : transactions.filter(
                (t) => t.category.toLowerCase() === selectedCategory.toLowerCase()
            );

    const totalFiltered = filtered.reduce((sum, t) => sum + t.amount, 0);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
        );
    }

    return (
        <LinearGradient colors={Colors.gradientDark} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Transactions</Text>
                <Text style={styles.subtitle}>
                    {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} • ₹
                    {totalFiltered.toLocaleString('en-IN')}
                </Text>
            </View>

            {/* Category Filters */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
            >
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        style={[
                            styles.chip,
                            selectedCategory === cat && styles.chipActive,
                        ]}
                        onPress={() => setSelectedCategory(cat)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                selectedCategory === cat && styles.chipTextActive,
                            ]}
                        >
                            {cat}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Category Total Banner */}
            {selectedCategory !== 'All' && (
                <View style={styles.categoryTotalBanner}>
                    <Text style={styles.categoryTotalText}>
                        {selectedCategory} Total:{' '}
                        <Text style={styles.categoryTotalAmount}>
                            ₹{totalFiltered.toLocaleString('en-IN')}
                        </Text>
                    </Text>
                </View>
            )}

            {error ? (
                <View style={styles.errorCard}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
            ) : null}

            {/* Transaction List */}
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TransactionItem
                        merchant={item.merchant}
                        amount={item.amount}
                        date={item.date}
                        category={item.category}
                        paymentMethod={item.payment_method}
                    />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📭</Text>
                        <Text style={styles.emptyTitle}>No transactions found</Text>
                        <Text style={styles.emptySubtitle}>
                            {selectedCategory !== 'All'
                                ? `No ${selectedCategory.toLowerCase()} transactions yet`
                                : 'Make your first payment to see it here'}
                        </Text>
                    </View>
                }
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        paddingHorizontal: Spacing.md,
        paddingTop: 60,
        paddingBottom: Spacing.md,
    },
    title: {
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
    chipRow: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        gap: Spacing.sm,
    },
    chip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        minWidth: 56,
        alignItems: 'center',
    },
    chipActive: {
        backgroundColor: Colors.primary + '20',
        borderColor: Colors.primary,
    },
    chipText: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    chipTextActive: {
        color: Colors.primary,
        fontWeight: '700',
    },
    categoryTotalBanner: {
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        backgroundColor: Colors.primary + '12',
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.primary + '25',
    },
    categoryTotalText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: '500',
    },
    categoryTotalAmount: {
        color: Colors.primary,
        fontWeight: '700',
    },
    listContent: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    errorCard: {
        backgroundColor: Colors.danger + '15',
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.danger + '30',
    },
    errorText: {
        color: Colors.danger,
        fontSize: FontSize.sm,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: Spacing.xxl * 2,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    emptyTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    emptySubtitle: {
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        textAlign: 'center',
    },
});
