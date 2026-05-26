/**
 * Root layout — wraps every screen.
 * Responsibilities:
 *   1. Provide TanStack Query client
 *   2. Show one-time age-verification gate (AsyncStorage persisted)
 *   3. Register Expo push token once after gate is accepted
 */
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// Query client
// ---------------------------------------------------------------------------

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 2,
    },
  },
});

// ---------------------------------------------------------------------------
// Push token registration (moved here from alerts tab — runs once at app start)
// ---------------------------------------------------------------------------

const BASE_URL: string =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3000';

async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return; // skip simulator/emulator

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[push] permission denied');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('price-alerts', {
      name: 'Price Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  const projectId: string | undefined = (
    Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  )?.eas?.projectId;

  if (!projectId) {
    console.warn('[push] no EAS projectId in app.json — skipping token registration');
    return;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await fetch(`${BASE_URL}/api/user/push-token`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken: tokenData.data }),
    });
    console.log('[push] token registered');
  } catch (err) {
    console.error('[push] failed to register token:', err);
  }
}

// ---------------------------------------------------------------------------
// Age gate
// ---------------------------------------------------------------------------

const AGE_GATE_KEY = 'whisky_hunter_age_verified';

function AgeGate({ onAccept }: { onAccept: () => void }) {
  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={gateStyles.overlay}>
        <View style={gateStyles.card}>
          <Text style={gateStyles.logo}>🥃</Text>
          <Text style={gateStyles.title}>Age Verification</Text>
          <Text style={gateStyles.body}>
            WhiskyHunter is an alcohol product finder. You must be of legal
            drinking age in your country to use this app.
          </Text>
          <Text style={gateStyles.question}>Are you of legal drinking age?</Text>

          <TouchableOpacity style={gateStyles.yesBtn} onPress={onAccept}>
            <Text style={gateStyles.yesBtnText}>Yes, I am</Text>
          </TouchableOpacity>

          <Text style={gateStyles.noText}>
            If you are not of legal age, please close the app.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const gateStyles = StyleSheet.create({
  overlay:    {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card:       {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#b8860b',
  },
  logo:       { fontSize: 40, marginBottom: 8 },
  title:      { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 12 },
  body:       { color: '#aaa', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  question:   { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 20 },
  yesBtn:     {
    backgroundColor: '#b8860b',
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  yesBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  noText:     { color: '#555', fontSize: 11, marginTop: 16, textAlign: 'center' },
});

// ---------------------------------------------------------------------------
// Root layout component
// ---------------------------------------------------------------------------

export default function RootLayout() {
  const [gateVisible, setGateVisible] = useState(false);
  const [gateChecked, setGateChecked] = useState(false);

  // Check AsyncStorage on mount — show gate only on first launch
  useEffect(() => {
    AsyncStorage.getItem(AGE_GATE_KEY)
      .then((value) => {
        if (value !== 'true') {
          setGateVisible(true);
        }
      })
      .catch(() => {
        // If storage fails, show gate to be safe
        setGateVisible(true);
      })
      .finally(() => setGateChecked(true));
  }, []);

  // Register push token once age gate is resolved
  useEffect(() => {
    if (gateChecked && !gateVisible) {
      void registerPushToken();
    }
  }, [gateChecked, gateVisible]);

  async function handleAgeAccepted() {
    await AsyncStorage.setItem(AGE_GATE_KEY, 'true').catch(() => {});
    setGateVisible(false);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      {gateVisible && <AgeGate onAccept={() => void handleAgeAccepted()} />}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#b8860b',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Sign In', headerShown: false }} />
        <Stack.Screen
          name="product/[id]"
          options={{ title: 'Product Details' }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
