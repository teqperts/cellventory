import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ScreenWrapper from '../components/ScreenWrapper';
import { getDatabase } from '../database/Helper';

export default function ItemDetailsScreen({ route }) {
  const { item } = route.params;
  const navigation = useNavigation();
  const [db, setDb] = useState(null);

  useEffect(() => {
    getDatabase().then(setDb);
  }, []);

  const formatDate = (dateStr) =>
    dateStr ? dateStr.split('T')[0] : '—';

  const handleDelete = () => {
    Alert.alert(
      '🗑️ Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync(`DELETE FROM items WHERE id = ?`, [item.id]);
              Alert.alert('✅ Item deleted');
              navigation.goBack();
            } catch (err) {
              console.error(err);
              Alert.alert('❌ Failed to delete item');
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

        {item.part_type && (
          <>
            <Text style={styles.label}>Part Type:</Text>
            <Text style={styles.value}>{item.part_type}</Text>
          </>
        )}

        <Text style={styles.label}>Quantity:</Text>
        <Text style={styles.value}>{item.quantity}</Text>

        <Text style={styles.label}>Cost Price:</Text>
        <Text style={styles.value}>₹{item.cost_price || '—'}</Text>

        <Text style={styles.label}>Selling Price:</Text>
        <Text style={styles.value}>₹{item.selling_price || '—'}</Text>

        <Text style={styles.label}>Added On:</Text>
        <Text style={styles.value}>{formatDate(item.added_on)}</Text>

        {item.notes && (
          <Text style={styles.notes}>📝 {item.notes}</Text>
        )}
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => navigation.navigate('EditItemScreen', { item })}
      >
        <Text style={styles.btnText}>Edit Item</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.btnText}>Delete Item</Text>
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
    fontSize: 15,
    fontWeight: '500',
    marginTop: 10,
    color: '#305F72',
  },
  value: {
    fontSize: 15,
    color: '#547999',
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
});
