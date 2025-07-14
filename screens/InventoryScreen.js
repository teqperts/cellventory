import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { getDatabase } from '../database/Helper';

export default function InventoryScreen() {
  const [items, setItems] = useState([]);
  const [db, setDb] = useState(null);

  useEffect(() => {
    getDatabase().then(setDb);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchItems = async () => {
        if (!db) return;
        const result = await db.getAllAsync('SELECT * FROM items');
        setItems(result);
      };
      fetchItems();
    }, [db])
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.name}</Text>
      <View style={styles.row}><Text style={styles.label}>Category:</Text><Text style={styles.value}>{item.category || '—'}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Brand:</Text><Text style={styles.value}>{item.brand || '—'}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Model:</Text><Text style={styles.value}>{item.model || '—'}</Text></View>
      {item.part_type && (
        <View style={styles.row}><Text style={styles.label}>Part Type:</Text><Text style={styles.value}>{item.part_type}</Text></View>
      )}
      <View style={styles.row}><Text style={styles.label}>Quantity:</Text><Text style={styles.value}>{item.quantity}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Cost Price:</Text><Text style={styles.value}>₹{item.cost_price || '—'}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Selling Price:</Text><Text style={styles.value}>₹{item.selling_price || '—'}</Text></View>
      <View style={styles.row}><Text style={styles.label}>Added On:</Text><Text style={styles.value}>{item.added_on?.split('T')[0] || '—'}</Text></View>
      {item.notes && <Text style={styles.notes}>📝 {item.notes}</Text>}
    </View>
  );

  const Header = () => (
    <Text style={styles.heading}>📋 Inventory Details</Text>
  );

  return (
    <>
      {items.length === 0 ? (
        <Text style={styles.empty}>No items found</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.content}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: '#F6F9FF',
    padding: 20,
    paddingBottom: 30,
  },
  heading: {
    fontSize: 24,
    color: '#305F72',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#E3EAF2',
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B3C57',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: 120,
    fontWeight: '500',
    color: '#305F72',
  },
  value: {
    flex: 1,
    color: '#547999',
  },
  notes: {
    marginTop: 8,
    fontStyle: 'italic',
    color: '#687E91',
  },
  empty: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    color: '#777',
  },
});
