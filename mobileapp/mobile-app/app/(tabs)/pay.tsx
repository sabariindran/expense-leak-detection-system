import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { makePayment, PaymentRequest } from '../../services/api';

const PAYMENT_METHODS = [
    { key: 'UPI', label: 'UPI', icon: '📱', color: Colors.primary },
    { key: 'QR', label: 'QR Code', icon: '📷', color: Colors.success },
    { key: 'Cash', label: 'Cash', icon: '💵', color: Colors.warning },
];

export default function PayScreen() {
    const [merchant, setMerchant] = useState('');
    const [amount, setAmount] = useState('');
    const [upiId, setUpiId] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('UPI');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [txnId, setTxnId] = useState('');
    const buttonScale = new Animated.Value(1);

    const handlePayment = async () => {
        if (!merchant.trim()) {
            setError('Please enter merchant name');
            return;
        }
        if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const payload: PaymentRequest = {
                merchant_name: merchant.trim(),
                amount: parseFloat(amount),
                payment_method: selectedMethod,
            };
            if (selectedMethod === 'UPI' && upiId.trim()) {
                payload.upi_id = upiId.trim();
            }

            const result = await makePayment(payload);
            setTxnId(result.transaction_id);
            setShowSuccess(true);

            // Reset form
            setMerchant('');
            setAmount('');
            setUpiId('');
        } catch (err: any) {
            setError('Payment failed. Check backend connection.');
        } finally {
            setLoading(false);
        }
    };

    const handlePressIn = () => {
        Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    };

    return (
        <LinearGradient colors={Colors.gradientDark} style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>New Payment</Text>
                        <Text style={styles.subtitle}>Send money securely</Text>
                    </View>

                    {/* Payment Method Selector */}
                    <Text style={styles.fieldLabel}>Payment Method</Text>
                    <View style={styles.methodRow}>
                        {PAYMENT_METHODS.map((m) => (
                            <TouchableOpacity
                                key={m.key}
                                style={[
                                    styles.methodCard,
                                    selectedMethod === m.key && {
                                        borderColor: m.color,
                                        backgroundColor: m.color + '15',
                                    },
                                ]}
                                onPress={() => setSelectedMethod(m.key)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.methodIcon}>{m.icon}</Text>
                                <Text
                                    style={[
                                        styles.methodLabel,
                                        selectedMethod === m.key && { color: m.color },
                                    ]}
                                >
                                    {m.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Form Fields */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Merchant Name</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputIcon}>🏪</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Starbucks, Amazon"
                                placeholderTextColor={Colors.textMuted}
                                value={merchant}
                                onChangeText={setMerchant}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Amount (₹)</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputIcon}>💰</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor={Colors.textMuted}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {selectedMethod === 'UPI' && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.fieldLabel}>UPI ID (optional)</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputIcon}>📱</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="name@upi"
                                    placeholderTextColor={Colors.textMuted}
                                    value={upiId}
                                    onChangeText={setUpiId}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>
                    )}

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    {/* Pay Button */}
                    <Animated.View style={[styles.buttonContainer, { transform: [{ scale: buttonScale }] }]}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={handlePayment}
                            onPressIn={handlePressIn}
                            onPressOut={handlePressOut}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={Colors.gradientPrimary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.payButton}
                            >
                                <Text style={styles.payButtonText}>
                                    {loading ? 'Processing...' : `Pay ₹${amount || '0'}`}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Success Modal */}
            <Modal visible={showSuccess} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.successCircle}>
                            <Text style={styles.successIcon}>✅</Text>
                        </View>
                        <Text style={styles.successTitle}>Payment Successful!</Text>
                        <Text style={styles.successTxn}>Transaction ID: {txnId}</Text>
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => setShowSuccess(false)}
                        >
                            <Text style={styles.modalButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: Spacing.md,
        paddingTop: 60,
    },
    header: {
        marginBottom: Spacing.lg,
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
    fieldLabel: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontWeight: '600',
        marginBottom: Spacing.sm,
        marginTop: Spacing.sm,
    },
    methodRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    methodCard: {
        flex: 1,
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    methodIcon: {
        fontSize: 24,
        marginBottom: Spacing.xs,
    },
    methodLabel: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    inputGroup: {
        marginBottom: Spacing.sm,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.md,
    },
    inputIcon: {
        fontSize: 16,
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        height: 52,
        color: Colors.textPrimary,
        fontSize: FontSize.md,
    },
    error: {
        color: Colors.danger,
        fontSize: FontSize.sm,
        marginVertical: Spacing.sm,
        textAlign: 'center',
    },
    buttonContainer: {
        marginTop: Spacing.lg,
    },
    payButton: {
        height: 56,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.button,
    },
    payButtonText: {
        color: '#FFFFFF',
        fontSize: FontSize.lg,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    // Success Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    successCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.success + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    successIcon: {
        fontSize: 36,
    },
    successTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.success,
        marginBottom: Spacing.sm,
    },
    successTxn: {
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        marginBottom: Spacing.lg,
    },
    modalButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
});
