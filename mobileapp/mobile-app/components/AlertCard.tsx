import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSize } from '../constants/theme';

interface AlertCardProps {
    type: string;
    message: string;
    severity?: string;
}

export default function AlertCard({ type, message, severity }: AlertCardProps) {
    const getSeverityColor = () => {
        switch (severity?.toLowerCase()) {
            case 'high':
                return Colors.danger;
            case 'medium':
                return Colors.warning;
            case 'low':
                return Colors.info;
            default:
                return Colors.warning;
        }
    };

    const getSeverityIcon = () => {
        switch (severity?.toLowerCase()) {
            case 'high':
                return '🔴';
            case 'medium':
                return '🟡';
            case 'low':
                return '🔵';
            default:
                return '⚠️';
        }
    };

    const color = getSeverityColor();

    return (
        <View style={[styles.card, { borderLeftColor: color }]}>
            <View style={styles.header}>
                <Text style={styles.icon}>{getSeverityIcon()}</Text>
                <Text style={[styles.type, { color }]}>{type}</Text>
            </View>
            <Text style={styles.message}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderLeftWidth: 3,
        borderLeftColor: Colors.warning,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    icon: {
        fontSize: 14,
        marginRight: Spacing.sm,
    },
    type: {
        fontSize: FontSize.sm,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    message: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        lineHeight: 22,
    },
});
