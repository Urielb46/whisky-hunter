/**
 * Price Alerts tab.
 * On first mount, registers the device push token with the API.
 */
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const BASE_URL: string =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3000';

interface PriceAlert {
  id: string;
  productId: string;
  productName: string | null;
  targetPriceGbp: number;
  currency: string;
  active: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

async function fetchAlerts(): Promise<PriceAlert[]> {
  const res = await fetch(`${BASE_URL}/api/alerts`, {
    credentials: 'include',
  });
  if (res.status === 401) return [];
  const data = (await res.json()) as { alerts: PriceAlert[] };
  return data.alerts;
}

// ---------------------------------------------------------------------------
// Push token registration
// ---------------------------------------------------------------------------

async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return; // skip emulator

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[alerts] push permission denied');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('price-alerts', {
      name: 'Price Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  const projectId: string | undefined =
    (
      Constants.expoConfig?.extra as
        | { eas?: { projectId?: string } }
        | undefined
    )?.eas?.projectId;

  if (!projectId) {
    console.warn('[alerts] no EAS projectId in app.json');
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;

  try {
    await fetch(`${BASE_URL}/api/user/push-token`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken: token }),
    });
    console.log('[alerts] push token registered');
  } catch (err) {
    console.error('[alerts] failed to save push token:', err);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AlertsScreen() {
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
    staleTime: 1000 * 60,
  });

  // Register push token once on mount
  useEffect(() => {
    void registerPushToken();
  }, []);

  if (isFetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#b8860b" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Failed to load alerts</Text>
        <TouchableOpacity onPress={() => void refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>No price alerts set.</Text>
        <Text style={styles.emptySub}>Open a product to set a target price.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.row, !item.active && styles.rowInactive]}
          onPress={() => router.push(`/product/${item.productId}`)}
        >
          <View style={styles.rowBody}>
            <Text style={styles.rowName} numberOfLines={2}>
              {item.productName ?? item.productId}
            </Text>
            <Text style={styles.rowTarget}>
              Target: £{(item.targetPriceGbp / 100).toFixed(2)}
              {item.currency !== 'GBP' ? ` (${item.currency})` : ''}
            </Text>
            {item.lastTriggeredAt ? (
              <Text style={styles.rowTriggered}>
                Last triggered: {new Date(item.lastTriggeredAt).toLocaleDateString()}
              </Text>
            ) : null}
          </View>
          <View style={[styles.badge, item.active ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={styles.badgeText}>{item.active ? 'ON' : 'OFF'}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0d0d1a' },
  list:          { padding: 12 },
  center:        { flex: 1, backgroundColor: '#0d0d1a', alignItems: 'center', justifyContent: 'center' },
  row:           {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  rowInactive:   { opacity: 0.5 },
  rowBody:       { flex: 1 },
  rowName:       { color: '#fff', fontSize: 14, fontWeight: '600' },
  rowTarget:     { color: '#b8860b', fontSize: 14, fontWeight: '700', marginTop: 4 },
  rowTriggered:  { color: '#666', fontSize: 11, marginTop: 2 },
  badge:         { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  badgeActive:   { backgroundColor: '#1a4a1a' },
  badgeInactive: { backgroundColor: '#2a2a2a' },
  badgeText:     { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty:         { color: '#aaa', fontSize: 16 },
  emptySub:      { color: '#666', fontSize: 13, marginTop: 6 },
  error:         { color: '#e55', fontSize: 15 },
  retryBtn:      { marginTop: 12, backgroundColor: '#b8860b', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8 },
  retryText:     { color: '#fff', fontWeight: '700' },
});
