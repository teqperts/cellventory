import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadius, colors, shadows } from '../constants/theme';
import { useShop } from '../context/ShopContext';
import { recordSale } from '../database/Helper';

export default function QuickSaleModal({ visible, item, onClose, onSuccess }) {
  const { shopName } = useShop();
  const insets = useSafeAreaInsets();
  const bottomSafePad = Math.max((insets?.bottom || 0) + 12, Platform.OS === 'android' ? 56 : 24);
  const [quantity, setQuantity] = useState('1');
  const [sellingPrice, setSellingPrice] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shareWhatsApp, setShareWhatsApp] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setQuantity('1');
      setSellingPrice(item.selling_price != null ? String(item.selling_price) : '');
      setPaymentMode('Cash');
      setCustomerName('');
      setCustomerPhone('');
      setShareWhatsApp(false);
    }
  }, [item, visible]);

  if (!item) return null;

  const currentStock = item.quantity || 0;
  const unitPrice = parseFloat(sellingPrice) || 0;
  const qty = parseInt(quantity, 10) || 1;
  const totalAmount = (unitPrice * qty).toFixed(2);

  const handleAdjustQty = (delta) => {
    const next = Math.min(Math.max(1, qty + delta), currentStock);
    setQuantity(String(next));
  };

  const handleShareReceipt = (saleData) => {
    const storeTitle = shopName || 'Cellventory Mobile Store';
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const receiptMsg =
      `🧾 *${storeTitle}* — Payment Receipt\n` +
      `--------------------------------\n` +
      `📦 *Item:* ${saleData.item_name}\n` +
      `🔢 *Quantity:* ${saleData.quantity}\n` +
      `💰 *Total Paid:* ₹${saleData.sold_price * saleData.quantity}\n` +
      `💳 *Payment Method:* ${saleData.payment_mode}\n` +
      `📅 *Date:* ${dateStr}\n` +
      (customerName.trim() ? `👤 *Customer:* ${customerName.trim()}\n` : '') +
      `--------------------------------\n` +
      `Thank you for your business!`;

    const encoded = encodeURIComponent(receiptMsg);
    const url = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${encoded}` : `whatsapp://send?text=${encoded}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Unavailable', 'Could not open WhatsApp on this device.');
    });
  };

  const handleConfirmSale = async () => {
    if (qty <= 0) {
      Alert.alert('⚠️ Invalid Quantity', 'Quantity must be at least 1.');
      return;
    }
    if (qty > currentStock) {
      Alert.alert('⚠️ Insufficient Stock', `Only ${currentStock} unit(s) available in inventory.`);
      return;
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      Alert.alert('⚠️ Invalid Price', 'Please enter a valid selling price.');
      return;
    }

    setLoading(true);
    try {
      const result = await recordSale({
        item_id: item.id,
        item_name: item.name,
        category: item.category || '',
        quantity: qty,
        cost_price: item.cost_price || 0,
        sold_price: unitPrice,
        payment_mode: paymentMode,
        customer_name: customerName,
        customer_phone: customerPhone,
      });

      if (shareWhatsApp) {
        handleShareReceipt(result.sale);
      }

      Alert.alert(
        '✅ Sale Recorded',
        `Sold ${qty}x ${item.name} for ₹${totalAmount} (${paymentMode}). Stock updated!`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSuccess) onSuccess(result.updatedItem);
              onClose();
            },
          },
        ]
      );
    } catch (err) {
      console.error('Sale failed:', err);
      Alert.alert('❌ Sale Failed', err.message || 'Could not record sale.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
      >
        <View style={[styles.sheet, { paddingBottom: bottomSafePad }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Quick Sell Item</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Stock & Unit Price Info Bar */}
            <View style={styles.infoBar}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>In Stock</Text>
                <Text style={styles.infoValue}>{currentStock} units</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Cost Price</Text>
                <Text style={styles.infoValue}>₹{item.cost_price != null ? item.cost_price : '—'}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Standard MRP</Text>
                <Text style={styles.infoValue}>₹{item.selling_price != null ? item.selling_price : '—'}</Text>
              </View>
            </View>

            {/* Quantity Stepper */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Quantity to Sell</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[styles.stepperBtn, qty <= 1 && styles.stepperBtnDisabled]}
                  onPress={() => handleAdjustQty(-1)}
                  disabled={qty <= 1}
                >
                  <Text style={[styles.stepperBtnText, qty <= 1 && styles.stepperBtnTextDisabled]}>−</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.qtyInput}
                  value={quantity}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9]/g, '');
                    setQuantity(cleaned);
                  }}
                  keyboardType="numeric"
                />

                <TouchableOpacity
                  style={[styles.stepperBtn, qty >= currentStock && styles.stepperBtnDisabled]}
                  onPress={() => handleAdjustQty(1)}
                  disabled={qty >= currentStock}
                >
                  <Text style={[styles.stepperBtnText, qty >= currentStock && styles.stepperBtnTextDisabled]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Final Selling Price per Unit */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Selling Price per Unit (₹)</Text>
              <TextInput
                style={styles.textInput}
                value={sellingPrice}
                onChangeText={setSellingPrice}
                placeholder="Enter agreed selling price"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Total Amount Box */}
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total Sale Value</Text>
              <Text style={styles.totalValue}>₹{totalAmount}</Text>
            </View>

            {/* Payment Mode Pills */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Payment Mode</Text>
              <View style={styles.paymentRow}>
                {['Cash', 'UPI', 'Khata'].map((mode) => {
                  const active = paymentMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.paymentPill, active && styles.paymentPillActive]}
                      onPress={() => setPaymentMode(mode)}
                    >
                      <Feather
                        name={mode === 'Cash' ? 'dollar-sign' : mode === 'UPI' ? 'smartphone' : 'book'}
                        size={14}
                        color={active ? '#FFF' : colors.textPrimary}
                      />
                      <Text style={[styles.paymentText, active && styles.paymentTextActive]}>{mode}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Optional Customer Info */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Customer Details (Optional)</Text>
              <TextInput
                style={[styles.textInput, { marginBottom: 8 }]}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Customer Name (e.g. Rahul)"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.textInput}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="Customer Phone (for WhatsApp slip)"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* WhatsApp Receipt Toggle */}
            <TouchableOpacity
              style={styles.whatsappToggle}
              activeOpacity={0.8}
              onPress={() => setShareWhatsApp(!shareWhatsApp)}
            >
              <FontAwesome5
                name={shareWhatsApp ? 'check-square' : 'square'}
                size={18}
                color={shareWhatsApp ? colors.success || '#10B981' : colors.textMuted}
              />
              <Text style={styles.whatsappToggleText}>Share digital receipt on WhatsApp after sale</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
              onPress={handleConfirmSale}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#FFF" />
                  <Text style={styles.confirmBtnText}>Complete Sale (₹{totalAmount})</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl || 20,
    borderTopRightRadius: borderRadius.xl || 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    ...shadows.header,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.full,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  infoBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoCol: {
    flex: 1,
    alignItems: 'center',
  },
  infoDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  infoLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    backgroundColor: colors.border,
  },
  stepperBtnText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  stepperBtnTextDisabled: {
    color: colors.textMuted,
  },
  qtyInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  totalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary + '10',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paymentPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paymentTextActive: {
    color: '#FFF',
  },
  whatsappToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    marginBottom: 10,
  },
  whatsappToggleText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
