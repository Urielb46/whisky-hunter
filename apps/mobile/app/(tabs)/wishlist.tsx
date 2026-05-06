/**
 * Wishlist tab.
 */
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

interface WishlistItem {
  id: string;
  productId: string;
  productName: string | null;
  distillery: string | null;
  imageUrl: string | null;
  createdAt: string;
}

// Placeholder — replace with real auth token once Better Auth mobile client is wired
async function fetchWishlist(): Promise<WishlistItem[]> {
  const res = await fetch('http://localhost:3000/api/wishlist', {
    credentials: 'include',
  });
  if (res.status === 401) return [];
  const data = await res.json() as { items: WishlistItem[] };
  return data.items;
}

export default function WishlistScreen() {
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['wishlist'],
    queryFn: fetchWishlist,
    staleTime: 1000 * 60,
  });

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
        <Text style={styles.error}>Failed to load wishlist</Text>
        <TouchableOpacity onPress={() => void refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Your wishlist is empty.</Text>
        <Text style={styles.emptySub}>Search for a whisky and add it here.</Text>
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
          style={styles.row}
          onPress={() => router.push(`/product/${item.productId}`)}
        >
          <View style={styles.rowBody}>
            <Text style={styles.rowName} numberOfLines={2}>
              {item.productName ?? item.productId}
            </Text>
            {item.distillery ? (
              <Text style={styles.rowSub}>{item.distillery}</Text>
            ) : null}
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  list:      { padding: 12 },
  center:    { flex: 1, backgroundColor: '#0d0d1a', alignItems: 'center', justifyContent: 'center' },
  row:       {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  rowBody:   { flex: 1 },
  rowName:   { color: '#fff', fontSize: 14, fontWeight: '600' },
  rowSub:    { color: '#aaa', fontSize: 12, marginTop: 2 },
  chevron:   { color: '#b8860b', fontSize: 22, marginLeft: 8 },
  empty:     { color: '#aaa', fontSize: 16 },
  emptySub:  { color: '#666', fontSize: 13, marginTop: 6 },
  error:     { color: '#e55', fontSize: 15 },
  retryBtn:  { marginTop: 12, backgroundColor: '#b8860b', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8 },
  retryText: { color: '#fff', fontWeight: '700' },
});
