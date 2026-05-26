/**
 * Price Alerts tab — manage target prices and see triggered alerts.
 */
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import Constants from 'expo-constants';

const BASE_URL: string =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3000';

const CURRENCY_SYM: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', CAD: 'CA$' };

// ---------------------------------------------------------------------------
// Types (matching updated API shape from alerts.ts route)
// ---------------------------------------------------------------------------

interface BestPrice {
  priceLocal: number;
  currency: string;
  retailerName: string | null;
  isStale: boolean;
}

interface AlertProduct {
  id: string;
  name: string;
  distillery: string;
  ageYears: number | null;
  volumeMl: number;
  region: string | null;
  imageUrl: string | null;
  bestPrice: BestPrice | null;
}

interface PriceAlert {
  id: string;
  productId: string;
  targetPriceGbp: number;
  currency: string;
  active: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  product: AlertProduct;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchAlerts(): Promise<PriceAlert[]> {
  const res = await fetch(`${BASE_URL}/api/alerts`, { credentials: 'include' });
  if (res.status === 401) return [];
  const data = (await res.json()) as { alerts: PriceAlert[] };
  return data.alerts;
}

async function toggleAlert(id: string, active: boolean): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/alerts/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new Error('Failed to update alert');
}

async function deleteAlert(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/alerts/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete alert');
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function AlertRow({
  item,
  onToggle,
  onDelete,
}: {
  item: PriceAlert;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const p = item.product;
  const bp = p.bestPrice;
  const sym = bp ? (CURRENCY_SYM[bp.currency] ?? bp.currency + ' ') : '';
  const targetFormatted = `£${(item.targetPriceGbp / 100).toFixed(2)}`;
  const isTriggered = item.lastTriggeredAt !== null;

  const confirmDelete = () => {
    Alert.alert('Delete alert', `Delete price alert for ${p.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.card, !item.active && styles.cardInactive]}
      onPress={() => router.push(`/product/${p.id}`)}
      activeOpacity={0.75}
    >
      {/* Triggered badge */}
      {isTriggered && (
        <View style={styles.triggeredBadge}>
          <Text style={styles.triggeredText}>🔔 Triggered</Text>
        </View>
      )}

      <View style={styles.cardInner}>
        {/* Left: product info */}
        <View style={styles.body}>
          <Text style={styles.distillery} numberOfLines={1}>{p.distillery}</Text>
          <Text style={styles.name} numberOfLines={2}>{p.name}</Text>

          <View style={styles.metaRow}>
            {p.ageYears ? <Text style={styles.chip}>{p.ageYears}yo</Text> : null}
            {p.region   ? <Text style={styles.chip}>{p.region}</Text>   : null}
            <Text style={styles.chip}>{p.volumeMl}ml</Text>
          </View>

          {/* Price comparison */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Target</Text>
              <Text style={styles.targetPrice}>{targetFormatted}</Text>
            </View>
            {bp ? (
              <View style={{ marginLeft: 20 }}>
                <Text style={styles.priceLabel}>Current best</Text>
                <Text style={[styles.currentPrice, bp.isStale && styles.stale]}>
                  {sym}{bp.priceLocal.toFixed(0)}
                </Text>
              </View>
            ) : null}
          </View>

          {isTriggered && item.lastTriggeredAt ? (
            <Text style={styles.triggeredAt}>
              Last hit {new Date(item.lastTriggeredAt).toLocaleDateString()}
            </Text>
          ) : null}
        </View>

        {/* Right: toggle + delete */}
        <View style={styles.controls}>
          <Switch
            value={item.active}
            onValueChange={(v) => onToggle(item.id, v)}
            trackColor={{ false: '#1A1A1A', true: '#4A3010' }}
            thumbColor={item.active ? '#D4A853' : '#555'}
          />
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={confirmDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteBtnText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function AlertsScreen() {
  const qc = useQueryClient();

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
    staleTime: 60_000,
  });

  const { mutate: toggle } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleAlert(id, active),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const { mutate: remove } = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['alerts'] }),
    onError: () => Alert.alert('Error', 'Could not delete alert — please try again.'),
  });

  // Loading
  if (isFetching && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4A853" size="large" />
      </View>
    );
  }

  // Error
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>⚠️</Text>
        <Text style={styles.emptyTitle}>Couldn't load alerts</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => void refetch()}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty
  if (!data || data.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>No price alerts</Text>
          <Text style={styles.emptyBody}>
            Open any product and set a target price. We'll notify you when it drops below your target.
          </Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.ctaText}>Browse whiskies →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeCount   = data.filter((a) => a.active).length;
  const triggeredCount = data.filter((a) => a.lastTriggeredAt).length;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertRow
            item={item}
            onToggle={(id, active) => toggle({ id, active })}
            onDelete={remove}
          />
        )}
        contentContainerStyle={styles.list}
        onRefresh={() => void refetch()}
        refreshing={isFetching}
        ListHeaderComponent={
          <View style={styles.summary}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryValue}>{data.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryValue}>{activeCount}</Text>
              <Text style={styles.summaryLabel}>Active</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryValue, triggeredCount > 0 && styles.triggered]}>
                {triggeredCount}
              </Text>
              <Text style={styles.summaryLabel}>Triggered</Text>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#0A0A0A' },
  list:   { paddingHorizontal: 12, paddingBottom: 24 },

  center:     { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { color: '#F0EDE8', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptyBody:  { color: '#6B7280', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 24 },

  ctaBtn:   { backgroundColor: '#D4A853', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13 },
  ctaText:  { color: '#0A0A0A', fontWeight: '700', fontSize: 15 },

  retryBtn:  { marginTop: 16, backgroundColor: '#1A1A1A', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 11, borderWidth: 1, borderColor: '#242424' },
  retryText: { color: '#D4A853', fontWeight: '700', fontSize: 14 },

  // Summary strip
  summary:      { flexDirection: 'row', paddingVertical: 14, marginBottom: 4 },
  summaryCell:  { flex: 1, alignItems: 'center' },
  summaryValue: { color: '#F0EDE8', fontSize: 22, fontWeight: '800' },
  summaryLabel: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  triggered:    { color: '#D4A853' },

  // Card
  card: {
    backgroundColor: '#111111',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#242424',
    overflow: 'hidden',
  },
  cardInactive: { opacity: 0.55 },
  triggeredBadge: {
    backgroundColor: '#2A1800',
    paddingHorizontal: 12, paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: '#3D2200',
  },
  triggeredText: { color: '#D4A853', fontSize: 11, fontWeight: '700' },
  cardInner:   { flexDirection: 'row', padding: 12 },

  body:        { flex: 1 },
  distillery:  { color: '#D4A853', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  name:        { color: '#F0EDE8', fontWeight: '600', fontSize: 13, lineHeight: 18 },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  chip: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#242424',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
    color: '#6B7280', fontSize: 10,
  },
  priceRow:     { flexDirection: 'row', marginTop: 10, alignItems: 'flex-end' },
  priceLabel:   { color: '#555', fontSize: 10, marginBottom: 2 },
  targetPrice:  { color: '#D4A853', fontSize: 16, fontWeight: '800' },
  currentPrice: { color: '#F0EDE8', fontSize: 15, fontWeight: '600' },
  stale:        { color: '#6B7280' },
  triggeredAt:  { color: '#6B7280', fontSize: 10, marginTop: 6 },

  controls:    { alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12 },
  deleteBtn:   { marginTop: 8 },
  deleteBtnText: { fontSize: 18 },
});
