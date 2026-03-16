import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSize } from '../constants/theme';

interface TransactionItemProps {
    merchant: string;
    amount: number;
    date: string;
    category: string;
    paymentMethod: string;
}

export default function TransactionItem({
    merchant,
    amount,
    date,
    category,
    paymentMethod,
}: TransactionItemProps) {
    const getCategoryIcon = () => {
        switch (category.toLowerCase()) {
            case 'food':
                return '🍕';
            case 'transport':
                return '🚗';
            case 'shopping':
                return '🛍️';
            case 'entertainment':
                return '🎬';
            case 'bills':
                return '📄';
            case 'health':
                return '💊';
            case 'education':
                return '📚';
            case 'grocery':
                return '🛒';
            default:
                return '💳';
        }
    };

    const getMethodBadge = () => {
        switch (paymentMethod.toLowerCase()) {
            case 'upi':
                return { label: 'UPI', color: Colors.primary };
            case 'qr':
                return { label: 'QR', color: Colors.success };
            case 'cash':
                return { label: 'CASH', color: Colors.warning };
            default:
                return { label: paymentMethod, color: Colors.textMuted };
        }
    };

    const badge = getMethodBadge();

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Text style={styles.emoji}>{getCategoryIcon()}</Text>
            </View>

            <View style={styles.details}>
                <Text style={styles.merchant} numberOfLines={1}>{merchant}</Text>
                <View style={styles.metaRow}>
                    <Text style={styles.date}>{date}</Text>
                    <View style={[styles.categoryBadge]}>
                        <Text style={styles.categoryText}>{category}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.right}>
                <Text style={styles.amount}>-₹{amount.toLocaleString('en-IN')}</Text>
                <View style={[styles.methodBadge, { backgroundColor: badge.color + '20' }]}>
                    <Text style={[styles.methodText, { color: badge.color }]}>{badge.label}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    emoji: {
        fontSize: 20,
    },
    details: {
        flex: 1,
    },
    merchant: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    date: {
        fontSize: FontSize.xs,
        color: Colors.textMuted,
    },
    categoryBadge: {
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    categoryText: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    right: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.danger,
        marginBottom: 2,
    },
    methodBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    methodText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
});
