import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import IMEIScannerModal from '../components/IMEIScannerModal';
import InventoryItemCard from '../components/InventoryItemCard';
import QuickCustomerEntryModal from '../components/QuickCustomerEntryModal';
import QuickRestockModal from '../components/QuickRestockModal';
import QuickSaleModal from '../components/QuickSaleModal';
import { borderRadius, colors, shadows } from '../constants/theme';
import {
  adjustItemQuantity,
  computeFinancialSummary,
  getAllItems,
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
  { id: 'newest', label: 'Newest First' },
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
  const [pickerMode, setPickerMode] = useState(null); // 'sort' | 'brand' | null

  // Modals state
  const [scannerVisible, setScannerVisible] = useState(false);
  const [selectedItemForSale, setSelectedItemForSale] = useState(null);
  const [saleModalVisible, setSaleModalVisible] = useState(false);
  const [selectedItemForRestock, setSelectedItemForRestock] = useState(null);
  const [restockModalVisible, setRestockModalVisible] = useState(false);
  const [quickEntryVisible, setQuickEntryVisible] = useState(false);

  // Sync route param filter if navigated with one
  useEffect(() => {
    if (route?.params?.filter) {
      setActiveCategory(route.params.filter);
    }
  }, [route?.params?.filter]);

  const loadData = useCallback(async () => {
    try {
      const allItems = await getAllItems();
      const list = allItems || [];
      setItems(list);
      setSummary(computeFinancialSummary(list));
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Distinct Brands in inventory for quick filtering
  const availableBrands = useMemo(() => {
    const brandsSet = new Set();
    items.forEach((item) => {
      const b = (item.brand || '').trim();
      if (b) brandsSet.add(b);
    });
    return ['All', ...Array.from(brandsSet).sort()];
  }, [items]);

  const handleQuickAdjust = useCallback(
    async (id, delta) => {
      // Optimistic UI update
      setItems((prevItems) => {
        const updated = prevItems.map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        );
        setSummary(computeFinancialSummary(updated));
        return updated;
      });

      try {
        await adjustItemQuantity(id, delta);
      } catch (err) {
        console.error('Quick adjust error:', err);
        Alert.alert('❌ Error', 'Failed to update item quantity');
        loadData();
      }
    },
    [loadData]
  );

  const handleOpenItemDetails = useCallback(
    (item) => {
      navigation.navigate('ItemDetailsScreen', { item });
    },
    [navigation]
  );

  const handleOpenSaleModal = useCallback((item) => {
    setSelectedItemForSale(item);
    setSaleModalVisible(true);
  }, []);

  const handleOpenRestockModal = useCallback((item) => {
    setSelectedItemForRestock(item);
    setRestockModalVisible(true);
  }, []);

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
              onPress: () => handleOpenSaleModal(matched),
            },
            {
              text: 'Open Details',
              onPress: () => handleOpenItemDetails(matched),
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
    const result = items.filter((item) => {
      if (activeCategory === 'Low Stock' && (item.quantity <= 0 || item.quantity >= 10)) {
        return false;
      }
      if (activeCategory === 'Out of Stock' && item.quantity > 0) return false;
      if (
        !['All', 'Low Stock', 'Out of Stock'].includes(activeCategory) &&
        item.category !== activeCategory
      ) {
        return false;
      }

      if (activeBrand !== 'All' && (item.brand || '').trim().toLowerCase() !== activeBrand.toLowerCase()) {
        return false;
      }

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

    return result.sort((a, b) => {
      if (sortBy === 'stock_asc') return a.quantity - b.quantity;
      if (sortBy === 'stock_desc') return b.quantity - a.quantity;
      if (sortBy === 'price_desc') return (b.selling_price || 0) - (a.selling_price || 0);
      if (sortBy === 'price_asc') return (a.selling_price || 0) - (b.selling_price || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return b.id - a.id;
    });
  }, [items, activeCategory, activeBrand, searchQuery, sortBy]);

  const activeSortLabel = useMemo(
    () => SORT_OPTIONS.find((opt) => opt.id === sortBy)?.label || 'Newest First',
    [sortBy]
  );

  const hasActiveFilters = activeCategory !== 'All' || activeBrand !== 'All' || searchQuery.trim().length > 0;

  const renderItem = useCallback(
    ({ item }) => (
      <InventoryItemCard
        item={item}
        onPress={handleOpenItemDetails}
        onAdjustQty={handleQuickAdjust}
        onSell={handleOpenSaleModal}
        onRestock={handleOpenRestockModal}
      />
    ),
    [handleOpenItemDetails, handleQuickAdjust, handleOpenSaleModal, handleOpenRestockModal]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeaderWrap}>
        {/* Collapsible Financial Valuation Summary Card */}
        <View style={styles.summaryCard}>
          <TouchableOpacity
            style={styles.summaryHeader}
            onPress={() => setSummaryExpanded((prev) => !prev)}
            activeOpacity={0.8}
          >
            <View style={styles.summaryHeaderLeft}>
              <Feather name="pie-chart" size={14} color={colors.primary} />
              <Text style={styles.summaryTitle}>Stock Valuation</Text>
              {!summaryExpanded && (
                <Text style={styles.summaryCollapsedSubtitle} numberOfLines={1}>
                  · {summary.total_items} items · ₹{Math.round(summary.total_retail_value).toLocaleString('en-IN')}
                </Text>
              )}
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
                  <Text style={styles.metricLabel}>Invested</Text>
                  <Text style={styles.metricValue}>
                    ₹{Math.round(summary.total_cost_value).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Retail Value</Text>
                  <Text style={styles.metricValue}>
                    ₹{Math.round(summary.total_retail_value).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Est. Profit</Text>
                  <Text style={[styles.metricValue, { color: colors.inStock }]}>
                    ₹{Math.round(summary.potential_profit).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.metricSub}>{summary.margin_percent}% margin</Text>
                </View>
              </View>

              <View style={styles.healthRow}>
                <View style={styles.healthPill}>
                  <Text style={styles.healthPillText}>
                    📦 {summary.total_units} units ({summary.total_items})
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.healthPill, activeCategory === 'Low Stock' && styles.healthPillLowActive]}
                  onPress={() => setActiveCategory(activeCategory === 'Low Stock' ? 'All' : 'Low Stock')}
                >
                  <Text style={[styles.healthPillText, { color: colors.lowStock }]}>
                    ⚠️ {summary.low_stock_count} Low
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.healthPill, activeCategory === 'Out of Stock' && styles.healthPillOutActive]}
                  onPress={() =>
                    setActiveCategory(activeCategory === 'Out of Stock' ? 'All' : 'Out of Stock')
                  }
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
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Counter + 1-Tap Brand & Sort Picker Controls */}
        <View style={styles.controlsRow}>
          <View style={styles.countWrap}>
            <Text style={styles.counterText}>
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                onPress={() => {
                  setActiveCategory('All');
                  setActiveBrand('All');
                  setSearchQuery('');
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.clearFilterText}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.pickerButtonsRow}>
            {availableBrands.length > 2 && (
              <TouchableOpacity
                style={[styles.pickerBtn, activeBrand !== 'All' && styles.pickerBtnActive]}
                onPress={() => setPickerMode('brand')}
                activeOpacity={0.75}
              >
                <Feather
                  name="tag"
                  size={12}
                  color={activeBrand !== 'All' ? '#FFFFFF' : colors.primary}
                />
                <Text
                  style={[styles.pickerBtnText, activeBrand !== 'All' && styles.pickerBtnTextActive]}
                  numberOfLines={1}
                >
                  {activeBrand === 'All' ? 'Brand' : activeBrand}
                </Text>
                <Feather
                  name="chevron-down"
                  size={12}
                  color={activeBrand !== 'All' ? '#FFFFFF' : colors.textMuted}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setPickerMode('sort')}
              activeOpacity={0.75}
            >
              <Ionicons name="swap-vertical" size={12} color={colors.primary} />
              <Text style={styles.pickerBtnText} numberOfLines={1}>
                {activeSortLabel}
              </Text>
              <Feather name="chevron-down" size={12} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [
      summary,
      summaryExpanded,
      activeCategory,
      filteredItems.length,
      hasActiveFilters,
      availableBrands.length,
      activeBrand,
      activeSortLabel,
    ]
  );

  const pickerOptions = useMemo(() => {
    if (pickerMode === 'sort') {
      return SORT_OPTIONS.map((opt) => ({
        key: opt.id,
        label: opt.label,
        selected: sortBy === opt.id,
        onSelect: () => {
          setSortBy(opt.id);
          setPickerMode(null);
        },
      }));
    }
    if (pickerMode === 'brand') {
      return availableBrands.map((brand) => ({
        key: brand,
        label: brand === 'All' ? 'All Brands' : brand,
        selected: activeBrand === brand,
        onSelect: () => {
          setActiveBrand(brand);
          setPickerMode(null);
        },
      }));
    }
    return [];
  }, [pickerMode, sortBy, availableBrands, activeBrand]);

  return (
    <View style={styles.container}>
      {/* Sticky Top Search & + Add Bar */}
      <View style={styles.stickyTopBar}>
        <View style={styles.searchBox}>
          <Feather name="search" size={17} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, brand, model, IMEI..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginRight: 6 }}
            >
              <Feather name="x-circle" size={17} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => setScannerVisible(true)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Scan Barcode or IMEI"
          >
            <Feather name="camera" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addTopBtn}
          onPress={() => navigation.navigate('AddItemScreen')}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addTopBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Valuation, Filters & Item List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        initialNumToRender={10}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No items found matching your filters.</Text>
            {hasActiveFilters && (
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

      {/* Quick Sort / Brand Picker Modal */}
      <Modal
        visible={Boolean(pickerMode)}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerMode(null)}
      >
        <TouchableWithoutFeedback onPress={() => setPickerMode(null)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerCard}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>
                    {pickerMode === 'sort' ? 'Sort Inventory By' : 'Filter by Brand'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setPickerMode(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {pickerOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.pickerOptionRow, option.selected && styles.pickerOptionRowActive]}
                      onPress={option.onSelect}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          option.selected && styles.pickerOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {option.selected && (
                        <Feather name="check" size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Quick Sale Modal */}
      <QuickSaleModal
        visible={saleModalVisible}
        item={selectedItemForSale}
        onClose={() => setSaleModalVisible(false)}
        onSuccess={loadData}
      />

      {/* Quick Restock Modal */}
      <QuickRestockModal
        visible={restockModalVisible}
        item={selectedItemForRestock}
        onClose={() => setRestockModalVisible(false)}
        onSuccess={loadData}
      />

      {/* Barcode & IMEI Camera Scanner */}
      <IMEIScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScanCode}
      />

      {/* Global Quick Customer / Device Entry Modal */}
      <QuickCustomerEntryModal
        visible={quickEntryVisible}
        onClose={() => setQuickEntryVisible(false)}
        onSuccess={loadData}
      />

      {/* Global + Quick Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setQuickEntryVisible(true)}
        activeOpacity={0.85}
        testID="global-fab-btn"
      >
        <Feather name="plus" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stickyTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingLeft: 11,
    paddingRight: 6,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  searchIcon: {
    marginRight: 7,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  scanBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  addTopBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 92,
  },
  listHeaderWrap: {
    marginBottom: 8,
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
    paddingVertical: 9,
    backgroundColor: colors.surfaceSubtle,
  },
  summaryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  summaryTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryCollapsedSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
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
    fontSize: 9.5,
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
  healthPillLowActive: {
    borderColor: colors.lowStock,
    backgroundColor: colors.lowStockBg,
  },
  healthPillOutActive: {
    borderColor: colors.outOfStock,
    backgroundColor: colors.outOfStockBg,
  },
  healthPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterBar: {
    flexDirection: 'row',
    paddingVertical: 2,
    gap: 7,
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
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 2,
    gap: 8,
  },
  countWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
  },
  clearFilterText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '700',
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 145,
  },
  pickerBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
    flexShrink: 1,
  },
  pickerBtnTextActive: {
    color: '#FFFFFF',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.floating,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  pickerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
  },
  pickerOptionRowActive: {
    backgroundColor: '#EFF6FF',
  },
  pickerOptionText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pickerOptionTextActive: {
    fontWeight: '700',
    color: colors.primary,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
    zIndex: 999,
  },
});
