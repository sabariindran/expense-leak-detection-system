import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Spacing, FontSize, Shadows } from '../constants/theme';

interface StatCardProps {
    icon: string;
    label: string;
    value: string | number;
    gradient?: readonly [string, string, ...string[]];
    textColor?: string;
}

export default function StatCard({
    icon,
    label,
    value,
    gradient = Colors.gradientCard,
    textColor,
}: StatCardProps) {
    return (
        <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
        >
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.label}>{label}</Text>
            <Text style={[styles.value, textColor ? { color: textColor } : null]}>
                {typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : value}
            </Text>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        minWidth: 140,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.card,
    },
    icon: {
        fontSize: 24,
        marginBottom: Spacing.xs,
    },
    label: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: Spacing.xs,
    },
    value: {
        fontSize: FontSize.xl,
        color: Colors.textPrimary,
        fontWeight: '700',
    },
});
