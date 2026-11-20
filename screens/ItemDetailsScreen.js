import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ScreenWrapper from '../components/ScreenWrapper';
import { borderRadius, colors, shadows } from '../constants/theme';
import { adjustItemQuantity, deleteItem } from '../database/Helper';
import { formatIMEI } from '../utils/imei';

export default function ItemDetailsScreen({ route }) {
  const initialItem = route.params?.item;
  const [item, setItem] = useState(initialItem);
  const navigation = useNavigation();

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
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        )}
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
            <Text style={styles.specLabel}>Device IMEI</Text>
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
    marginBottom: 16,
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
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  stockCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 18,
    marginBottom: 16,
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
    fontWeight: '800',
  },
  stepperBtnTextDisabled: {
    color: colors.textMuted,
  },
  stockCountArea: {
    alignItems: 'center',
  },
  stockCountNum: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
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
    marginBottom: 20,
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
    marginBottom: 12,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
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
    padding: 10,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
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
  editBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...shadows.card,
  },
  editBtnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 30,
  },
  deleteBtnText: {
    color: colors.outOfStock,
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: colors.outOfStock,
    textAlign: 'center',
    fontSize: 16,
    marginTop: 40,
  },
});
