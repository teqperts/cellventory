import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { borderRadius, colors, shadows } from '../constants/theme';

function InventoryItemCard({ item, onPress, onAdjustQty, onSell, onRestock }) {
  const isOutOfStock = item.quantity === 0;
  const isLowStock = item.quantity > 0 && item.quantity < 10;

  const accentColor = isOutOfStock
    ? colors.outOfStock
    : isLowStock
    ? colors.lowStock
    : colors.inStock;

  const subtitleParts = [item.brand, item.model]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
  const subtitle = subtitleParts.join(' • ');

  const sellingPriceText =
    item.selling_price != null && item.selling_price !== ''
      ? `₹${Number(item.selling_price).toLocaleString('en-IN')}`
      : '—';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => onPress(item)}
    >
      {/* Left Stock Health Stripe */}
      <View style={[styles.accentStripe, { backgroundColor: accentColor }]} />

      <View style={styles.cardBody}>
        {/* Row 1: Identity + 1-Tap Stepper */}
        <View style={styles.topRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>
              {item.name}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={[styles.stepBtn, isOutOfStock && styles.stepBtnDisabled]}
              onPress={() => onAdjustQty(item.id, -1)}
              disabled={isOutOfStock}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={`Decrease stock for ${item.name}`}
            >
              <Text style={[styles.stepBtnText, isOutOfStock && styles.stepBtnTextDisabled]}>−</Text>
            </TouchableOpacity>

            <View style={styles.qtyBox}>
              <Text style={styles.qtyNumber}>{item.quantity}</Text>
              <Text style={styles.qtyLabel}>qty</Text>
            </View>

            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => onAdjustQty(item.id, 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={`Increase stock for ${item.name}`}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: Compact Specs / Tag Pills */}
        {(item.category || item.part_type || item.imei) && (
          <View style={styles.tagsRow}>
            {item.category ? (
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{item.category}</Text>
              </View>
            ) : null}
            {item.part_type ? (
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{item.part_type}</Text>
              </View>
            ) : null}
            {item.imei ? (
              <View style={[styles.tagPill, styles.imeiPill]}>
                <Feather name="hash" size={10} color={colors.textSecondary} style={{ marginRight: 3 }} />
                <Text style={styles.tagText} numberOfLines={1}>
                  {item.imei}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Row 3: Sell Price + Stock Health Pill */}
        <View style={styles.priceStatusStrip}>
          <View style={styles.priceCluster}>
            <Text style={styles.sellLabel}>SELL</Text>
            <Text style={styles.sellValue}>{sellingPriceText}</Text>
          </View>

          {isOutOfStock ? (
            <View style={[styles.statusBadge, styles.statusOut]}>
              <Text style={[styles.statusText, styles.statusTextOut]}>Out of Stock</Text>
            </View>
          ) : isLowStock ? (
            <View style={[styles.statusBadge, styles.statusLow]}>
              <Text style={[styles.statusText, styles.statusTextLow]}>Low: {item.quantity} left</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusIn]}>
              <Text style={[styles.statusText, styles.statusTextIn]}>In Stock</Text>
            </View>
          )}
        </View>

        {item.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            📝 {item.notes}
          </Text>
        ) : null}

        {/* Row 4: Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.sellBtn, isOutOfStock && styles.sellBtnDisabled]}
            disabled={isOutOfStock}
            onPress={() => onSell(item)}
            activeOpacity={0.8}
          >
            <Feather name="shopping-bag" size={13} color="#FFFFFF" />
            <Text style={styles.sellBtnText}>Sell</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restockBtn}
            onPress={() => onRestock(item)}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={13} color={colors.primary} />
            <Text style={styles.restockBtnText}>Restock</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <View style={styles.detailsHintRow}>
            <Text style={styles.detailsHint}>Details</Text>
            <Feather name="chevron-right" size={14} color={colors.accent} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(InventoryItemCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  accentStripe: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
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
    width: 26,
    height: 26,
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
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 17,
  },
  stepBtnTextDisabled: {
    color: colors.textMuted,
  },
  qtyBox: {
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  qtyNumber: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.primary,
  },
  qtyLabel: {
    fontSize: 8,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 7,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    maxWidth: 180,
  },
  imeiPill: {
    backgroundColor: '#F8FAFC',
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  priceStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  priceCluster: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  sellLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  sellValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.inStock,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusIn: {
    backgroundColor: colors.inStockBg,
  },
  statusLow: {
    backgroundColor: colors.lowStockBg,
  },
  statusOut: {
    backgroundColor: colors.outOfStockBg,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusTextIn: {
    color: colors.inStock,
  },
  statusTextLow: {
    color: colors.lowStock,
  },
  statusTextOut: {
    color: colors.outOfStock,
  },
  notes: {
    marginTop: 6,
    fontStyle: 'italic',
    color: colors.textMuted,
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 9,
  },
  sellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.inStock,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
  },
  sellBtnDisabled: {
    backgroundColor: colors.border,
  },
  sellBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  restockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: borderRadius.sm,
  },
  restockBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  detailsHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsHint: {
    fontSize: 11.5,
    color: colors.accent,
    fontWeight: '700',
  },
});
