import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getAllItems } from '../database/Helper';

export default function InventoryScreen() {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const loadItems = async () => {
    try {
      const result = await getAllItems();
      setItems(result || []);
    } catch (err) {
      console.error('Failed to load inventory items:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('ItemDetailsScreen', { item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.qtyBadge}>Qty: {item.quantity}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Category:</Text>
        <Text style={styles.value}>{item.category || '—'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Brand:</Text>
        <Text style={styles.value}>{item.brand || '—'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Model:</Text>
        <Text style={styles.value}>{item.model || '—'}</Text>
      </View>
      {item.part_type ? (
        <View style={styles.row}>
          <Text style={styles.label}>Part Type:</Text>
          <Text style={styles.value}>{item.part_type}</Text>
        </View>
      ) : null}
      <View style={styles.row}>
        <Text style={styles.label}>Cost Price:</Text>
        <Text style={styles.value}>₹{item.cost_price != null ? item.cost_price : '—'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Selling Price:</Text>
        <Text style={styles.value}>₹{item.selling_price != null ? item.selling_price : '—'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Added On:</Text>
        <Text style={styles.value}>{item.added_on ? item.added_on.split('T')[0] : '—'}</Text>
      </View>
      {item.notes ? <Text style={styles.notes}>📝 {item.notes}</Text> : null}
      <Text style={styles.tapHint}>Tap to view or edit →</Text>
    </TouchableOpacity>
  );

  const Header = () => (
    <Text style={styles.heading}>📋 Inventory Details ({items.length})</Text>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      ListHeaderComponent={Header}
      ListEmptyComponent={
        <Text style={styles.empty}>No items found. Add items using the Add Item tab!</Text>
      }
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: '#F6F9FF',
    padding: 20,
    paddingBottom: 40,
    minHeight: '100%',
  },
  heading: {
    fontSize: 24,
    color: '#305F72',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#E3EAF2',
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B3C57',
    flex: 1,
  },
  qtyBadge: {
    backgroundColor: '#305F72',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 110,
    fontWeight: '600',
    color: '#305F72',
    fontSize: 14,
  },
  value: {
    flex: 1,
    color: '#547999',
    fontSize: 14,
  },
  notes: {
    marginTop: 6,
    fontStyle: 'italic',
    color: '#687E91',
    fontSize: 13,
  },
  tapHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#305F72',
    textAlign: 'right',
    fontWeight: '600',
  },
  empty: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    color: '#777',
  },
});
