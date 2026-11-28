import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import QuickRestockModal from '../components/QuickRestockModal';
import QuickSaleModal from '../components/QuickSaleModal';
import ScreenWrapper from '../components/ScreenWrapper';
import { borderRadius, colors, shadows } from '../constants/theme';
import {
  adjustItemQuantity,
  deleteItem,
  getItemById,
  getSalesByItemId,
  getStockMovementsByItemId,
} from '../database/Helper';
import { formatIMEI } from '../utils/imei';

const MOVEMENT_PAGE_SIZE = 20;

const MOVEMENT_LABELS = {
  opening: 'Opening stock',
  sale: 'Sale',
  restock: 'Restock',
  adjustment: 'Stock adjustment',
  removed: 'Item removed',
};

export default function ItemDetailsScreen({ route }) {
  const initialItem = route.params?.item;
  const [item, setItem] = useState(initialItem);
  const [sales, setSales] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [hasMoreMovements, setHasMoreMovements] = useState(false);
  const [loadingMoreMovements, setLoadingMoreMovements] = useState(false);
  const [saleModalVisible, setSaleModalVisible] = useState(false);
  const [restockModalVisible, setRestockModalVisible] = useState(false);
  const navigation = useNavigation();

  const loadItemSales = useCallback(async (itemId) => {
    if (!itemId) return;
    try {
      const records = await getSalesByItemId(itemId);
      setSales(records || []);
    } catch (err) {
      console.error('Failed to load sales history:', err);
    }
  }, []);

  const loadItemMovements = useCallback(async (itemId, offset = 0, append = false) => {
    if (!itemId) return;
    try {
      const records = await getStockMovementsByItemId(itemId, MOVEMENT_PAGE_SIZE + 1, offset);
      setStockMovements((previous) =>
        append ? [...previous, ...records.slice(0, MOVEMENT_PAGE_SIZE)] : records.slice(0, MOVEMENT_PAGE_SIZE)
      );
      setHasMoreMovements(records.length > MOVEMENT_PAGE_SIZE);
    } catch (err) {
      console.error('Failed to load stock activity:', err);
    }
  }, []);

  const handleLoadMoreMovements = async () => {
    setLoadingMoreMovements(true);
    try {
      await loadItemMovements(item.id, stockMovements.length, true);
    } finally {
      setLoadingMoreMovements(false);
    }
  };

  const refreshCurrentItem = useCallback(async (itemId) => {
    if (!itemId) return;
    try {
      const updated = await getItemById(itemId);
      if (updated) setItem(updated);
      loadItemSales(itemId);
      loadItemMovements(itemId);
    } catch (err) {
      console.error('Failed to reload item:', err);
    }
  }, [loadItemSales, loadItemMovements]);

  useFocusEffect(
    useCallback(() => {
      if (initialItem?.id) {
        refreshCurrentItem(initialItem.id);
      }
    }, [initialItem?.id, refreshCurrentItem])
  );

  if (!item) {
    return (
      <ScreenWrapper>
        <Text style={styles.error}>No item selected.</Text>
      </ScreenWrapper>
    );
  }

  const handleCopyIMEI = async () => {
    if (!item.imei) return;
    await Clipboard.setStringAsync(item.imei);
    Alert.alert('📋 Copied', `IMEI (${item.imei}) copied to clipboard.`);
  };

  const isOutOfStock = item.quantity === 0;
  const isLowStock = item.quantity > 0 && item.quantity < 10;

  const formatDate = (dateStr) => (dateStr ? dateStr.split('T')[0] : '—');

  const handleQuickAdjust = async (delta) => {
    const newQty = Math.max(0, item.quantity + delta);
    setItem((prev) => ({ ...prev, quantity: newQty }));

    try {
      const updated = await adjustItemQuantity(item.id, delta);
      if (updated) {
        setItem(updated);
        await loadItemMovements(item.id);
      }
    } catch (err) {
      console.error('Adjust error:', err);
      Alert.alert('❌ Error', 'Failed to adjust stock quantity.');
      setItem(item); // Revert
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '🗑️ Delete Item',
      `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(item.id);
              Alert.alert('✅ Deleted', 'Item was deleted successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('❌ Error', 'Failed to delete item.');
            }
          },
        },
      ]
    );
  };

  // Profit margin calculation if both prices exist
  const profitMargin =
    item.selling_price && item.cost_price && item.selling_price > item.cost_price
      ? (
          ((item.selling_price - item.cost_price) / item.selling_price) *
          100
        ).toFixed(1)
      : null;

  // Lifetime metrics
  const totalUnitsSold = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
  const totalRevenue = sales.reduce((sum, s) => sum + (s.sold_price || 0) * (s.quantity || 0), 0);

  return (
    <ScreenWrapper scroll>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="arrow-left" size={20} color={colors.primary} />
        <Text style={styles.backBtnText}>Back to Inventory</Text>
      </TouchableOpacity>

      {/* Item Title Area */}
      <View style={styles.titleArea}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
          {item.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
          ) : null}
          {item.brand ? (
            <View style={[styles.categoryBadge, { backgroundColor: '#F3F4F6' }]}>
              <Text style={[styles.categoryBadgeText, { color: colors.textSecondary }]}>{item.brand}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Primary Action Buttons: Quick Sell & Restock */}
      <View style={styles.primaryActionsRow}>
        <TouchableOpacity
          style={[styles.primarySellBtn, isOutOfStock && styles.primaryBtnDisabled]}
          disabled={isOutOfStock}
          onPress={() => setSaleModalVisible(true)}
        >
          <Feather name="shopping-bag" size={17} color="#FFF" />
          <Text style={styles.primarySellBtnText}>
            {isOutOfStock ? 'Out of Stock' : 'Quick Sell Item'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryRestockBtn}
          onPress={() => setRestockModalVisible(true)}
        >
          <Feather name="plus-circle" size={17} color={colors.primary} />
          <Text style={styles.primaryRestockBtnText}>Restock</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stock Adjustment Card */}
      <View style={styles.stockCard}>
        <Text style={styles.stockCardTitle}>Quick Stock Adjustment</Text>

        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={[styles.stepperBtn, isOutOfStock && styles.stepperBtnDisabled]}
            onPress={() => handleQuickAdjust(-1)}
            disabled={isOutOfStock}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.stepperBtnText, isOutOfStock && styles.stepperBtnTextDisabled]}>
              − 1
            </Text>
          </TouchableOpacity>

          <View style={styles.stockCountArea}>
            <Text style={styles.stockCountNum}>{item.quantity}</Text>
            {isOutOfStock ? (
              <Text style={[styles.badge, styles.badgeOut]}>Out of Stock</Text>
            ) : isLowStock ? (
              <Text style={[styles.badge, styles.badgeLow]}>Low Stock</Text>
            ) : (
              <Text style={[styles.badge, styles.badgeIn]}>In Stock</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => handleQuickAdjust(1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.stepperBtnText}>+ 1</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Specifications & Financials Card */}
      <View style={styles.detailCard}>
        <Text style={styles.sectionTitle}>Item Specifications</Text>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Brand</Text>
          <Text style={styles.specValue}>{item.brand || '—'}</Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Model</Text>
          <Text style={styles.specValue}>{item.model || '—'}</Text>
        </View>

        {item.imei ? (
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Barcode / IMEI</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.specValue, { fontWeight: '700', color: colors.primary }]}>
                {formatIMEI(item.imei)}
              </Text>
              <TouchableOpacity onPress={handleCopyIMEI} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="copy" size={14} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {item.part_type ? (
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Part Type</Text>
            <Text style={styles.specValue}>{item.part_type}</Text>
          </View>
        ) : null}

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Cost Price</Text>
          <Text style={styles.specValue}>₹{item.cost_price != null ? item.cost_price : '—'}</Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Selling Price</Text>
          <Text style={[styles.specValue, { color: colors.inStock, fontWeight: '800' }]}>
            ₹{item.selling_price != null ? item.selling_price : '—'}
          </Text>
        </View>

        {profitMargin ? (
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Estimated Margin</Text>
            <Text style={[styles.specValue, { color: colors.accent, fontWeight: '700' }]}>
              {profitMargin}%
            </Text>
          </View>
        ) : null}

        <View style={[styles.specRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.specLabel}>Date Added</Text>
          <Text style={styles.specValue}>{formatDate(item.added_on)}</Text>
        </View>

        {item.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes / Storage Info:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        ) : null}
      </View>

      {/* Stock Activity Card */}
      <View style={styles.detailCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>Stock Activity</Text>
          <Text style={styles.salesMetricText}>
            {totalUnitsSold} sold (₹{Math.round(totalRevenue).toLocaleString()})
          </Text>
        </View>

        {stockMovements.length === 0 ? (
          <Text style={styles.noSalesText}>No stock activity recorded for this item yet.</Text>
        ) : (
          stockMovements.map((movement) => (
            <View key={movement.id} style={styles.saleItemRow}>
              <View>
                <Text style={styles.saleItemDate}>{formatDate(movement.created_at)}</Text>
                <Text style={styles.saleItemCustomer}>
                  {movement.source_type === 'opening_baseline'
                    ? 'Starting balance'
                    : MOVEMENT_LABELS[movement.movement_type] || 'Stock movement'}
                  {movement.quantity_before != null && movement.quantity_after != null
                    ? ` • ${movement.quantity_before} → ${movement.quantity_after}`
                    : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={[
                    styles.movementDelta,
                    { color: movement.quantity_delta > 0 ? colors.inStock : colors.textSecondary },
                  ]}
                >
                  {movement.quantity_delta > 0 ? '+' : ''}
                  {movement.quantity_delta}
                </Text>
                <Text style={styles.saleItemQty}>unit(s)</Text>
              </View>
            </View>
          ))
        )}

        {hasMoreMovements && (
          <TouchableOpacity
            style={styles.loadMoreMovementsBtn}
            onPress={handleLoadMoreMovements}
            disabled={loadingMoreMovements}
          >
            <Text style={styles.loadMoreMovementsText}>
              {loadingMoreMovements ? 'Loading…' : 'Load older activity'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => navigation.navigate('EditItemScreen', { item })}
        activeOpacity={0.8}
      >
        <Feather name="edit-2" size={16} color={colors.textInverse} style={{ marginRight: 8 }} />
        <Text style={styles.editBtnText}>Edit Item Details</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={handleDelete}
        activeOpacity={0.8}
      >
        <Feather name="trash-2" size={16} color={colors.outOfStock} style={{ marginRight: 8 }} />
        <Text style={styles.deleteBtnText}>Delete Item</Text>
      </TouchableOpacity>

      {/* Modals */}
      <QuickSaleModal
        visible={saleModalVisible}
        item={item}
        onClose={() => setSaleModalVisible(false)}
        onSuccess={(updated) => {
          if (updated) setItem(updated);
          refreshCurrentItem(item.id);
        }}
      />

      <QuickRestockModal
        visible={restockModalVisible}
        item={item}
        onClose={() => setRestockModalVisible(false)}
        onSuccess={(updated) => {
          if (updated) setItem(updated);
          refreshCurrentItem(item.id);
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  titleArea: {
    marginBottom: 14,
  },
  itemName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  primarySellBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success || '#10B981',
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    ...shadows.card,
  },
  primaryBtnDisabled: {
    backgroundColor: colors.border,
  },
  primarySellBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryRestockBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    ...shadows.card,
  },
  primaryRestockBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  stockCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  stockCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: borderRadius.md,
  },
  stepperBtnDisabled: {
    backgroundColor: colors.border,
  },
  stepperBtnText: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: '700',
  },
  stepperBtnTextDisabled: {
    color: colors.textMuted,
  },
  stockCountArea: {
    alignItems: 'center',
  },
  stockCountNum: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
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
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  specLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  specValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  notesBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  salesMetricText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inStock,
  },
  noSalesText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  saleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  saleItemDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saleItemCustomer: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  saleItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.inStock,
  },
  movementDelta: {
    fontSize: 14,
    fontWeight: '700',
  },
  saleItemQty: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  loadMoreMovementsBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  loadMoreMovementsText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    marginBottom: 10,
    ...shadows.card,
  },
  editBtnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outOfStock,
    marginBottom: 24,
  },
  deleteBtnText: {
    color: colors.outOfStock,
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: colors.outOfStock,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});
