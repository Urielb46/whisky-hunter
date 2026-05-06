/**
 * Search tab — main entry point.
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
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { searchWhisky, type SearchResult } from '../../lib/api';

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

  const renderItem = useCallback(({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/product/${item.id}`)}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.cardSub}>{item.distillery}</Text>
        {item.bestPriceGbp !== null && (
          <Text style={styles.cardPrice}>
            From £{(item.bestPriceGbp / 100).toFixed(2)}
          </Text>
        )}
        <Text style={styles.cardMeta}>
          {item.retailerCount} retailer{item.retailerCount !== 1 ? 's' : ''}
          {item.ageYears ? ` · ${item.ageYears}yo` : ''}
          {item.volumeMl ? ` · ${item.volumeMl}ml` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  ), []);

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search whisky..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSubmit}>
          <Text style={styles.searchBtnText}>Go</Text>
        </TouchableOpacity>
      </View>

      {isFetching && <ActivityIndicator color="#b8860b" style={{ marginTop: 24 }} />}

      {error ? (
        <Text style={styles.error}>
          {error instanceof Error ? error.message : 'Search failed'}
        </Text>
      ) : null}

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          submitted && !isFetching ? (
            <Text style={styles.empty}>No results for "{submitted}"</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0d0d1a' },
  searchRow:     { flexDirection: 'row', padding: 12, gap: 8 },
  input:         {
    flex: 1,
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchBtn:     {
    backgroundColor: '#b8860b',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list:          { paddingHorizontal: 12, paddingBottom: 20 },
  card:          {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  thumb:         { width: 70, height: 90 },
  thumbPlaceholder: { backgroundColor: '#2a2a3e' },
  cardBody:      { flex: 1, padding: 10, justifyContent: 'center' },
  cardName:      { color: '#fff', fontWeight: '600', fontSize: 14 },
  cardSub:       { color: '#aaa', fontSize: 12, marginTop: 2 },
  cardPrice:     { color: '#b8860b', fontWeight: '700', fontSize: 15, marginTop: 4 },
  cardMeta:      { color: '#666', fontSize: 11, marginTop: 2 },
  error:         { color: '#e55', textAlign: 'center', marginTop: 16, paddingHorizontal: 16 },
  empty:         { color: '#666', textAlign: 'center', marginTop: 32, fontSize: 15 },
});
