import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../constants/theme';

export default function LoginScreen() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const buttonScale = new Animated.Value(1);

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password');
            return;
        }

        setLoading(true);
        setError('');

        // Simulate auth delay for demo
        await new Promise((r) => setTimeout(r, 800));

        // Demo credentials: any non-empty username/password works
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('userName', username);
        setLoading(false);
        router.replace('/(tabs)');
    };

    const handlePressIn = () => {
        Animated.spring(buttonScale, {
            toValue: 0.96,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(buttonScale, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    return (
        <LinearGradient
            colors={['#0F172A', '#0A0E1A', '#111827']}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                {/* Logo Area */}
                <View style={styles.logoArea}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoEmoji}>💰</Text>
                    </View>
                    <Text style={styles.appName}>SmartSpend</Text>
                    <Text style={styles.tagline}>AI-Powered Expense Intelligence</Text>
                </View>

                {/* Login Form */}
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Welcome Back</Text>
                    <Text style={styles.formSubtitle}>Sign in to continue</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Username</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputIcon}>👤</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter username"
                                placeholderTextColor={Colors.textMuted}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Password</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputIcon}>🔒</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter password"
                                placeholderTextColor={Colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={handleLogin}
                            onPressIn={handlePressIn}
                            onPressOut={handlePressOut}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={Colors.gradientPrimary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.button}
                            >
                                <Text style={styles.buttonText}>
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    <Text style={styles.hint}>
                        💡 Demo mode — use any credentials to login
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    logoArea: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
        borderWidth: 2,
        borderColor: Colors.primary + '40',
    },
    logoEmoji: {
        fontSize: 36,
    },
    appName: {
        fontSize: FontSize.hero,
        fontWeight: '800',
        color: Colors.textPrimary,
        letterSpacing: -1,
    },
    tagline: {
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
        letterSpacing: 0.5,
    },
    formCard: {
        backgroundColor: Colors.surfaceGlass,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    formTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    formSubtitle: {
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        marginBottom: Spacing.lg,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    inputLabel: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontWeight: '600',
        marginBottom: Spacing.xs,
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
        height: 50,
        color: Colors.textPrimary,
        fontSize: FontSize.md,
    },
    error: {
        color: Colors.danger,
        fontSize: FontSize.sm,
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    button: {
        height: 52,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.button,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: FontSize.lg,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    hint: {
        color: Colors.textMuted,
        fontSize: FontSize.xs,
        textAlign: 'center',
        marginTop: Spacing.md,
    },
});
