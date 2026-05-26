/**
 * Wishlist tab — saved products with live best prices.
 */
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
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
// Types (matching updated API shape from wishlist.ts route)
// ---------------------------------------------------------------------------

interface BestPrice {
  priceLocal: number;
  currency: string;
  retailerId: string | null;
  retailerName: string | null;
  retailerCountry: string | null;
  inStock: boolean | null;
  scrapedAt: string | null;
  isStale: boolean;
}

interface WishlistProduct {
  id: string;
  name: string;
  distillery: string;
  ageYears: number | null;
  volumeMl: number;
  category: string;
  region: string | null;
  caskType: string | null;
  abv: number | null;
  imageUrl: string | null;
  reviewScore: number | null;
  bestPrice: BestPrice | null;
}

interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: WishlistProduct;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchWishlist(): Promise<WishlistItem[]> {
  const res = await fetch(`${BASE_URL}/api/wishlist`, { credentials: 'include' });
  if (res.status === 401) return [];
  const data = await res.json() as { items: WishlistItem[] };
  return data.items;
}

async function removeFromWishlist(wishlistId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/wishlist/${wishlistId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to remove');
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function WishlistRow({ item, onRemove }: { item: WishlistItem; onRemove: (id: string) => void }) {
  const p = item.product;
  const bp = p.bestPrice;
  const sym = bp ? (CURRENCY_SYM[bp.currency] ?? bp.currency + ' ') : '';

  const confirmRemove = () => {
    Alert.alert('Remove from wishlist', `Remove ${p.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onRemove(item.id) },
    ]);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/product/${p.id}`)}
      activeOpacity={0.75}
    >
      {/* Thumbnail */}
      <View style={styles.thumb}>
        {p.imageUrl ? (
          <Image source={{ uri: p.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        ) : (
          <Text style={styles.thumbEmoji}>🥃</Text>
        )}
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.distillery} numberOfLines={1}>{p.distillery}</Text>
        <Text style={styles.name} numberOfLines={2}>{p.name}</Text>
        <View style={styles.metaRow}>
          {p.ageYears ? <Text style={styles.chip}>{p.ageYears}yo</Text> : null}
          {p.region   ? <Text style={styles.chip}>{p.region}</Text>   : null}
          <Text style={styles.chip}>{p.volumeMl}ml</Text>
        </View>
        {bp?.isStale ? <Text style={styles.stale}>Price may be outdated</Text> : null}
      </View>

      {/* Right: price + remove */}
      <View style={styles.cardRight}>
        {bp ? (
          <>
            <Text style={styles.price}>{sym}{bp.priceLocal.toFixed(0)}</Text>
            <Text style={styles.retailer} numberOfLines={1}>{bp.retailerName}</Text>
          </>
        ) : (
          <Text style={styles.noPrice}>N/A</Text>
        )}
        <TouchableOpacity style={styles.removeBtn} onPress={confirmRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function WishlistScreen() {
  const qc = useQueryClient();

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['wishlist'],
    queryFn: fetchWishlist,
    staleTime: 60_000,
  });

  const { mutate: remove } = useMutation({
    mutationFn: removeFromWishlist,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['wishlist'] }),
    onError: () => Alert.alert('Error', 'Could not remove item — please try again.'),
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
        <Text style={styles.emptyTitle}>Couldn't load wishlist</Text>
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
          <Text style={styles.emptyEmoji}>❤️</Text>
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptyBody}>Save whiskies while browsing and track their prices here.</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.ctaText}>Browse whiskies →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WishlistRow item={item} onRemove={remove} />}
        contentContainerStyle={styles.list}
        onRefresh={() => void refetch()}
        refreshing={isFetching}
        ListHeaderComponent={
          <Text style={styles.count}>{data.length} saved bottle{data.length !== 1 ? 's' : ''}</Text>
        }
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#0A0A0A' },
  list:       { paddingHorizontal: 12, paddingBottom: 24, paddingTop: 4 },
  count:      { color: '#6B7280', fontSize: 12, paddingVertical: 8 },

  center:     { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { color: '#F0EDE8', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptyBody:  { color: '#6B7280', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 24 },

  ctaBtn:     { backgroundColor: '#D4A853', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13 },
  ctaText:    { color: '#0A0A0A', fontWeight: '700', fontSize: 15 },

  retryBtn:   { marginTop: 16, backgroundColor: '#1A1A1A', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 11, borderWidth: 1, borderColor: '#242424' },
  retryText:  { color: '#D4A853', fontWeight: '700', fontSize: 14 },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242424',
  },
  thumb: {
    width: 72, height: 88,
    backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbEmoji:  { fontSize: 28 },
  cardBody:    { flex: 1, padding: 10, justifyContent: 'center' },
  distillery:  { color: '#D4A853', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  name:        { color: '#F0EDE8', fontWeight: '600', fontSize: 13, lineHeight: 18 },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  chip: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#242424',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
    color: '#6B7280', fontSize: 10,
  },
  stale:       { color: '#EF4444', fontSize: 9, marginTop: 4 },
  cardRight:   { paddingHorizontal: 10, paddingVertical: 10, alignItems: 'flex-end', justifyContent: 'space-between', minWidth: 70 },
  price:       { color: '#D4A853', fontWeight: '700', fontSize: 16 },
  retailer:    { color: '#6B7280', fontSize: 10, maxWidth: 70 },
  noPrice:     { color: '#555', fontSize: 12 },
  removeBtn:   { marginTop: 6 },
  removeBtnText: { color: '#555', fontSize: 14 },
});
