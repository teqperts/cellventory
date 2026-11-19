import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ScreenWrapper from '../components/ScreenWrapper';
import { adjustItemQuantity, deleteItem } from '../database/Helper';

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

  return (
    <ScreenWrapper scroll>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="arrow-left" size={20} color="#305F72" />
        <Text style={styles.backBtnText}>Back to Inventory</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>📦 {item.name}</Text>

      {/* Quick Stock Adjustment Card */}
      <View style={styles.stockCard}>
        <Text style={styles.stockCardTitle}>Quick Stock Adjustment</Text>

        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={[styles.stepperBtn, isOutOfStock && styles.stepperBtnDisabled]}
            onPress={() => handleQuickAdjust(-1)}
            disabled={isOutOfStock}
          >
            <Text style={[styles.stepperBtnText, isOutOfStock && styles.stepperBtnTextDisabled]}>− 1</Text>
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
          >
            <Text style={styles.stepperBtnText}>+ 1</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.detailBlock}>
        <Text style={styles.label}>Category:</Text>
        <Text style={styles.value}>{item.category || '—'}</Text>

        <Text style={styles.label}>Brand:</Text>
        <Text style={styles.value}>{item.brand || '—'}</Text>

        <Text style={styles.label}>Model:</Text>
        <Text style={styles.value}>{item.model || '—'}</Text>

        {item.part_type ? (
          <>
            <Text style={styles.label}>Part Type:</Text>
            <Text style={styles.value}>{item.part_type}</Text>
          </>
        ) : null}

        <Text style={styles.label}>Cost Price:</Text>
        <Text style={styles.value}>₹{item.cost_price != null ? item.cost_price : '—'}</Text>

        <Text style={styles.label}>Selling Price:</Text>
        <Text style={styles.value}>₹{item.selling_price != null ? item.selling_price : '—'}</Text>

        <Text style={styles.label}>Added On:</Text>
        <Text style={styles.value}>{formatDate(item.added_on)}</Text>

        {item.notes ? <Text style={styles.notes}>📝 {item.notes}</Text> : null}
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => navigation.navigate('EditItemScreen', { item })}
      >
        <Text style={styles.btnText}>✏️ Edit Item Details</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.btnText}>🗑️ Delete Item</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  backBtnText: {
    color: '#305F72',
    fontSize: 15,
    fontWeight: '600',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#305F72',
    textAlign: 'center',
    marginBottom: 16,
  },
  stockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D4DFE8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  stockCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#547999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperBtn: {
    backgroundColor: '#305F72',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  stepperBtnDisabled: {
    backgroundColor: '#CFD8DC',
  },
  stepperBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  stepperBtnTextDisabled: {
    color: '#90A4AE',
  },
  stockCountArea: {
    alignItems: 'center',
  },
  stockCountNum: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1B3C57',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
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
  detailBlock: {
    backgroundColor: '#E3EAF2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    color: '#305F72',
  },
  value: {
    fontSize: 15,
    color: '#1B3C57',
    marginTop: 2,
  },
  notes: {
    marginTop: 12,
    fontStyle: 'italic',
    color: '#687E91',
  },
  editBtn: {
    backgroundColor: '#4C9AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteBtn: {
    backgroundColor: '#E94F37',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#FF4C4C',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 40,
  },
});
