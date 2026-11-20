import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { borderRadius, colors, shadows } from '../constants/theme';
import { adjustItemQuantity, getAllItems } from '../database/Helper';

const FILTER_OPTIONS = [
  'All',
  'Low Stock',
  'Out of Stock',
  'Mobile',
  'Accessory',
  'Spare Part',
  'Service',
];

export default function InventoryScreen({ route }) {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(route?.params?.filter || 'All');
  const navigation = useNavigation();

  // Sync route param filter if navigated with one
  useEffect(() => {
    if (route?.params?.filter) {
      setActiveFilter(route.params.filter);
    }
  }, [route?.params?.filter]);

  const loadItems = async () => {
    try {
      const result = await getAllItems();
      setItems(result || []);
    } catch (err) {
      console.error('Failed to load inventory items:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const handleQuickAdjust = async (id, delta) => {
    // Optimistic UI update
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      )
    );

    try {
      await adjustItemQuantity(id, delta);
    } catch (err) {
      console.error('Quick adjust error:', err);
      Alert.alert('❌ Error', 'Failed to update item quantity');
      loadItems(); // Rollback on failure
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Filter logic
      if (activeFilter === 'Low Stock' && item.quantity >= 10) return false;
      if (activeFilter === 'Out of Stock' && item.quantity > 0) return false;
      if (activeFilter === 'Recent') {
        if (!item.added_on) return false;
        const itemDate = new Date(item.added_on);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (itemDate < sevenDaysAgo) return false;
      }
      if (
        !['All', 'Low Stock', 'Out of Stock', 'Recent'].includes(activeFilter) &&
        item.category !== activeFilter
      ) {
        return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (item.name || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        const model = (item.model || '').toLowerCase();
        if (!name.includes(q) && !brand.includes(q) && !model.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeFilter, searchQuery]);

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
          <View style={styles.titleArea}>
            <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
            <View style={styles.badgeRow}>
              {isOutOfStock ? (
                <Text style={[styles.badge, styles.badgeOut]}>Out of Stock</Text>
              ) : isLowStock ? (
                <Text style={[styles.badge, styles.badgeLow]}>Low: {item.quantity} left</Text>
              ) : (
                <Text style={[styles.badge, styles.badgeIn]}>In Stock</Text>
              )}
              {item.category ? (
                <Text style={[styles.badge, styles.badgeCat]}>{item.category}</Text>
              ) : null}
            </View>
          </View>

          {/* 1-Tap Quick Stock Stepper */}
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={[styles.stepBtn, isOutOfStock && styles.stepBtnDisabled]}
              onPress={() => handleQuickAdjust(item.id, -1)}
              disabled={isOutOfStock}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.stepBtnText, isOutOfStock && styles.stepBtnTextDisabled]}>−</Text>
            </TouchableOpacity>

            <View style={styles.qtyBox}>
              <Text style={styles.qtyNumber}>{item.quantity}</Text>
              <Text style={styles.qtyLabel}>qty</Text>
            </View>

            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => handleQuickAdjust(item.id, 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.metaText}>
            Brand: <Text style={styles.metaValue}>{item.brand || '—'}</Text>
          </Text>
          <Text style={styles.metaText}>
            Model: <Text style={styles.metaValue}>{item.model || '—'}</Text>
          </Text>
        </View>

        {item.part_type ? (
          <View style={styles.detailsRow}>
            <Text style={styles.metaText}>
              Part: <Text style={styles.metaValue}>{item.part_type}</Text>
            </Text>
          </View>
        ) : null}

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>
            Cost: <Text style={styles.priceValue}>₹{item.cost_price != null ? item.cost_price : '—'}</Text>
          </Text>
          <Text style={styles.priceText}>
            Sell: <Text style={styles.sellingValue}>₹{item.selling_price != null ? item.selling_price : '—'}</Text>
          </Text>
        </View>

        {item.notes ? <Text style={styles.notes} numberOfLines={2}>📝 {item.notes}</Text> : null}

        <Text style={styles.tapHint}>Tap details to view/edit →</Text>
      </TouchableOpacity>
    );
  };

  const Header = () => (
    <View style={styles.header}>
      {/* Search Input */}
      <View style={styles.searchBox}>
        <Feather name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter inventory by name, brand, model..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category & Status Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {FILTER_OPTIONS.map((filter) => {
          const isSelected = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Counter bar */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          Showing {filteredItems.length} of {items.length} items
        </Text>
        {activeFilter !== 'All' && (
          <TouchableOpacity onPress={() => setActiveFilter('All')}>
            <Text style={styles.clearFilterText}>Reset Filter</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <FlatList
      data={filteredItems}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      ListHeaderComponent={Header}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>No items found matching your filter.</Text>
          {(activeFilter !== 'All' || searchQuery.trim().length > 0) && (
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={() => {
                setActiveFilter('All');
                setSearchQuery('');
              }}
            >
              <Text style={styles.resetFilterText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      }
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.background,
    padding: 16,
    paddingBottom: 80,
    minHeight: '100%',
  },
  header: {
    marginBottom: 12,
  },
  searchBox: {
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
  filterBar: {
    flexDirection: 'row',
    paddingVertical: 2,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 2,
  },
  counterText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  clearFilterText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: borderRadius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  badgeIn: {
    backgroundColor: colors.inStockBg,
    color: colors.inStock,
  },
  badgeLow: {
    backgroundColor: colors.lowStockBg,
    color: colors.lowStock,
  },
  badgeOut: {
    backgroundColor: colors.outOfStockBg,
    color: colors.outOfStock,
  },
  badgeCat: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.primary,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: colors.border,
  },
  stepBtnText: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  stepBtnTextDisabled: {
    color: colors.textMuted,
  },
  qtyBox: {
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  qtyNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  qtyLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaValue: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  priceValue: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sellingValue: {
    fontWeight: '800',
    color: colors.inStock,
  },
  notes: {
    marginTop: 6,
    fontStyle: 'italic',
    color: colors.textMuted,
    fontSize: 12,
  },
  tapHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.accent,
    textAlign: 'right',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  resetFilterBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  resetFilterText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 13,
  },
});
