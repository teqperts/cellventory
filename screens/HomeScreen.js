import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import FormInput from '../components/FormInput';
import { auth } from '../config/firebase';
import { getInventoryStats, searchItems } from '../database/Helper';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, recent: 0 });

  const fetchStats = async () => {
    try {
      const data = await getInventoryStats();
      setStats(data);
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  // Refresh stats and clear search when screen regains focus
  useFocusEffect(
    useCallback(() => {
      fetchStats();
      setQuery('');
      setResults([]);
    }, [])
  );

  // Debounced search function wrapped in useMemo for stable closure
  const debouncedSearch = useMemo(() => {
    return debounce(async (text) => {
      if (!text.trim()) {
        setResults([]);
        return;
      }

      try {
        const found = await searchItems(text);
        setResults(found);
      } catch (err) {
        console.error('Search error:', err);
        Alert.alert('❌ Search failed');
      }
    }, 300);
  }, []);

  const handleInputChange = (text) => {
    setQuery(text);
    debouncedSearch(text);
  };

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ItemDetailsScreen', { item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.quantity === 0 ? (
          <Text style={[styles.badge, styles.badgeOut]}>Out of Stock</Text>
        ) : item.quantity < 10 ? (
          <Text style={[styles.badge, styles.badgeLow]}>Low Stock ({item.quantity})</Text>
        ) : (
          <Text style={[styles.badge, styles.badgeNormal]}>Qty: {item.quantity}</Text>
        )}
      </View>
      <Text style={styles.meta}>
        {item.category ? `[${item.category}] ` : ''}
        {item.brand || 'No brand'} | {item.model || 'No model'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.headerContainer}>
        <FormInput
          placeholder="Search by name, brand, or model"
          value={query}
          onChange={handleInputChange}
        />
        {query.trim().length > 0 && (
          <Text style={styles.resultCount}>
            {results.length > 0
              ? `${results.length} result${results.length > 1 ? 's' : ''} found`
              : 'No matching items'}
          </Text>
        )}
        <View style={styles.statsRow}>
          <StatBox
            label="Total"
            value={stats.total}
            icon="📦"
            onPress={() => navigation.navigate('Inventory', { filter: 'All' })}
          />
          <StatBox
            label="Low"
            value={stats.lowStock}
            icon="⚠️"
            highlight={stats.lowStock > 0}
            onPress={() => navigation.navigate('Inventory', { filter: 'Low Stock' })}
          />
          <StatBox
            label="New"
            value={stats.recent}
            icon="🆕"
            onPress={() => navigation.navigate('Inventory', { filter: 'Recent' })}
          />
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />

      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={() => signOut(auth)}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </>
  );
}

function StatBox({ label, value, icon, onPress, highlight }) {
  return (
    <TouchableOpacity
      style={[styles.statBox, highlight && styles.statBoxHighlight]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={styles.statValue}>{icon} {value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statActionHint}>View →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 10,
    backgroundColor: '#F6F9FF',
  },
  resultCount: {
    fontSize: 14,
    color: '#305F72',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    backgroundColor: '#E3EAF2',
    padding: 10,
    borderRadius: 8,
    width: '30%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statBoxHighlight: {
    backgroundColor: '#FFF4E5',
    borderColor: '#FF9800',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#305F72',
  },
  statLabel: {
    fontSize: 14,
    color: '#687E91',
    marginTop: 2,
  },
  statActionHint: {
    fontSize: 11,
    color: '#305F72',
    fontWeight: '600',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    backgroundColor: '#F6F9FF',
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#E3EAF2',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#305F72',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  badgeNormal: {
    backgroundColor: '#305F72',
    color: '#FFFFFF',
  },
  badgeLow: {
    backgroundColor: '#FF9800',
    color: '#FFFFFF',
  },
  badgeOut: {
    backgroundColor: '#E94F37',
    color: '#FFFFFF',
  },
  meta: {
    fontSize: 14,
    color: '#687E91',
    marginTop: 4,
  },
  signOutBtn: {
    backgroundColor: '#E94F37',
    padding: 12,
    borderRadius: 8,
    margin: 20,
  },
  signOutText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
});
