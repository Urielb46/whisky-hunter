/**
 * Search tab — full search results view.
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { searchWhisky, type SearchResult } from '../../lib/api';

const CURRENCY_SYM: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', CAD: 'CA$' };

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data, isFetching, error } = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => searchWhisky(submitted),
    enabled: submitted.length > 1,
  });

  const handleSubmit = useCallback(() => {
    setSubmitted(query.trim());
  }, [query]);

  const renderItem = useCallback(({ item }: { item: SearchResult }) => {
    const bp = item.bestPrice;
    const sym = bp ? (CURRENCY_SYM[bp.currency] ?? bp.currency + ' ') : '';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/product/${item.id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.thumb}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
          ) : (
            <Text style={styles.thumbEmoji}>🥃</Text>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardDistillery} numberOfLines={1}>{item.distillery}</Text>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.cardMeta}>
            {item.ageYears ? <Text style={styles.metaChip}>{item.ageYears}yo</Text> : null}
            {item.region   ? <Text style={styles.metaChip}>{item.region}</Text>   : null}
            <Text style={styles.metaChip}>{item.volumeMl}ml</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          {bp ? (
            <>
              <Text style={styles.price}>{sym}{bp.priceLocal.toFixed(0)}</Text>
              <Text style={styles.retailer} numberOfLines={1}>{bp.retailerName}</Text>
            </>
          ) : (
            <Text style={styles.noPrice}>N/A</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Distillery, expression, region..."
            placeholderTextColor="#555"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSubmitted(''); }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSubmit}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {isFetching && (
        <ActivityIndicator color="#D4A853" style={{ marginTop: 24 }} />
      )}

      {error ? (
        <Text style={styles.error}>
          {error instanceof Error ? error.message : 'Search failed. Is the API running?'}
        </Text>
      ) : null}

      {!isFetching && submitted.length > 1 && data !== undefined && (
        <Text style={styles.resultCount}>
          {data.length} result{data.length !== 1 ? 's' : ''} for "{submitted}"
        </Text>
      )}

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          submitted.length > 1 && !isFetching ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🥃</Text>
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptyBody}>Try a different spelling or search term.</Text>
            </View>
          ) : !submitted ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>Search any whisky</Text>
              <Text style={styles.emptyBody}>Find expressions, distilleries, or regions.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#0A0A0A' },
  searchRow:   { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#111' },
  inputWrap:   {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A1A', borderRadius: 10,
    paddingHorizontal: 10, borderWidth: 1, borderColor: '#242424',
  },
  searchIcon:  { fontSize: 14, marginRight: 6 },
  input:       { flex: 1, color: '#F0EDE8', fontSize: 15, paddingVertical: 10 },
  clearBtn:    { color: '#555', paddingHorizontal: 6, fontSize: 13 },
  searchBtn:   {
    backgroundColor: '#D4A853', borderRadius: 10,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  searchBtnText: { color: '#0A0A0A', fontWeight: '700', fontSize: 14 },
  resultCount: { color: '#6B7280', fontSize: 12, paddingHorizontal: 14, paddingVertical: 6 },
  list:        { paddingHorizontal: 12, paddingBottom: 24, paddingTop: 4 },
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
  cardDistillery: { color: '#D4A853', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  cardName:    { color: '#F0EDE8', fontWeight: '600', fontSize: 13, lineHeight: 18 },
  cardMeta:    { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  metaChip: {
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#242424',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
    color: '#6B7280', fontSize: 10,
  },
  cardRight:   { paddingHorizontal: 10, paddingVertical: 10, alignItems: 'flex-end', justifyContent: 'center', minWidth: 70 },
  price:       { color: '#D4A853', fontWeight: '700', fontSize: 16 },
  retailer:    { color: '#6B7280', fontSize: 10, marginTop: 2, maxWidth: 70 },
  noPrice:     { color: '#555', fontSize: 12 },
  error:       { color: '#EF4444', textAlign: 'center', marginTop: 16, paddingHorizontal: 16, fontSize: 13 },
  emptyState:  { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyEmoji:  { fontSize: 48, marginBottom: 12 },
  emptyTitle:  { color: '#F0EDE8', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyBody:   { color: '#6B7280', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
