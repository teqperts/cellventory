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
            <Text style={styles.title}>{item.name}</Text>
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
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

        {item.notes ? <Text style={styles.notes}>📝 {item.notes}</Text> : null}

        <Text style={styles.tapHint}>Tap details to view/edit →</Text>
      </TouchableOpacity>
    );
  };

  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.heading}>📋 Inventory ({filteredItems.length} of {items.length})</Text>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Feather name="search" size={18} color="#687E91" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by name, brand, or model..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={18} color="#687E91" />
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
    backgroundColor: '#F6F9FF',
    padding: 16,
    paddingBottom: 40,
    minHeight: '100%',
  },
  header: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    color: '#305F72',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3EAF2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1B3C57',
  },
  filterBar: {
    flexDirection: 'row',
    paddingVertical: 4,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E3EAF2',
    borderWidth: 1,
    borderColor: '#CED8E2',
  },
  filterChipActive: {
    backgroundColor: '#305F72',
    borderColor: '#305F72',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#547999',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#1B3C57',
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
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  badgeIn: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  badgeLow: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
  },
  badgeOut: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
  },
  badgeCat: {
    backgroundColor: '#E3EAF2',
    color: '#305F72',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#D4DFE8',
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#305F72',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: '#CFD8DC',
  },
  stepBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  stepBtnTextDisabled: {
    color: '#90A4AE',
  },
  qtyBox: {
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  qtyNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B3C57',
  },
  qtyLabel: {
    fontSize: 9,
    color: '#687E91',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#687E91',
  },
  metaValue: {
    fontWeight: '600',
    color: '#1B3C57',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  priceText: {
    fontSize: 13,
    color: '#687E91',
  },
  priceValue: {
    fontWeight: '600',
    color: '#547999',
  },
  sellingValue: {
    fontWeight: '700',
    color: '#2E7D32',
  },
  notes: {
    marginTop: 6,
    fontStyle: 'italic',
    color: '#687E91',
    fontSize: 12,
  },
  tapHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#305F72',
    textAlign: 'right',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    color: '#777',
    marginBottom: 12,
  },
  resetFilterBtn: {
    backgroundColor: '#305F72',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
