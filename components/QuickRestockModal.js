import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { borderRadius, colors, shadows } from '../constants/theme';
import { restockItem } from '../database/Helper';

export default function QuickRestockModal({ visible, item, onClose, onSuccess }) {
  const [addQty, setAddQty] = useState('5');
  const [costPrice, setCostPrice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setAddQty('5');
      setCostPrice(item.cost_price != null ? String(item.cost_price) : '');
    }
  }, [item, visible]);

  if (!item) return null;

  const currentStock = item.quantity || 0;
  const parsedAdd = parseInt(addQty, 10) || 0;
  const newProjectedStock = currentStock + parsedAdd;

  const handleQuickAddButton = (amount) => {
    setAddQty(String(amount));
  };

  const handleConfirmRestock = async () => {
    if (parsedAdd <= 0) {
      Alert.alert('⚠️ Invalid Quantity', 'Please enter a positive restock quantity.');
      return;
    }

    setLoading(true);
    try {
      const parsedCost = costPrice ? parseFloat(costPrice) : undefined;
      const updated = await restockItem(item.id, parsedAdd, parsedCost);
      Alert.alert(
        '✅ Restocked Successfully',
        `Added +${parsedAdd} unit(s). Total inventory is now ${updated.quantity} unit(s).`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSuccess) onSuccess(updated);
              onClose();
            },
          },
        ]
      );
    } catch (err) {
      console.error('Restock error:', err);
      Alert.alert('❌ Error', err.message || 'Failed to restock item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Inward / Restock Stock</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Current Stock vs New Stock Preview */}
            <View style={styles.previewBox}>
              <View style={styles.previewCol}>
                <Text style={styles.previewLabel}>Current Stock</Text>
                <Text style={styles.currentStockText}>{currentStock}</Text>
              </View>
              <Feather name="arrow-right" size={20} color={colors.textMuted} />
              <View style={styles.previewCol}>
                <Text style={styles.previewLabel}>New Projected Stock</Text>
                <Text style={styles.newStockText}>{newProjectedStock}</Text>
              </View>
            </View>

            {/* Quick Add Preset Buttons */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Quick Presets</Text>
              <View style={styles.presetsRow}>
                {[1, 5, 10, 25, 50].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetBtn, parsedAdd === preset && styles.presetBtnActive]}
                    onPress={() => handleQuickAddButton(preset)}
                  >
                    <Text style={[styles.presetText, parsedAdd === preset && styles.presetTextActive]}>
                      +{preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quantity to Add Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Quantity to Add</Text>
              <TextInput
                style={styles.textInput}
                value={addQty}
                onChangeText={(val) => setAddQty(val.replace(/[^0-9]/g, ''))}
                placeholder="Enter number of units"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            {/* Updated Purchase / Cost Price */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Purchase / Cost Price per Unit (₹, Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={costPrice}
                onChangeText={setCostPrice}
                placeholder="Update cost price if changed"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
              <Text style={styles.helperText}>
                Leave as-is to retain existing cost (₹{item.cost_price != null ? item.cost_price : '—'}).
              </Text>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
              onPress={handleConfirmRestock}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Feather name="plus-circle" size={16} color="#FFF" />
                  <Text style={styles.confirmBtnText}>Add +{parsedAdd} to Inventory</Text>
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
    maxHeight: '85%',
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
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  previewCol: {
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  currentStockText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textSecondary,
    marginTop: 2,
  },
  newStockText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.success || '#10B981',
    marginTop: 2,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  presetBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  presetTextActive: {
    color: '#FFF',
  },
  textInput: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
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
    backgroundColor: colors.success || '#10B981',
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
