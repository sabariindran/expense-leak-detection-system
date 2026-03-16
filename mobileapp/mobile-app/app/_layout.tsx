import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoggedIn === null) return;
    if (!navigationState?.key) return; // router not ready yet

    if (!isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoggedIn, navigationState?.key]);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('isLoggedIn');
      setIsLoggedIn(token === 'true');
    } catch {
      setIsLoggedIn(false);
    }
  };

  if (isLoggedIn === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
