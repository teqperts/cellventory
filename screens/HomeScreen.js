import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { borderRadius, colors, shadows } from '../constants/theme';
import { getInventoryStats, searchItems } from '../database/Helper';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, recent: 0 });

  const fetchStats = async () => {
    try {
      const data = await getInventoryStats();
      setStats(data);
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      setQuery('');
      setResults([]);
    }, [])
  );

  const debouncedSearch = useMemo(() => {
    return debounce(async (text) => {
      if (!text.trim()) {
        setResults([]);
        return;
      }

      try {
        const found = await searchItems(text);
        setResults(found);
      } catch (err) {
        console.error('Search error:', err);
        Alert.alert('❌ Search failed');
      }
    }, 300);
  }, []);

  const handleInputChange = (text) => {
    setQuery(text);
    debouncedSearch(text);
  };

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const renderItem = ({ item }) => {
    const isOutOfStock = item.quantity === 0;
    const isLowStock = item.quantity > 0 && item.quantity < 10;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ItemDetailsScreen', { item })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {isOutOfStock ? (
            <Text style={[styles.badge, styles.badgeOut]}>Out of Stock</Text>
          ) : isLowStock ? (
            <Text style={[styles.badge, styles.badgeLow]}>Low: {item.quantity} left</Text>
          ) : (
            <Text style={[styles.badge, styles.badgeNormal]}>Qty: {item.quantity}</Text>
          )}
        </View>

        <View style={styles.metaRow}>
          {item.category ? (
            <Text style={styles.categoryPill}>{item.category}</Text>
          ) : null}
          <Text style={styles.metaText}>
            {item.brand || 'No brand'} • {item.model || 'No model'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Persistent Search and Stats Section (Never unmounts on keystrokes) */}
      <View style={styles.topContainer}>
        {/* Modern Search Bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Quick search by name, brand, or model..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleInputChange}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => handleInputChange('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {query.trim().length > 0 && (
          <Text style={styles.resultCount}>
            {results.length > 0
              ? `${results.length} item${results.length > 1 ? 's' : ''} found`
              : 'No matching items in inventory'}
          </Text>
        )}

        {/* Quick Stat Cards */}
        <View style={styles.statsRow}>
          <StatBox
            label="Total Items"
            value={stats.total}
            icon="package"
            onPress={() => navigation.navigate('Inventory', { filter: 'All' })}
          />
          <StatBox
            label="Low Stock"
            value={stats.lowStock}
            icon="alert-triangle"
            highlight={stats.lowStock > 0}
            onPress={() => navigation.navigate('Inventory', { filter: 'Low Stock' })}
          />
          <StatBox
            label="New (7d)"
            value={stats.recent}
            icon="clock"
            onPress={() => navigation.navigate('Inventory', { filter: 'Recent' })}
          />
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          query.trim().length === 0 ? (
            <View style={styles.emptyGuideCard}>
              <Feather name="layers" size={32} color={colors.primaryLight} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyGuideTitle}>Quick Actions</Text>
              <Text style={styles.emptyGuideText}>
                Tap any stat card above to filter your stock, or switch tabs for inventory and customer management.
              </Text>
              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={styles.quickActionBtnPrimary}
                  onPress={() => navigation.navigate('Customers')}
                  activeOpacity={0.8}
                >
                  <Feather name="users" size={15} color={colors.textInverse} style={{ marginRight: 6 }} />
                  <Text style={styles.quickActionTextPrimary}>Customers</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionBtnSecondary}
                  onPress={() => navigation.navigate('Add Item')}
                  activeOpacity={0.8}
                >
                  <Feather name="plus-circle" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.quickActionTextSecondary}>+ Add Item</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function StatBox({ label, value, icon, onPress, highlight }) {
  return (
    <TouchableOpacity
      style={[styles.statBox, highlight && styles.statBoxHighlight]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.statIconWrap}>
        <Feather
          name={icon}
          size={16}
          color={highlight ? colors.lowStock : colors.primary}
        />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statActionHint}>View →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    ...shadows.card,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  resultCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statBox: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: borderRadius.md,
    width: '31%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  statBoxHighlight: {
    backgroundColor: colors.lowStockBg,
    borderColor: '#FDE68A',
  },
  statIconWrap: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  statActionHint: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '700',
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: borderRadius.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  badgeNormal: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.primary,
  },
  badgeLow: {
    backgroundColor: colors.lowStockBg,
    color: colors.lowStock,
  },
  badgeOut: {
    backgroundColor: colors.outOfStockBg,
    color: colors.outOfStock,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryPill: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyGuideCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
    ...shadows.card,
  },
  emptyGuideTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  emptyGuideText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  quickActionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    ...shadows.button,
  },
  quickActionTextPrimary: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 13,
  },
  quickActionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
  },
  quickActionTextSecondary: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
