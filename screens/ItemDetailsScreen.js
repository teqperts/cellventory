import { useNavigation } from '@react-navigation/native';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ScreenWrapper from '../components/ScreenWrapper';
import { deleteItem } from '../database/Helper';

export default function ItemDetailsScreen({ route }) {
  const { item } = route.params || {};
  const navigation = useNavigation();

  if (!item) {
    return (
      <ScreenWrapper>
        <Text style={styles.error}>No item selected.</Text>
      </ScreenWrapper>
    );
  }

  const formatDate = (dateStr) => (dateStr ? dateStr.split('T')[0] : '—');

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
      <Text style={styles.heading}>📦 {item.name}</Text>

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

        <Text style={styles.label}>Quantity in Stock:</Text>
        <Text style={[styles.value, { fontWeight: '700' }]}>{item.quantity}</Text>

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
        <Text style={styles.btnText}>✏️ Edit Item</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.btnText}>🗑️ Delete Item</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#305F72',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailBlock: {
    backgroundColor: '#E3EAF2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
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
