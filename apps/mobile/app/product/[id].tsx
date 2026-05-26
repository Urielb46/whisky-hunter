/**
 * Product detail screen.
 * Shows all retailer prices + true-cost breakdown per destination.
 */
import { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getProduct, getCostBreakdown, type ProductDetail, type CostBreakdown } from '../../lib/api';

const DESTINATIONS = [
  { code: 'GB', label: '🇬🇧 UK' },
  { code: 'US', label: '🇺🇸 USA' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'FR', label: '🇫🇷 France' },
  { code: 'CA', label: '🇨🇦 Canada' },
  { code: 'AU', label: '🇦🇺 Australia' },
  { code: 'JP', label: '🇯🇵 Japan' },
];

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedRetailerId, setSelectedRetailerId] = useState<string | null>(null);
  const [destination, setDestination] = useState('GB');

  const { data: product, isFetching, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id!),
    enabled: !!id,
  });

  // Find the full price entry for the selected retailer
  const selectedPrice = product?.prices.find((p) => p.retailerId === selectedRetailerId) ?? null;

  const { data: costData, isFetching: costFetching } = useQuery({
    queryKey: ['cost', selectedRetailerId, destination, product?.volumeMl, product?.abv],
    queryFn: () =>
      getCostBreakdown({
        priceLocal:         selectedPrice!.priceLocal,
        currency:           selectedPrice!.currency,
        retailerCountry:    selectedPrice!.country,
        destinationCountry: destination,
        volumeMl:           product!.volumeMl,
        abv:                product!.abv ?? 40,
      }),
    enabled: !!selectedPrice && !!product,
  });

  if (isFetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#b8860b" size="large" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.hero} resizeMode="contain" />
      ) : (
        <View style={styles.heroPlaceholder} />
      )}

      <View style={styles.header}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.distillery}>{product.distillery}</Text>
        <View style={styles.tags}>
          {product.ageYears ? <Chip label={`${product.ageYears} YO`} /> : null}
          {product.abv ? <Chip label={`${product.abv}% ABV`} /> : null}
          {product.volumeMl ? <Chip label={`${product.volumeMl}ml`} /> : null}
          {product.region ? <Chip label={product.region} /> : null}
        </View>
        {product.description ? (
          <Text style={styles.description} numberOfLines={4}>{product.description}</Text>
        ) : null}

        {/* Whiskybase community rating — WBASE-02 / WBASE-04 */}
        {product.wbScore != null && (
          <View style={styles.wbCard}>
            <View style={styles.wbScoreBadge}>
              <Text style={styles.wbScoreText}>{product.wbScore.toFixed(0)}</Text>
            </View>
            <View style={styles.wbInfo}>
              <Text style={styles.wbLabel}>Community Rating</Text>
              <Text style={styles.wbVotes}>{product.wbVoteCount.toLocaleString()} ratings</Text>
            </View>
            {product.whiskybaseUrl ? (
              <TouchableOpacity
                style={styles.wbLink}
                onPress={() => Linking.openURL(product.whiskybaseUrl!)}
              >
                <Text style={styles.wbLinkText}>View →</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        {product.wbScore != null && (
          <Text style={styles.wbAttribution}>Ratings powered by Whiskybase</Text>
        )}
      </View>

      {/* Destination selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shipping to</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DESTINATIONS.map((d) => (
            <TouchableOpacity
              key={d.code}
              style={[styles.destChip, destination === d.code && styles.destChipActive]}
              onPress={() => setDestination(d.code)}
            >
              <Text style={[styles.destChipText, destination === d.code && styles.destChipTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Retailer prices */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prices</Text>
        {product.prices.length === 0 ? (
          <Text style={styles.noPrices}>No prices available yet.</Text>
        ) : (
          product.prices.map((p) => (
            <TouchableOpacity
              key={p.retailerId}
              style={[
                styles.priceRow,
                selectedRetailerId === p.retailerId && styles.priceRowSelected,
                !p.inStock && styles.priceRowOOS,
              ]}
              onPress={() => setSelectedRetailerId(p.retailerId)}
            >
              <View style={styles.priceRowLeft}>
                <Text style={styles.retailerName}>{p.retailerName}</Text>
                <Text style={styles.retailerCountry}>{p.country} · {p.currency}</Text>
              </View>
              <View style={styles.priceRowRight}>
                <Text style={[styles.priceValue, !p.inStock && styles.oos]}>
                  {p.inStock ? `${p.currency} ${p.priceLocal.toFixed(2)}` : 'Out of stock'}
                </Text>
                {selectedRetailerId === p.retailerId && (
                  <Text style={styles.selectHint}>tap for breakdown ↓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Cost breakdown */}
      {selectedRetailerId && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>True cost to {destination}</Text>
          {costFetching ? (
            <ActivityIndicator color="#b8860b" />
          ) : costData ? (
            <CostTable breakdown={costData} />
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.text}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  text: { color: '#aaa', fontSize: 11, fontWeight: '600' },
});

function CostTable({ breakdown }: { breakdown: CostBreakdown }) {
  const rows: Array<[string, number]> = [
    ['Shelf price', breakdown.shelfPrice],
    ['Shipping', breakdown.shipping],
    ['Import duty', breakdown.importDuty],
    ['Excise duty', breakdown.exciseDuty],
    ['VAT', breakdown.vat],
  ];

  return (
    <View style={tableStyles.container}>
      {rows.map(([label, value]) => (
        <View key={label} style={tableStyles.row}>
          <Text style={tableStyles.label}>{label}</Text>
          <Text style={tableStyles.value}>
            {breakdown.currency} {value.toFixed(2)}
          </Text>
        </View>
      ))}
      <View style={[tableStyles.row, tableStyles.total]}>
        <Text style={tableStyles.totalLabel}>Total</Text>
        <Text style={tableStyles.totalValue}>
          {breakdown.currency} {breakdown.total.toFixed(2)}
        </Text>
      </View>
      {!breakdown.dutyDataAvailable && (
        <Text style={tableStyles.note}>
          * Duty rates for this destination are estimated.
        </Text>
      )}
    </View>
  );
}

const tableStyles = StyleSheet.create({
  container:  { backgroundColor: '#1a1a2e', borderRadius: 10, overflow: 'hidden' },
  row:        { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a3e' },
  label:      { color: '#aaa', fontSize: 14 },
  value:      { color: '#fff', fontSize: 14 },
  total:      { backgroundColor: '#2a2a1e', borderBottomWidth: 0 },
  totalLabel: { color: '#b8860b', fontSize: 16, fontWeight: '700' },
  totalValue: { color: '#b8860b', fontSize: 16, fontWeight: '700' },
  note:       { color: '#666', fontSize: 11, padding: 8 },
});

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0d0d1a' },
  content:         { paddingBottom: 40 },
  center:          { flex: 1, backgroundColor: '#0d0d1a', alignItems: 'center', justifyContent: 'center' },
  errorText:       { color: '#e55', fontSize: 16 },
  hero:            { width: '100%', height: 220, backgroundColor: '#1a1a2e' },
  heroPlaceholder: { width: '100%', height: 220, backgroundColor: '#1a1a2e' },
  header:          { padding: 16 },
  name:            { color: '#fff', fontSize: 20, fontWeight: '700' },
  distillery:      { color: '#b8860b', fontSize: 14, marginTop: 2 },
  tags:            { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  description:     { color: '#aaa', fontSize: 13, marginTop: 10, lineHeight: 19 },
  section:         { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle:    { color: '#b8860b', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  destChip:        { backgroundColor: '#1a1a2e', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  destChipActive:  { backgroundColor: '#b8860b' },
  destChipText:    { color: '#aaa', fontSize: 13 },
  destChipTextActive: { color: '#fff', fontWeight: '700' },
  priceRow:        { flexDirection: 'row', backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, marginBottom: 8 },
  priceRowSelected:{ borderWidth: 1, borderColor: '#b8860b' },
  priceRowOOS:     { opacity: 0.45 },
  priceRowLeft:    { flex: 1 },
  priceRowRight:   { alignItems: 'flex-end' },
  retailerName:    { color: '#fff', fontSize: 14, fontWeight: '600' },
  retailerCountry: { color: '#666', fontSize: 11, marginTop: 2 },
  priceValue:      { color: '#b8860b', fontSize: 15, fontWeight: '700' },
  oos:             { color: '#666' },
  selectHint:      { color: '#666', fontSize: 10, marginTop: 2 },
  noPrices:        { color: '#666', fontSize: 14 },
  // Whiskybase rating card — WBASE-04
  wbCard:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: 'rgba(184,134,11,0.25)' },
  wbScoreBadge:    { width: 44, height: 44, borderRadius: 8, backgroundColor: 'rgba(184,134,11,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: 'rgba(184,134,11,0.35)' },
  wbScoreText:     { color: '#b8860b', fontSize: 16, fontWeight: '700' },
  wbInfo:          { flex: 1 },
  wbLabel:         { color: '#fff', fontSize: 13, fontWeight: '600' },
  wbVotes:         { color: '#666', fontSize: 11, marginTop: 1 },
  wbLink:          { backgroundColor: 'rgba(184,134,11,0.12)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(184,134,11,0.35)' },
  wbLinkText:      { color: '#b8860b', fontSize: 12, fontWeight: '600' },
  wbAttribution:   { color: '#444', fontSize: 10, marginTop: 4 },
});
