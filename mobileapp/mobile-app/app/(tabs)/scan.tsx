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
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../constants/theme';
import { makePayment, scanBill } from '../../services/api';
import { extractMerchantFromUPI, categorizeMerchant } from '../../services/categorize';

// ─── Parse UPI QR string ──────────────────────────────────────────
// Standard UPI QR format: upi://pay?pa=merchant@upi&pn=Merchant+Name&am=100
function parseUPIQR(data: string): { upiId: string; merchant: string; amount: string } {
    const result = { upiId: '', merchant: '', amount: '' };

    if (data.toLowerCase().startsWith('upi://')) {
        try {
            const url = new URL(data);
            result.upiId = url.searchParams.get('pa') ?? '';
            result.merchant = url.searchParams.get('pn')?.replace(/\+/g, ' ') ?? '';
            result.amount = url.searchParams.get('am') ?? '';
        } catch {
            // fallback: manual parse
            const paMatch = data.match(/pa=([^&]+)/);
            const pnMatch = data.match(/pn=([^&]+)/);
            const amMatch = data.match(/am=([^&]+)/);
            if (paMatch) result.upiId = decodeURIComponent(paMatch[1]);
            if (pnMatch) result.merchant = decodeURIComponent(pnMatch[1]).replace(/\+/g, ' ');
            if (amMatch) result.amount = decodeURIComponent(amMatch[1]);
        }
    } else {
        // Legacy format: "merchant:amount" or just text
        const parts = data.split(':');
        if (parts.length >= 2) {
            result.merchant = parts[0].trim();
            result.amount = parts[1].trim();
        } else {
            result.merchant = data.trim();
        }
    }

    // Fallback merchant extraction from UPI ID
    if (!result.merchant && result.upiId) {
        result.merchant = extractMerchantFromUPI(result.upiId);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function ScanScreen() {
    const params = useLocalSearchParams<{ mode?: string }>();
    const router = useRouter();
    const isBillMode = params.mode === 'bill';

    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [merchant, setMerchant] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [txnId, setTxnId] = useState('');
    const [loading, setLoading] = useState(false);

    // ── Bill-mode state ──────────────────────────────────────────
    type BillPhase = 'idle' | 'scanning' | 'confirm' | 'error' | 'success';
    const [billPhase, setBillPhase] = useState<BillPhase>('idle');
    const [billItems, setBillItems] = useState<string[]>([]);
    const [billLoading, setBillLoading] = useState(false);
    const [billTxnId, setBillTxnId] = useState('');
    const billCameraRef = useRef<any>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isBillMode) return; // no pulse animation for bill mode
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
    }, [isBillMode]);

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);

        const parsed = parseUPIQR(data);
        setMerchant(parsed.merchant);
        setAmount(parsed.amount);
        setCategory(categorizeMerchant(parsed.merchant));
        setShowConfirm(true);
    };

    const handleSimulateScan = () => {
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
        setCategory(categorizeMerchant(random.name));
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
                payment_method: 'qr',
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
        setCategory('');
        setShowSuccess(false);
        setTxnId('');
    };

    const goBack = () => {
        router.back();
    };

    // ─── Bill-mode helpers ─────────────────────────────────────
    const handleCaptureBill = async () => {
        if (!billCameraRef.current) return;
        try {
            const photo = await billCameraRef.current.takePictureAsync({
                quality: 0.7,
                base64: false,
            });
            setBillPhase('scanning');
            setBillLoading(true);

            try {
                const ocrResult = await scanBill(photo.uri);

                if (!ocrResult.merchant && !ocrResult.total_amount) {
                    setBillPhase('error');
                    return;
                }

                setMerchant(ocrResult.merchant || '');
                setAmount(ocrResult.total_amount ? String(ocrResult.total_amount) : '');
                setCategory(categorizeMerchant(ocrResult.merchant || ''));
                setBillItems(ocrResult.items || []);
                setBillPhase('confirm');
            } catch {
                setBillPhase('error');
            } finally {
                setBillLoading(false);
            }
        } catch {
            Alert.alert('Error', 'Failed to capture image. Please try again.');
        }
    };

    const handleConfirmBill = async () => {
        if (!merchant.trim() || !amount.trim()) {
            Alert.alert('Error', 'Merchant name and amount are required');
            return;
        }
        setBillLoading(true);
        try {
            const result = await makePayment({
                merchant_name: merchant,
                amount: parseFloat(amount),
                payment_method: 'cash',
            });
            setBillTxnId(result.transaction_id);
            setBillPhase('success');
        } catch {
            Alert.alert('Error', 'Failed to save transaction. Check backend connection.');
        } finally {
            setBillLoading(false);
        }
    };

    const resetBill = () => {
        setBillPhase('idle');
        setMerchant('');
        setAmount('');
        setCategory('');
        setBillItems([]);
        setBillTxnId('');
    };

    // ─── Bill Scan Flow ──────────────────────────────────────
    if (isBillMode) {
        // ── Permission not yet determined
        if (!permission) {
            return (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={[styles.permText, { marginTop: Spacing.md }]}>
                        Requesting camera permission...
                    </Text>
                </View>
            );
        }

        // ── Permission denied
        if (!permission.granted) {
            return (
                <LinearGradient colors={Colors.gradientDark} style={styles.container}>
                    <View style={styles.permContainer}>
                        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                            <Text style={styles.backBtnText}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.permIcon}>📷</Text>
                        <Text style={styles.permTitle}>Camera Access Required</Text>
                        <Text style={styles.permDesc}>
                            SmartSpend needs camera access to scan bills for OCR.
                        </Text>
                        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
                            <Text style={styles.permButtonText}>Grant Permission</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            );
        }

        // ── Scanning / Loading overlay
        if (billPhase === 'scanning') {
            return (
                <LinearGradient colors={Colors.gradientDark} style={styles.container}>
                    <View style={styles.billScanningOverlay}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.billScanningText}>Scanning bill...</Text>
                        <Text style={styles.billScanningSubtext}>
                            Extracting merchant, amount and items
                        </Text>
                    </View>
                </LinearGradient>
            );
        }

        // ── Confirmation UI
        if (billPhase === 'confirm') {
            return (
                <LinearGradient colors={Colors.gradientDark} style={styles.container}>
                    <View style={styles.billContainer}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => { resetBill(); goBack(); }}>
                            <Text style={styles.backBtnText}>← Back</Text>
                        </TouchableOpacity>

                        <ScrollView
                            style={styles.billScrollView}
                            contentContainerStyle={styles.billScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.billResultHeader}>
                                <View style={styles.billIconCircle}>
                                    <Text style={{ fontSize: 40 }}>✅</Text>
                                </View>
                                <Text style={styles.billTitle}>Bill Scanned</Text>
                                <Text style={styles.billDesc}>Please verify the detected details before saving.</Text>
                            </View>

                            <View style={styles.billConfirmCard}>
                                <View style={styles.confirmField}>
                                    <Text style={styles.confirmLabel}>Merchant</Text>
                                    <TextInput
                                        style={styles.confirmInput}
                                        value={merchant}
                                        onChangeText={(v) => {
                                            setMerchant(v);
                                            setCategory(categorizeMerchant(v));
                                        }}
                                        placeholderTextColor={Colors.textMuted}
                                        placeholder="Merchant name"
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
                                        placeholder="Enter amount"
                                    />
                                </View>

                                <View style={styles.confirmField}>
                                    <Text style={styles.confirmLabel}>Category</Text>
                                    <View style={styles.categoryBadge}>
                                        <Text style={styles.categoryBadgeText}>{category}</Text>
                                    </View>
                                </View>

                                <View style={styles.confirmField}>
                                    <Text style={styles.confirmLabel}>Payment Method</Text>
                                    <View style={[styles.methodBadge, { backgroundColor: Colors.warning + '20' }]}>
                                        <Text style={[styles.methodBadgeText, { color: Colors.warning }]}>💵 Cash</Text>
                                    </View>
                                </View>

                                {billItems.length > 0 && (
                                    <View style={styles.confirmField}>
                                        <Text style={styles.confirmLabel}>
                                            Items Detected ({billItems.length})
                                        </Text>
                                        <View style={styles.billItemsList}>
                                            {billItems.map((item, idx) => (
                                                <View key={idx} style={styles.billItemRow}>
                                                    <Text style={styles.billItemBullet}>•</Text>
                                                    <Text style={styles.billItemText}>{item}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>

                            <View style={styles.billConfirmActions}>
                                <TouchableOpacity
                                    style={styles.confirmBtn}
                                    onPress={handleConfirmBill}
                                    disabled={billLoading}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={Colors.gradientSuccess}
                                        style={styles.confirmGradient}
                                    >
                                        <Text style={styles.confirmText}>
                                            {billLoading ? 'Saving...' : '✓ Confirm Transaction'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.billEditBtn}
                                    onPress={() => setBillPhase('idle')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.billEditBtnText}>📸 Rescan</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </LinearGradient>
            );
        }

        // ── Error / Fallback
        if (billPhase === 'error') {
            return (
                <LinearGradient colors={Colors.gradientDark} style={styles.container}>
                    <View style={styles.billContainer}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => { resetBill(); goBack(); }}>
                            <Text style={styles.backBtnText}>← Back</Text>
                        </TouchableOpacity>

                        <ScrollView
                            style={styles.billScrollView}
                            contentContainerStyle={styles.billScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.billResultHeader}>
                                <View style={[styles.billIconCircle, { backgroundColor: Colors.danger + '15' }]}>
                                    <Text style={{ fontSize: 40 }}>⚠️</Text>
                                </View>
                                <Text style={styles.billTitle}>Scan Failed</Text>
                                <Text style={styles.billDesc}>
                                    Could not detect bill clearly. Please enter details manually.
                                </Text>
                            </View>

                            <View style={styles.billConfirmCard}>
                                <View style={styles.confirmField}>
                                    <Text style={styles.confirmLabel}>Merchant</Text>
                                    <TextInput
                                        style={styles.confirmInput}
                                        value={merchant}
                                        onChangeText={(v) => {
                                            setMerchant(v);
                                            setCategory(categorizeMerchant(v));
                                        }}
                                        placeholderTextColor={Colors.textMuted}
                                        placeholder="Enter merchant name"
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
                                        placeholder="Enter amount"
                                    />
                                </View>

                                <View style={styles.confirmField}>
                                    <Text style={styles.confirmLabel}>Category</Text>
                                    <View style={styles.categoryBadge}>
                                        <Text style={styles.categoryBadgeText}>
                                            {category || 'Others'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.billConfirmActions}>
                                <TouchableOpacity
                                    style={styles.confirmBtn}
                                    onPress={handleConfirmBill}
                                    disabled={billLoading || !merchant.trim() || !amount.trim()}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={Colors.gradientSuccess}
                                        style={[
                                            styles.confirmGradient,
                                            (!merchant.trim() || !amount.trim()) && { opacity: 0.5 },
                                        ]}
                                    >
                                        <Text style={styles.confirmText}>
                                            {billLoading ? 'Saving...' : '✓ Save Transaction'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.billEditBtn}
                                    onPress={resetBill}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.billEditBtnText}>📸 Try Again</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </LinearGradient>
            );
        }

        // ── Success
        if (billPhase === 'success') {
            return (
                <LinearGradient colors={Colors.gradientDark} style={styles.container}>
                    <View style={styles.billScanningOverlay}>
                        <View style={styles.successCircle}>
                            <Text style={styles.successEmoji}>✅</Text>
                        </View>
                        <Text style={styles.successTitle}>Transaction Saved!</Text>
                        <Text style={styles.successTxn}>TXN: {billTxnId}</Text>
                        <Text style={styles.billSuccessDetail}>
                            {merchant} — ₹{amount}
                        </Text>
                        <TouchableOpacity
                            style={[styles.doneBtn, { width: '80%', marginTop: Spacing.lg }]}
                            onPress={() => { resetBill(); goBack(); }}
                        >
                            <Text style={styles.doneBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            );
        }

        // ── Camera viewfinder (idle)
        return (
            <View style={styles.container}>
                <CameraView
                    ref={billCameraRef}
                    style={styles.camera}
                >
                    <LinearGradient
                        colors={['rgba(10,14,26,0.8)', 'transparent', 'rgba(10,14,26,0.85)']}
                        style={styles.overlay}
                    >
                        {/* Header */}
                        <View style={styles.scanHeader}>
                            <TouchableOpacity onPress={goBack}>
                                <Text style={styles.scanBackText}>← Back</Text>
                            </TouchableOpacity>
                            <Text style={styles.scanTitle}>Scan Bill</Text>
                            <Text style={styles.scanSubtitle}>
                                Position the bill within the frame
                            </Text>
                        </View>

                        {/* Bill Frame */}
                        <View style={styles.billFrame}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                            <Text style={styles.billFrameHint}>🧾</Text>
                        </View>

                        {/* Capture button */}
                        <View style={styles.bottomArea}>
                            <TouchableOpacity
                                style={styles.captureButton}
                                onPress={handleCaptureBill}
                                activeOpacity={0.7}
                            >
                                <View style={styles.captureOuter}>
                                    <View style={styles.captureInner} />
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.captureHint}>Tap to capture</Text>
                        </View>
                    </LinearGradient>
                </CameraView>
            </View>
        );
    }

    // ─── Permission not yet determined ────────────────────────
    if (!permission) {
        return (
            <View style={styles.center}>
                <Text style={styles.permText}>Requesting camera permission...</Text>
            </View>
        );
    }

    // ─── Permission denied ────────────────────────────────────
    if (!permission.granted) {
        return (
            <LinearGradient colors={Colors.gradientDark} style={styles.container}>
                <View style={styles.permContainer}>
                    <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                        <Text style={styles.backBtnText}>← Back</Text>
                    </TouchableOpacity>

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

    // ─── Camera QR Scanner ────────────────────────────────────
    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
                <LinearGradient
                    colors={['rgba(10,14,26,0.8)', 'transparent', 'rgba(10,14,26,0.8)']}
                    style={styles.overlay}
                >
                    {/* Header */}
                    <View style={styles.scanHeader}>
                        <TouchableOpacity onPress={goBack}>
                            <Text style={styles.scanBackText}>← Back</Text>
                        </TouchableOpacity>
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
                        <Text style={styles.modalTitle}>Confirm QR Payment</Text>

                        <View style={styles.confirmField}>
                            <Text style={styles.confirmLabel}>Merchant</Text>
                            <TextInput
                                style={styles.confirmInput}
                                value={merchant}
                                onChangeText={(v) => {
                                    setMerchant(v);
                                    setCategory(categorizeMerchant(v));
                                }}
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>

                        <View style={styles.confirmField}>
                            <Text style={styles.confirmLabel}>Category</Text>
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryBadgeText}>{category}</Text>
                            </View>
                        </View>

                        <View style={styles.confirmField}>
                            <Text style={styles.confirmLabel}>Amount (₹)</Text>
                            <TextInput
                                style={styles.confirmInput}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                                placeholderTextColor={Colors.textMuted}
                                placeholder="Enter amount"
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
                                        {loading ? 'Processing...' : '✓ Confirm Pay'}
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
                            onPress={() => {
                                resetScanner();
                                goBack();
                            }}
                        >
                            <Text style={styles.doneBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════

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

    // ── Back button ───────────────────────────────────────────
    backBtn: {
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.lg,
        paddingTop: 60,
        paddingBottom: Spacing.md,
    },
    backBtnText: {
        color: Colors.primary,
        fontSize: FontSize.md,
        fontWeight: '600',
    },

    // ── Scan header ───────────────────────────────────────────
    scanHeader: {
        alignItems: 'center',
    },
    scanBackText: {
        color: '#FFFFFF',
        fontSize: FontSize.md,
        fontWeight: '600',
        marginBottom: Spacing.md,
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

    // ── Permission Screen ─────────────────────────────────────
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

    // ── Bill Scan ──────────────────────────────────────────────
    billContainer: {
        flex: 1,
    },
    billScrollView: {
        flex: 1,
    },
    billScrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    billResultHeader: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    billIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.success + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    billTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    billDesc: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    billConfirmCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        marginBottom: Spacing.lg,
    },
    billItemsList: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        maxHeight: 150,
    },
    billItemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: Spacing.xs,
    },
    billItemBullet: {
        color: Colors.primary,
        fontSize: FontSize.md,
        marginRight: Spacing.sm,
        lineHeight: 20,
    },
    billItemText: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        flex: 1,
        lineHeight: 20,
    },
    billConfirmActions: {
        gap: Spacing.md,
    },
    billEditBtn: {
        height: 50,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    billEditBtnText: {
        color: Colors.textSecondary,
        fontSize: FontSize.md,
        fontWeight: '600',
    },
    billScanningOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    billScanningText: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginTop: Spacing.lg,
    },
    billScanningSubtext: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
    },
    billSuccessDetail: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
    },
    billFrame: {
        width: 280,
        height: 200,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    billFrameHint: {
        fontSize: 48,
        opacity: 0.3,
    },
    captureButton: {
        alignItems: 'center',
    },
    captureOuter: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 4,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureInner: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#FFFFFF',
    },
    captureHint: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: FontSize.sm,
        marginTop: Spacing.sm,
    },

    // ── Modals ────────────────────────────────────────────────
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

    // ── Success ───────────────────────────────────────────────
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
