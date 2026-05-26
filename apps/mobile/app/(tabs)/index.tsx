/**
 * Home tab — discovery, featured whiskies, regional browsing.
 */
import { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { searchWhisky, type SearchResult } from '../../lib/api';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const QUICK_SEARCHES = ['Macallan', 'Lagavulin', 'Glenfiddich', 'Hibiki', 'Buffalo Trace'];

const REGIONS = [
  { name: 'Speyside',    emoji: '🏔️',  q: 'speyside'    },
  { name: 'Islay',       emoji: '🌊',  q: 'islay'       },
  { name: 'Highlands',   emoji: '🦌',  q: 'highlands'   },
  { name: 'Lowlands',    emoji: '🌾',  q: 'lowlands'    },
  { name: 'Campbeltown', emoji: '⚓',  q: 'campbeltown' },
  { name: 'Japan',       emoji: '🗾',  q: 'japanese'    },
  { name: 'Kentucky',    emoji: '🌽',  q: 'bourbon'     },
  { name: 'Ireland',     emoji: '☘️',  q: 'irish'       },
];

const CURRENCY_SYM: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', CAD: 'CA$' };

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProductCard({ item }: { item: SearchResult }) {
  const bp = item.bestPrice;
  const sym = bp ? (CURRENCY_SYM[bp.currency] ?? bp.currency + ' ') : '';
  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/product/${item.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.productThumb}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        ) : (
          <Text style={styles.productEmoji}>🥃</Text>
        )}
      </View>
      <Text style={styles.productDistillery} numberOfLines={1}>{item.distillery}</Text>
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      {bp ? (
        <Text style={styles.productPrice}>{sym}{bp.priceLocal.toFixed(0)}</Text>
      ) : (
        <Text style={styles.productNoPrice}>—</Text>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Home screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const { data: featured } = useQuery({
    queryKey: ['home-featured'],
    queryFn: () => searchWhisky('macallan'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: trending } = useQuery({
    queryKey: ['home-trending'],
    queryFn: () => searchWhisky('lagavulin'),
    staleTime: 5 * 60 * 1000,
  });

  const goSearch = useCallback((q: string) => {
    router.push({ pathname: '/(tabs)/search', params: { q } });
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.heroBadge}>🥃 WHISKY HUNTER</Text>
          <Text style={styles.heroTitle}>Find the world's best whisky at the best price</Text>
          <Text style={styles.heroSub}>True all-in cost — shelf price, duties, shipping &amp; FX included</Text>

          {/* Inline search bar */}
          <TouchableOpacity
            style={styles.heroSearch}
            onPress={() => router.push('/(tabs)/search')}
            activeOpacity={0.85}
          >
            <Text style={styles.heroSearchIcon}>🔍</Text>
            <Text style={styles.heroSearchPlaceholder}>Distillery, expression, region...</Text>
          </TouchableOpacity>

          {/* Quick search pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
            {QUICK_SEARCHES.map((q) => (
              <TouchableOpacity key={q} style={styles.pill} onPress={() => goSearch(q)}>
                <Text style={styles.pillText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Stats strip ── */}
        <View style={styles.statsRow}>
          {[
            { value: '200k+', label: 'Bottles' },
            { value: '10+',   label: 'Retailers' },
            { value: '40+',   label: 'Countries' },
          ].map((s) => (
            <View key={s.label} style={styles.statCell}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Featured ── */}
        {(featured?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⭐ Featured</Text>
              <TouchableOpacity onPress={() => goSearch('macallan')}>
                <Text style={styles.sectionLink}>See all →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={featured?.slice(0, 8)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ProductCard item={item} />}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            />
          </View>
        )}

        {/* ── Trending ── */}
        {(trending?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔥 Trending</Text>
              <TouchableOpacity onPress={() => goSearch('lagavulin')}>
                <Text style={styles.sectionLink}>See all →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={trending?.slice(0, 8)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ProductCard item={item} />}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            />
          </View>
        )}

        {/* ── Browse by Region ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Region</Text>
          <View style={styles.regionsGrid}>
            {REGIONS.map((r) => (
              <TouchableOpacity
                key={r.name}
                style={styles.regionCard}
                onPress={() => goSearch(r.q)}
                activeOpacity={0.75}
              >
                <Text style={styles.regionEmoji}>{r.emoji}</Text>
                <Text style={styles.regionName}>{r.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── How it works ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How it works</Text>
          {[
            { icon: '🔍', step: '1. Search', desc: 'Find any expression, distillery or region' },
            { icon: '📦', step: '2. Compare', desc: 'See the true all-in cost from every retailer' },
            { icon: '🔔', step: '3. Alert', desc: 'Set a price target and get notified when it drops' },
          ].map((s) => (
            <View key={s.step} style={styles.howCard}>
              <Text style={styles.howIcon}>{s.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.howStep}>{s.step}</Text>
                <Text style={styles.howDesc}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── CTA ── */}
        <View style={styles.ctaBlock}>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push('/(tabs)/search')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>Start searching →</Text>
          </TouchableOpacity>
          <Text style={styles.ctaSub}>Free forever · No credit card required</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#0A0A0A' },
  scroll:     { flex: 1 },

  // Hero
  hero:              { backgroundColor: '#111', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
  heroBadge:         { color: '#D4A853', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  heroTitle:         { color: '#F0EDE8', fontSize: 26, fontWeight: '800', lineHeight: 32, marginBottom: 8 },
  heroSub:           { color: '#6B7280', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  heroSearch: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A1A', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: '#242424', marginBottom: 14,
  },
  heroSearchIcon:        { fontSize: 14, marginRight: 8 },
  heroSearchPlaceholder: { color: '#555', fontSize: 15, flex: 1 },
  pillsRow:   { flexDirection: 'row', marginHorizontal: -4 },
  pill: {
    backgroundColor: '#1A1A1A', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    marginHorizontal: 4, borderWidth: 1, borderColor: '#2A2A2A',
  },
  pillText:   { color: '#D4A853', fontSize: 13, fontWeight: '600' },

  // Stats
  statsRow:   { flexDirection: 'row', backgroundColor: '#0D0D0D', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1C1C1C' },
  statCell:   { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue:  { color: '#D4A853', fontSize: 22, fontWeight: '800' },
  statLabel:  { color: '#6B7280', fontSize: 11, marginTop: 2 },

  // Section
  section:       { paddingTop: 28, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { color: '#F0EDE8', fontSize: 17, fontWeight: '700' },
  sectionLink:   { color: '#D4A853', fontSize: 13 },
  hList:         { paddingRight: 16 },

  // Product card (horizontal)
  productCard: {
    width: 140, marginRight: 12,
    backgroundColor: '#111111', borderRadius: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: '#242424',
    paddingBottom: 10,
  },
  productThumb: {
    width: 140, height: 120,
    backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  productEmoji:      { fontSize: 40 },
  productDistillery: { color: '#D4A853', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 10, marginTop: 8 },
  productName:       { color: '#F0EDE8', fontSize: 12, fontWeight: '600', lineHeight: 16, paddingHorizontal: 10, marginTop: 2 },
  productPrice:      { color: '#D4A853', fontSize: 15, fontWeight: '800', paddingHorizontal: 10, marginTop: 6 },
  productNoPrice:    { color: '#555', fontSize: 14, paddingHorizontal: 10, marginTop: 6 },

  // Regions grid
  regionsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  regionCard: {
    width: '47%', backgroundColor: '#111', borderRadius: 12,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#242424',
  },
  regionEmoji: { fontSize: 30, marginBottom: 8 },
  regionName:  { color: '#F0EDE8', fontSize: 13, fontWeight: '600' },

  // How it works
  howCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#111', borderRadius: 12,
    padding: 16, marginTop: 10,
    borderWidth: 1, borderColor: '#242424',
  },
  howIcon: { fontSize: 24, marginRight: 14, marginTop: 2 },
  howStep: { color: '#F0EDE8', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  howDesc: { color: '#6B7280', fontSize: 13, lineHeight: 19 },

  // CTA
  ctaBlock:   { alignItems: 'center', paddingTop: 36, paddingHorizontal: 24 },
  ctaBtn: {
    backgroundColor: '#D4A853', borderRadius: 14,
    paddingVertical: 15, paddingHorizontal: 48,
  },
  ctaBtnText: { color: '#0A0A0A', fontSize: 16, fontWeight: '800' },
  ctaSub:     { color: '#6B7280', fontSize: 12, marginTop: 10 },
});
