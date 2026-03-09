import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Modal,
    Animated,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { makePayment } from '../../services/api';

export default function ScanScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [merchant, setMerchant] = useState('');
    const [amount, setAmount] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [txnId, setTxnId] = useState('');
    const [loading, setLoading] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Pulse animation for scan frame
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);

        // Parse QR data — expect format: "merchant:amount" or just use the data
        const parts = data.split(':');
        if (parts.length >= 2) {
            setMerchant(parts[0].trim());
            setAmount(parts[1].trim());
        } else {
            setMerchant(data.trim());
            setAmount('');
        }
        setShowConfirm(true);
    };

    const handleSimulateScan = () => {
        // Simulate a QR scan for demo purposes
        const demoMerchants = [
            { name: 'Starbucks', amount: '350' },
            { name: 'Amazon', amount: '1299' },
            { name: 'Uber', amount: '180' },
            { name: 'BigBasket', amount: '650' },
            { name: 'BookMyShow', amount: '500' },
        ];
        const random = demoMerchants[Math.floor(Math.random() * demoMerchants.length)];
        setMerchant(random.name);
        setAmount(random.amount);
        setScanned(true);
        setShowConfirm(true);
    };

    const handleConfirmPayment = async () => {
        if (!merchant.trim() || !amount.trim()) {
            Alert.alert('Error', 'Merchant name and amount are required');
            return;
        }

        setLoading(true);
        try {
            const result = await makePayment({
                merchant_name: merchant,
                amount: parseFloat(amount),
                payment_method: 'QR',
            });
            setTxnId(result.transaction_id);
            setShowConfirm(false);
            setShowSuccess(true);
        } catch {
            Alert.alert('Error', 'Payment failed. Check backend connection.');
        } finally {
            setLoading(false);
        }
    };

    const resetScanner = () => {
        setScanned(false);
        setMerchant('');
        setAmount('');
        setShowSuccess(false);
        setTxnId('');
    };

    // Permission not yet determined
    if (!permission) {
        return (
            <View style={styles.center}>
                <Text style={styles.permText}>Requesting camera permission...</Text>
            </View>
        );
    }

    // Permission denied
    if (!permission.granted) {
        return (
            <LinearGradient colors={Colors.gradientDark} style={styles.container}>
                <View style={styles.permContainer}>
                    <Text style={styles.permIcon}>📷</Text>
                    <Text style={styles.permTitle}>Camera Access Required</Text>
                    <Text style={styles.permDesc}>
                        SmartSpend needs camera access to scan QR codes for payments.
                    </Text>
                    <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
                        <Text style={styles.permButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.permButton, styles.simButton]}
                        onPress={handleSimulateScan}
                    >
                        <Text style={[styles.permButtonText, { color: Colors.primary }]}>
                            Simulate Scan Instead
                        </Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
                {/* Overlay */}
                <LinearGradient
                    colors={['rgba(10,14,26,0.8)', 'transparent', 'rgba(10,14,26,0.8)']}
                    style={styles.overlay}
                >
                    {/* Header */}
                    <View style={styles.scanHeader}>
                        <Text style={styles.scanTitle}>Scan QR Code</Text>
                        <Text style={styles.scanSubtitle}>
                            Point camera at a payment QR code
                        </Text>
                    </View>

                    {/* Scan Frame */}
                    <Animated.View
                        style={[
                            styles.scanFrame,
                            { transform: [{ scale: pulseAnim }] },
                        ]}
                    >
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </Animated.View>

                    {/* Bottom buttons */}
                    <View style={styles.bottomArea}>
                        <TouchableOpacity
                            style={styles.simulateButton}
                            onPress={handleSimulateScan}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={Colors.gradientPrimary}
                                style={styles.simulateGradient}
                            >
                                <Text style={styles.simulateText}>⚡ Simulate Scan</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {scanned && (
                            <TouchableOpacity
                                style={styles.resetButton}
                                onPress={resetScanner}
                            >
                                <Text style={styles.resetText}>🔄 Scan Again</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>
            </CameraView>

            {/* Confirm Payment Modal */}
            <Modal visible={showConfirm} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Confirm Payment</Text>

                        <View style={styles.confirmField}>
                            <Text style={styles.confirmLabel}>Merchant</Text>
                            <TextInput
                                style={styles.confirmInput}
                                value={merchant}
                                onChangeText={setMerchant}
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>

                        <View style={styles.confirmField}>
                            <Text style={styles.confirmLabel}>Amount (₹)</Text>
                            <TextInput
                                style={styles.confirmInput}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>

                        <View style={styles.confirmField}>
                            <Text style={styles.confirmLabel}>Method</Text>
                            <View style={styles.methodBadge}>
                                <Text style={styles.methodBadgeText}>📷 QR Payment</Text>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => {
                                    setShowConfirm(false);
                                    resetScanner();
                                }}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmBtn}
                                onPress={handleConfirmPayment}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={Colors.gradientSuccess}
                                    style={styles.confirmGradient}
                                >
                                    <Text style={styles.confirmText}>
                                        {loading ? 'Processing...' : 'Confirm Pay'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Success Modal */}
            <Modal visible={showSuccess} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.successCircle}>
                            <Text style={styles.successEmoji}>✅</Text>
                        </View>
                        <Text style={styles.successTitle}>QR Payment Successful!</Text>
                        <Text style={styles.successTxn}>TXN: {txnId}</Text>
                        <TouchableOpacity
                            style={styles.doneBtn}
                            onPress={resetScanner}
                        >
                            <Text style={styles.doneBtnText}>Scan Another</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 60,
    },
    scanHeader: {
        alignItems: 'center',
    },
    scanTitle: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    scanSubtitle: {
        fontSize: FontSize.sm,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
    },
    scanFrame: {
        width: 240,
        height: 240,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: Colors.primary,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 12,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 12,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 12,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 12,
    },
    bottomArea: {
        alignItems: 'center',
        gap: Spacing.md,
    },
    simulateButton: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    simulateGradient: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    simulateText: {
        color: '#FFFFFF',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    resetButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    resetText: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
    },
    // Permission Screen
    permContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    permIcon: {
        fontSize: 64,
        marginBottom: Spacing.lg,
    },
    permTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    permDesc: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.lg,
        lineHeight: 22,
    },
    permText: {
        color: Colors.textMuted,
        fontSize: FontSize.md,
    },
    permButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        width: '100%',
        alignItems: 'center',
    },
    permButtonText: {
        color: '#FFFFFF',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    simButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
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
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    confirmField: {
        marginBottom: Spacing.md,
    },
    confirmLabel: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontWeight: '600',
        marginBottom: Spacing.xs,
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
    methodBadge: {
        backgroundColor: Colors.success + '20',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    methodBadgeText: {
        color: Colors.success,
        fontSize: FontSize.md,
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.lg,
    },
    cancelBtn: {
        flex: 1,
        height: 50,
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
    confirmBtn: {
        flex: 1,
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    confirmGradient: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BorderRadius.md,
    },
    confirmText: {
        color: '#FFFFFF',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    // Success
    successCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.success + '20',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: Spacing.md,
        marginTop: Spacing.md,
    },
    successEmoji: {
        fontSize: 36,
    },
    successTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.success,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    successTxn: {
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    doneBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    doneBtnText: {
        color: '#FFFFFF',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
});
