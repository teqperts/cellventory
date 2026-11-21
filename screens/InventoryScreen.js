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

import IMEIScannerModal from '../components/IMEIScannerModal';
import QuickRestockModal from '../components/QuickRestockModal';
import QuickSaleModal from '../components/QuickSaleModal';
import { borderRadius, colors, shadows } from '../constants/theme';
import {
  adjustItemQuantity,
  getAllItems,
  getInventoryFinancialSummary,
  getItemByIMEI,
} from '../database/Helper';

const CATEGORY_FILTERS = [
  'All',
  'Low Stock',
  'Out of Stock',
  'Mobile',
  'Accessory',
  'Spare Part',
  'Service',
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'stock_asc', label: 'Stock: Low → High' },
  { id: 'stock_desc', label: 'Stock: High → Low' },
  { id: 'price_desc', label: 'Price: High → Low' },
  { id: 'price_asc', label: 'Price: Low → High' },
  { id: 'name_asc', label: 'Name: A → Z' },
];

export default function InventoryScreen({ route }) {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    total_items: 0,
    total_units: 0,
    total_cost_value: 0,
    total_retail_value: 0,
    potential_profit: 0,
    margin_percent: '0',
    low_stock_count: 0,
    out_of_stock_count: 0,
  });
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(route?.params?.filter || 'All');
  const [activeBrand, setActiveBrand] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modals state
  const [scannerVisible, setScannerVisible] = useState(false);
  const [selectedItemForSale, setSelectedItemForSale] = useState(null);
  const [saleModalVisible, setSaleModalVisible] = useState(false);
  const [selectedItemForRestock, setSelectedItemForRestock] = useState(null);
  const [restockModalVisible, setRestockModalVisible] = useState(false);

  // Sync route param filter if navigated with one
  useEffect(() => {
    if (route?.params?.filter) {
      setActiveCategory(route.params.filter);
    }
  }, [route?.params?.filter]);

  const loadData = async () => {
    try {
      const [allItems, finSummary] = await Promise.all([
        getAllItems(),
        getInventoryFinancialSummary(),
      ]);
      setItems(allItems || []);
      setSummary(
        finSummary || {
          total_items: 0,
          total_units: 0,
          total_cost_value: 0,
          total_retail_value: 0,
          potential_profit: 0,
          margin_percent: '0',
          low_stock_count: 0,
          out_of_stock_count: 0,
        }
      );
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Distinct Brands in inventory for quick filtering
  const availableBrands = useMemo(() => {
    const brandsSet = new Set();
    items.forEach((item) => {
      const b = (item.brand || '').trim();
      if (b) brandsSet.add(b);
    });
    return ['All', ...Array.from(brandsSet).sort()];
  }, [items]);

  const handleQuickAdjust = async (id, delta) => {
    // Optimistic UI update
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      )
    );

    try {
      await adjustItemQuantity(id, delta);
      // Reload financial summary after adjustment
      const finSummary = await getInventoryFinancialSummary();
      setSummary(finSummary);
    } catch (err) {
      console.error('Quick adjust error:', err);
      Alert.alert('❌ Error', 'Failed to update item quantity');
      loadData(); // Rollback on failure
    }
  };

  const handleScanCode = async (scannedCode) => {
    setScannerVisible(false);
    if (!scannedCode) return;
    try {
      const matched = await getItemByIMEI(scannedCode);
      if (matched) {
        setSearchQuery(scannedCode);
        Alert.alert(
          '📦 Item Found',
          `${matched.name} (${matched.brand || 'Item'})\nIn Stock: ${matched.quantity} units\nPrice: ₹${matched.selling_price || 0}`,
          [
            { text: 'Filter in List' },
            {
              text: 'Sell Item',
              onPress: () => {
                setSelectedItemForSale(matched);
                setSaleModalVisible(true);
              },
            },
            {
              text: 'Open Details',
              onPress: () => navigation.navigate('ItemDetailsScreen', { item: matched }),
            },
          ]
        );
      } else {
        Alert.alert(
          '🔍 Code Scanned',
          `Scanned code: ${scannedCode}\n\nNo item with this barcode/IMEI found in inventory. Would you like to add it as a new stock item?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add New Item',
              onPress: () =>
                navigation.navigate('AddItemScreen', {
                  initialValues: { imei: scannedCode },
                }),
            },
          ]
        );
      }
    } catch (e) {
      console.error('Scan lookup error:', e);
    }
  };

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    let result = items.filter((item) => {
      // 1. Category / Status filter
      if (activeCategory === 'Low Stock' && item.quantity >= 10) return false;
      if (activeCategory === 'Out of Stock' && item.quantity > 0) return false;
      if (
        !['All', 'Low Stock', 'Out of Stock'].includes(activeCategory) &&
        item.category !== activeCategory
      ) {
        return false;
      }

      // 2. Brand filter
      if (activeBrand !== 'All' && (item.brand || '').trim().toLowerCase() !== activeBrand.toLowerCase()) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (item.name || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        const model = (item.model || '').toLowerCase();
        const imei = (item.imei || '').toLowerCase();
        if (!name.includes(q) && !brand.includes(q) && !model.includes(q) && !imei.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // Sort result
    return result.sort((a, b) => {
      if (sortBy === 'stock_asc') return a.quantity - b.quantity;
      if (sortBy === 'stock_desc') return b.quantity - a.quantity;
      if (sortBy === 'price_desc') return (b.selling_price || 0) - (a.selling_price || 0);
      if (sortBy === 'price_asc') return (a.selling_price || 0) - (b.selling_price || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return b.id - a.id; // newest default
    });
  }, [items, activeCategory, activeBrand, searchQuery, sortBy]);

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
            <Text style={styles.title} numberOfLines={1}>
              {item.name}
            </Text>
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
              {item.brand ? (
                <Text style={[styles.badge, styles.badgeBrand]}>{item.brand}</Text>
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

        {item.imei ? (
          <View style={styles.detailsRow}>
            <Text style={styles.metaText}>
              Barcode/IMEI: <Text style={styles.metaValue}>{item.imei}</Text>
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

        {/* Action Buttons: Sell & Restock */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={[styles.actionSellBtn, isOutOfStock && styles.actionSellBtnDisabled]}
            disabled={isOutOfStock}
            onPress={() => {
              setSelectedItemForSale(item);
              setSaleModalVisible(true);
            }}
          >
            <Feather name="shopping-bag" size={13} color="#FFF" />
            <Text style={styles.actionSellBtnText}>Sell Item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRestockBtn}
            onPress={() => {
              setSelectedItemForRestock(item);
              setRestockModalVisible(true);
            }}
          >
            <Feather name="plus-circle" size={13} color={colors.primary} />
            <Text style={styles.actionRestockBtnText}>Restock</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <Text style={styles.tapHint}>Details →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        {/* Search Input with Scanner Button */}
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, brand, model, barcode..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginRight: 8 }}
            >
              <Feather name="x-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => setScannerVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="camera" size={17} color="#FFF" />
            <Text style={styles.scanBtnText}>Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Financial Valuation Summary Card */}
        <View style={styles.summaryCard}>
          <TouchableOpacity
            style={styles.summaryHeader}
            onPress={() => setSummaryExpanded(!summaryExpanded)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="pie-chart" size={15} color={colors.primary} />
              <Text style={styles.summaryTitle}>Stock Valuation & Metrics</Text>
            </View>
            <Feather
              name={summaryExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {summaryExpanded && (
            <View style={styles.summaryContent}>
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Invested (Cost)</Text>
                  <Text style={styles.metricValue}>₹{Math.round(summary.total_cost_value).toLocaleString()}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Retail Value</Text>
                  <Text style={styles.metricValue}>₹{Math.round(summary.total_retail_value).toLocaleString()}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Expected Profit</Text>
                  <Text style={[styles.metricValue, { color: colors.inStock }]}>
                    ₹{Math.round(summary.potential_profit).toLocaleString()}
                  </Text>
                  <Text style={styles.metricSub}>{summary.margin_percent}% margin</Text>
                </View>
              </View>

              {/* Quick Health Pills */}
              <View style={styles.healthRow}>
                <View style={styles.healthPill}>
                  <Text style={styles.healthPillText}>
                    📦 {summary.total_units} units ({summary.total_items} items)
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.healthPill, activeCategory === 'Low Stock' && styles.healthPillActive]}
                  onPress={() => setActiveCategory(activeCategory === 'Low Stock' ? 'All' : 'Low Stock')}
                >
                  <Text style={[styles.healthPillText, { color: colors.lowStock }]}>
                    ⚠️ {summary.low_stock_count} Low Stock
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.healthPill, activeCategory === 'Out of Stock' && styles.healthPillActive]}
                  onPress={() => setActiveCategory(activeCategory === 'Out of Stock' ? 'All' : 'Out of Stock')}
                >
                  <Text style={[styles.healthPillText, { color: colors.outOfStock }]}>
                    🔴 {summary.out_of_stock_count} Out
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Category & Status Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {CATEGORY_FILTERS.map((filter) => {
            const isSelected = activeCategory === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setActiveCategory(filter)}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Brand Filter Chips (if distinct brands exist) */}
        {availableBrands.length > 2 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterBar, { marginTop: 6 }]}
          >
            <View style={styles.filterLabelWrap}>
              <Text style={styles.filterLabel}>Brand:</Text>
            </View>
            {availableBrands.map((brand) => {
              const isSelected = activeBrand === brand;
              return (
                <TouchableOpacity
                  key={brand}
                  style={[styles.brandChip, isSelected && styles.brandChipActive]}
                  onPress={() => setActiveBrand(brand)}
                >
                  <Text style={[styles.brandChipText, isSelected && styles.brandChipTextActive]}>
                    {brand}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Sort & Counter bar */}
        <View style={styles.counterRow}>
          <Text style={styles.counterText}>
            Showing {filteredItems.length} of {items.length} items
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Sort Toggle */}
            <TouchableOpacity
              style={styles.sortBtn}
              onPress={() => {
                const currentIndex = SORT_OPTIONS.findIndex((opt) => opt.id === sortBy);
                const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
                setSortBy(SORT_OPTIONS[nextIndex].id);
              }}
            >
              <Feather name="arrow-down-up" size={11} color={colors.primary} />
              <Text style={styles.sortBtnText}>
                {SORT_OPTIONS.find((opt) => opt.id === sortBy)?.label}
              </Text>
            </TouchableOpacity>

            {(activeCategory !== 'All' || activeBrand !== 'All') && (
              <TouchableOpacity
                onPress={() => {
                  setActiveCategory('All');
                  setActiveBrand('All');
                }}
              >
                <Text style={styles.clearFilterText}>Reset</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.addSmallBtn}
              onPress={() => navigation.navigate('AddItemScreen')}
            >
              <Feather name="plus" size={13} color={colors.primary} />
              <Text style={styles.addSmallBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Item List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No items found matching your filters.</Text>
            {(activeCategory !== 'All' || activeBrand !== 'All' || searchQuery.trim().length > 0) && (
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={() => {
                  setActiveCategory('All');
                  setActiveBrand('All');
                  setSearchQuery('');
                }}
              >
                <Text style={styles.resetFilterText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Quick Sale Modal */}
      <QuickSaleModal
        visible={saleModalVisible}
        item={selectedItemForSale}
        onClose={() => setSaleModalVisible(false)}
        onSuccess={() => loadData()}
      />

      {/* Quick Restock Modal */}
      <QuickRestockModal
        visible={restockModalVisible}
        item={selectedItemForRestock}
        onClose={() => setRestockModalVisible(false)}
        onSuccess={() => loadData()}
      />

      {/* Barcode & IMEI Camera Scanner */}
      <IMEIScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScanCode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: colors.background,
  },
  content: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 80,
    minHeight: '100%',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingLeft: 12,
    paddingRight: 6,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    ...shadows.card,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
  },
  scanBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: 'hidden',
    ...shadows.card,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryContent: {
    padding: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  metricSub: {
    fontSize: 9,
    color: colors.inStock,
    fontWeight: '700',
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  healthPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  healthPillActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  healthPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterBar: {
    flexDirection: 'row',
    paddingVertical: 2,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  filterLabelWrap: {
    justifyContent: 'center',
    paddingLeft: 2,
    paddingRight: 4,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  brandChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  brandChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  brandChipTextActive: {
    color: '#FFF',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  counterText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addSmallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4,
  },
  clearFilterText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: borderRadius.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleArea: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
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
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    fontSize: 10,
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
  badgeBrand: {
    backgroundColor: '#F3F4F6',
    color: colors.textSecondary,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtn: {
    width: 28,
    height: 28,
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
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  stepBtnTextDisabled: {
    color: colors.textMuted,
  },
  qtyBox: {
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  qtyNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  qtyLabel: {
    fontSize: 8,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  metaValue: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceText: {
    fontSize: 12,
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
    marginTop: 4,
    fontStyle: 'italic',
    color: colors.textMuted,
    fontSize: 11,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionSellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success || '#10B981',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
  },
  actionSellBtnDisabled: {
    backgroundColor: colors.border,
  },
  actionSellBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRestockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
  },
  actionRestockBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  tapHint: {
    fontSize: 11,
    color: colors.accent,
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
