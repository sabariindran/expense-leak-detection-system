import React, { useState, useCallback } from 'react';
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
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { makePayment, PaymentRequest } from '../../services/api';
import { categorizeMerchant, extractMerchantFromUPI } from '../../services/categorize';

// ─── Types ────────────────────────────────────────────────────────
type PaymentFlow = 'none' | 'upi' | 'qr' | 'cash';
type CashMode = 'none' | 'manual' | 'bill';

interface ConfirmData {
    merchant: string;
    category: string;
    amount: string;
    paymentType: 'upi' | 'qr' | 'cash';
    upiId?: string;
    description?: string;
}

// ─── Component ────────────────────────────────────────────────────
export default function PayScreen() {
    const router = useRouter();

    // Flow state
    const [activeFlow, setActiveFlow] = useState<PaymentFlow>('none');
    const [cashMode, setCashMode] = useState<CashMode>('none');

    // UPI fields
    const [upiId, setUpiId] = useState('');
    const [upiMerchant, setUpiMerchant] = useState('');
    const [upiAmount, setUpiAmount] = useState('');

    // Cash fields
    const [cashMerchant, setCashMerchant] = useState('');
    const [cashDescription, setCashDescription] = useState('');
    const [cashAmount, setCashAmount] = useState('');

    // Confirmation modal
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);
    const [editMode, setEditMode] = useState(false);

    // Success modal
    const [showSuccess, setShowSuccess] = useState(false);
    const [txnId, setTxnId] = useState('');

    // Loading / error
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const buttonScale = new Animated.Value(1);

    // ─── Merchant extraction from UPI ID ──────────────────────────
    const resolveMerchant = (merchantInput: string, upi: string): string => {
        if (merchantInput.trim()) return merchantInput.trim();
        return extractMerchantFromUPI(upi);
    };

    // ─── Reset all fields ─────────────────────────────────────────
    const resetAll = () => {
        setActiveFlow('none');
        setCashMode('none');
        setUpiId('');
        setUpiMerchant('');
        setUpiAmount('');
        setCashMerchant('');
        setCashDescription('');
        setCashAmount('');
        setConfirmData(null);
        setEditMode(false);
        setError('');
    };

    // ─── UPI: Proceed ─────────────────────────────────────────────
    const handleUpiProceed = () => {
        if (!upiId.trim()) {
            setError('Please enter a UPI ID');
            return;
        }
        if (!upiAmount.trim() || isNaN(Number(upiAmount)) || Number(upiAmount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        setError('');
        const merchant = resolveMerchant(upiMerchant, upiId);
        if (!merchant) {
            setError('Could not determine merchant. Please enter a name.');
            return;
        }
        const category = categorizeMerchant(merchant);
        setConfirmData({
            merchant,
            category,
            amount: upiAmount.trim(),
            paymentType: 'upi',
            upiId: upiId.trim(),
        });
        setShowConfirm(true);
    };

    // ─── Cash Manual: Proceed ─────────────────────────────────────
    const handleCashProceed = () => {
        if (!cashMerchant.trim()) {
            setError('Please enter merchant name');
            return;
        }
        if (!cashAmount.trim() || isNaN(Number(cashAmount)) || Number(cashAmount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        setError('');
        const category = categorizeMerchant(cashMerchant.trim());
        setConfirmData({
            merchant: cashMerchant.trim(),
            category,
            amount: cashAmount.trim(),
            paymentType: 'cash',
            description: cashDescription.trim() || undefined,
        });
        setShowConfirm(true);
    };

    // ─── Confirm payment ──────────────────────────────────────────
    const handleConfirm = async () => {
        if (!confirmData) return;
        setLoading(true);
        try {
            const payload: PaymentRequest = {
                merchant_name: confirmData.merchant,
                amount: parseFloat(confirmData.amount),
                payment_method: confirmData.paymentType,
            };
            if (confirmData.upiId) payload.upi_id = confirmData.upiId;
            if (confirmData.description) payload.description = confirmData.description;

            const result = await makePayment(payload);
            setTxnId(result.transaction_id);
            setShowConfirm(false);
            setShowSuccess(true);
        } catch {
            Alert.alert('Payment Failed', 'Could not process payment. Check backend connection.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Edit in confirm modal ────────────────────────────────────
    const handleEdit = () => {
        setEditMode(true);
    };

    const updateConfirmField = (field: keyof ConfirmData, value: string) => {
        if (!confirmData) return;
        const updated = { ...confirmData, [field]: value };
        if (field === 'merchant') {
            updated.category = categorizeMerchant(value);
        }
        setConfirmData(updated);
    };

    // ─── Navigate to QR scan ──────────────────────────────────────
    const handleQRScan = () => {
        router.push('/scan');
    };

    // ─── Navigate to bill scan placeholder ────────────────────────
    const handleBillScan = () => {
        router.push({ pathname: '/scan', params: { mode: 'bill' } });
    };

    // ─── Button animation ─────────────────────────────────────────
    const handlePressIn = () => {
        Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(buttonScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    };

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════

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
                        <Text style={styles.title}>SmartSpend</Text>
                        <Text style={styles.subtitle}>Record every expense through payments</Text>
                    </View>

                    {/* ── Primary Actions ─────────────────────── */}
                    {activeFlow === 'none' && (
                        <View style={styles.actionsContainer}>
                            {/* UPI Payment */}
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => setActiveFlow('upi')}
                            >
                                <LinearGradient
                                    colors={['#6C63FF', '#4F46E5']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.actionCard}
                                >
                                    <View style={styles.actionIconCircle}>
                                        <Text style={styles.actionIcon}>📱</Text>
                                    </View>
                                    <Text style={styles.actionTitle}>Pay via UPI</Text>
                                    <Text style={styles.actionDesc}>
                                        Send money using UPI ID
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Scan QR */}
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={handleQRScan}
                            >
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.actionCard}
                                >
                                    <View style={styles.actionIconCircle}>
                                        <Text style={styles.actionIcon}>📷</Text>
                                    </View>
                                    <Text style={styles.actionTitle}>Scan QR Payment</Text>
                                    <Text style={styles.actionDesc}>
                                        Scan a merchant QR code to pay
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Cash Expense */}
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => setActiveFlow('cash')}
                            >
                                <LinearGradient
                                    colors={['#F59E0B', '#D97706']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.actionCard}
                                >
                                    <View style={styles.actionIconCircle}>
                                        <Text style={styles.actionIcon}>💵</Text>
                                    </View>
                                    <Text style={styles.actionTitle}>Cash Expense</Text>
                                    <Text style={styles.actionDesc}>
                                        Record a cash payment manually or scan a bill
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── UPI Flow ────────────────────────────── */}
                    {activeFlow === 'upi' && (
                        <View style={styles.flowCard}>
                            <View style={styles.flowHeader}>
                                <TouchableOpacity onPress={resetAll}>
                                    <Text style={styles.backArrow}>← Back</Text>
                                </TouchableOpacity>
                                <Text style={styles.flowTitle}>Pay via UPI</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.fieldLabel}>UPI ID *</Text>
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputIcon}>📱</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. starbucks@upi"
                                        placeholderTextColor={Colors.textMuted}
                                        value={upiId}
                                        onChangeText={setUpiId}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.fieldLabel}>Merchant Name (optional)</Text>
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputIcon}>🏪</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Auto-extracted from UPI ID"
                                        placeholderTextColor={Colors.textMuted}
                                        value={upiMerchant}
                                        onChangeText={setUpiMerchant}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.fieldLabel}>Amount (₹) *</Text>
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputIcon}>💰</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0.00"
                                        placeholderTextColor={Colors.textMuted}
                                        value={upiAmount}
                                        onChangeText={setUpiAmount}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            {/* UPI ID preview */}
                            {upiId.includes('@') && !upiMerchant.trim() && (
                                <View style={styles.previewCard}>
                                    <Text style={styles.previewLabel}>Detected Merchant</Text>
                                    <Text style={styles.previewValue}>
                                        {extractMerchantFromUPI(upiId)}
                                    </Text>
                                </View>
                            )}

                            {error ? <Text style={styles.error}>{error}</Text> : null}

                            <Animated.View style={[styles.buttonContainer, { transform: [{ scale: buttonScale }] }]}>
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={handleUpiProceed}
                                    onPressIn={handlePressIn}
                                    onPressOut={handlePressOut}
                                >
                                    <LinearGradient
                                        colors={Colors.gradientPrimary}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.primaryButton}
                                    >
                                        <Text style={styles.primaryButtonText}>
                                            Proceed — ₹{upiAmount || '0'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    )}

                    {/* ── Cash Flow: Choose Mode ─────────────── */}
                    {activeFlow === 'cash' && cashMode === 'none' && (
                        <View style={styles.flowCard}>
                            <View style={styles.flowHeader}>
                                <TouchableOpacity onPress={resetAll}>
                                    <Text style={styles.backArrow}>← Back</Text>
                                </TouchableOpacity>
                                <Text style={styles.flowTitle}>Cash Expense</Text>
                            </View>

                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => setCashMode('manual')}
                            >
                                <View style={styles.cashOption}>
                                    <View style={styles.cashOptionIcon}>
                                        <Text style={{ fontSize: 28 }}>✏️</Text>
                                    </View>
                                    <View style={styles.cashOptionContent}>
                                        <Text style={styles.cashOptionTitle}>Quick Manual Entry</Text>
                                        <Text style={styles.cashOptionDesc}>
                                            Enter merchant, description and amount
                                        </Text>
                                    </View>
                                    <Text style={styles.cashOptionArrow}>›</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={handleBillScan}
                            >
                                <View style={styles.cashOption}>
                                    <View style={styles.cashOptionIcon}>
                                        <Text style={{ fontSize: 28 }}>🧾</Text>
                                    </View>
                                    <View style={styles.cashOptionContent}>
                                        <Text style={styles.cashOptionTitle}>Scan Physical Bill</Text>
                                        <Text style={styles.cashOptionDesc}>
                                            Capture a bill image to record expense
                                        </Text>
                                    </View>
                                    <Text style={styles.cashOptionArrow}>›</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Cash Flow: Manual Entry ─────────────── */}
                    {activeFlow === 'cash' && cashMode === 'manual' && (
                        <View style={styles.flowCard}>
                            <View style={styles.flowHeader}>
                                <TouchableOpacity onPress={() => setCashMode('none')}>
                                    <Text style={styles.backArrow}>← Back</Text>
                                </TouchableOpacity>
                                <Text style={styles.flowTitle}>Quick Manual Entry</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.fieldLabel}>Merchant *</Text>
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputIcon}>🏪</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Tea Stall, Auto Rickshaw"
                                        placeholderTextColor={Colors.textMuted}
                                        value={cashMerchant}
                                        onChangeText={setCashMerchant}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.fieldLabel}>Item Description (optional)</Text>
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputIcon}>📝</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Two cups of tea"
                                        placeholderTextColor={Colors.textMuted}
                                        value={cashDescription}
                                        onChangeText={setCashDescription}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.fieldLabel}>Amount (₹) *</Text>
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputIcon}>💰</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0.00"
                                        placeholderTextColor={Colors.textMuted}
                                        value={cashAmount}
                                        onChangeText={setCashAmount}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            {/* Category preview */}
                            {cashMerchant.trim() ? (
                                <View style={styles.previewCard}>
                                    <Text style={styles.previewLabel}>Predicted Category</Text>
                                    <Text style={styles.previewValue}>
                                        {categorizeMerchant(cashMerchant)}
                                    </Text>
                                </View>
                            ) : null}

                            {error ? <Text style={styles.error}>{error}</Text> : null}

                            <Animated.View style={[styles.buttonContainer, { transform: [{ scale: buttonScale }] }]}>
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={handleCashProceed}
                                    onPressIn={handlePressIn}
                                    onPressOut={handlePressOut}
                                >
                                    <LinearGradient
                                        colors={Colors.gradientWarning}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.primaryButton}
                                    >
                                        <Text style={styles.primaryButtonText}>
                                            Record — ₹{cashAmount || '0'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ══════════════════════════════════════════════════════ */}
            {/* Confirmation Modal                                    */}
            {/* ══════════════════════════════════════════════════════ */}
            <Modal visible={showConfirm} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Confirm Transaction</Text>

                        {/* Merchant */}
                        <View style={styles.confirmRow}>
                            <Text style={styles.confirmLabel}>Merchant</Text>
                            {editMode ? (
                                <TextInput
                                    style={styles.confirmInput}
                                    value={confirmData?.merchant ?? ''}
                                    onChangeText={(v) => updateConfirmField('merchant', v)}
                                />
                            ) : (
                                <Text style={styles.confirmValue}>{confirmData?.merchant}</Text>
                            )}
                        </View>

                        {/* Category */}
                        <View style={styles.confirmRow}>
                            <Text style={styles.confirmLabel}>Category</Text>
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryBadgeText}>{confirmData?.category}</Text>
                            </View>
                        </View>

                        {/* Amount */}
                        <View style={styles.confirmRow}>
                            <Text style={styles.confirmLabel}>Amount</Text>
                            {editMode ? (
                                <TextInput
                                    style={styles.confirmInput}
                                    value={confirmData?.amount ?? ''}
                                    onChangeText={(v) => updateConfirmField('amount', v)}
                                    keyboardType="numeric"
                                />
                            ) : (
                                <Text style={styles.confirmAmount}>
                                    ₹{Number(confirmData?.amount ?? 0).toLocaleString('en-IN')}
                                </Text>
                            )}
                        </View>

                        {/* Payment Type */}
                        <View style={styles.confirmRow}>
                            <Text style={styles.confirmLabel}>Payment Type</Text>
                            <View style={styles.methodTag}>
                                <Text style={styles.methodTagText}>
                                    {confirmData?.paymentType === 'upi' ? '📱 UPI' :
                                     confirmData?.paymentType === 'qr' ? '📷 QR' : '💵 Cash'}
                                </Text>
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => {
                                    setShowConfirm(false);
                                    setEditMode(false);
                                }}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>

                            {!editMode && (
                                <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
                                    <Text style={styles.editText}>✏️ Edit</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.confirmBtn}
                                onPress={handleConfirm}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={Colors.gradientSuccess}
                                    style={styles.confirmGradient}
                                >
                                    <Text style={styles.confirmText}>
                                        {loading ? 'Processing...' : '✓ Confirm'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ══════════════════════════════════════════════════════ */}
            {/* Success Modal                                         */}
            {/* ══════════════════════════════════════════════════════ */}
            <Modal visible={showSuccess} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.successCard}>
                        <View style={styles.successCircle}>
                            <Text style={styles.successEmoji}>✅</Text>
                        </View>
                        <Text style={styles.successTitle}>Payment Recorded!</Text>
                        <Text style={styles.successTxn}>Transaction ID: {txnId}</Text>
                        <TouchableOpacity
                            style={styles.doneBtn}
                            onPress={() => {
                                setShowSuccess(false);
                                resetAll();
                            }}
                        >
                            <Text style={styles.doneBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: Spacing.md,
        paddingTop: 60,
        paddingBottom: Spacing.xxl,
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

    // ── Primary Action Cards ──────────────────────────────────
    actionsContainer: {
        gap: Spacing.md,
    },
    actionCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        ...Shadows.card,
    },
    actionIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionIcon: {
        fontSize: 28,
    },
    actionTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    actionDesc: {
        fontSize: FontSize.sm,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },

    // ── Flow Card (UPI / Cash forms) ──────────────────────────
    flowCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    flowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    backArrow: {
        fontSize: FontSize.md,
        color: Colors.primary,
        fontWeight: '600',
    },
    flowTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
    },

    // ── Cash sub-options ──────────────────────────────────────
    cashOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cashOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    cashOptionContent: {
        flex: 1,
    },
    cashOptionTitle: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    cashOptionDesc: {
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        marginTop: 2,
    },
    cashOptionArrow: {
        fontSize: 24,
        color: Colors.textMuted,
        fontWeight: '300',
    },

    // ── Form Fields ───────────────────────────────────────────
    inputGroup: {
        marginBottom: Spacing.sm,
    },
    fieldLabel: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontWeight: '600',
        marginBottom: Spacing.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
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
        height: 50,
        color: Colors.textPrimary,
        fontSize: FontSize.md,
    },
    error: {
        color: Colors.danger,
        fontSize: FontSize.sm,
        marginVertical: Spacing.sm,
        textAlign: 'center',
    },

    // ── Preview card ──────────────────────────────────────────
    previewCard: {
        backgroundColor: Colors.primary + '12',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginTop: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    previewLabel: {
        fontSize: FontSize.xs,
        color: Colors.textMuted,
        fontWeight: '600',
        marginBottom: 4,
    },
    previewValue: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.primary,
    },

    // ── Primary Button ────────────────────────────────────────
    buttonContainer: {
        marginTop: Spacing.lg,
    },
    primaryButton: {
        height: 54,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.button,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: FontSize.lg,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // ── Confirmation Modal ────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    modalTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    confirmRow: {
        marginBottom: Spacing.md,
    },
    confirmLabel: {
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        fontWeight: '600',
        marginBottom: Spacing.xs,
    },
    confirmValue: {
        fontSize: FontSize.md,
        color: Colors.textPrimary,
        fontWeight: '600',
    },
    confirmAmount: {
        fontSize: FontSize.xl,
        color: Colors.textPrimary,
        fontWeight: '800',
    },
    confirmInput: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.textPrimary,
        fontSize: FontSize.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    categoryBadge: {
        backgroundColor: Colors.info + '20',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        alignSelf: 'flex-start',
    },
    categoryBadgeText: {
        color: Colors.info,
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
    methodTag: {
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.md,
        alignSelf: 'flex-start',
    },
    methodTagText: {
        color: Colors.textPrimary,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.lg,
    },
    cancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
    },
    cancelText: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        fontWeight: '600',
    },
    editBtn: {
        flex: 1,
        height: 48,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    editText: {
        color: Colors.primary,
        fontSize: FontSize.md,
        fontWeight: '600',
    },
    confirmBtn: {
        flex: 1,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    confirmGradient: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BorderRadius.md,
    },
    confirmText: {
        color: '#FFFFFF',
        fontSize: FontSize.md,
        fontWeight: '700',
    },

    // ── Success Modal ─────────────────────────────────────────
    successCard: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.xl,
        alignItems: 'center',
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
    successEmoji: {
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
    doneBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        width: '100%',
        alignItems: 'center',
    },
    doneBtnText: {
        color: '#FFFFFF',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
});
