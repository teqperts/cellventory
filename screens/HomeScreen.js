import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import FormInput from '../components/FormInput';
import { getDatabase } from '../database/Helper';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [db, setDb] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, recent: 0 });

  useEffect(() => {
    getDatabase().then(setDb);
  }, []);

  // Refresh stats and clear search when screen regains focus
  useFocusEffect(
    useCallback(() => {
      if (!db) return;
      fetchStats();
      setQuery('');
      setResults([]);
    }, [db])
  );

  const fetchStats = async () => {
    try {
      const total = await db.getAllAsync(`SELECT COUNT(*) as count FROM items`);
      const lowStock = await db.getAllAsync(
        `SELECT COUNT(*) as count FROM items WHERE quantity < 10`
      );
      const recent = await db.getAllAsync(
        `SELECT COUNT(*) as count FROM items WHERE added_on >= date('now', '-7 days')`
      );
      setStats({
        total: total[0].count,
        lowStock: lowStock[0].count,
        recent: recent[0].count,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Debounced search function wrapped in useMemo for stable closure
  const debouncedSearch = useMemo(() => {
    return debounce(async (text) => {
      if (!db || !text.trim()) {
        setResults([]);
        return;
      }

      try {
        const keyword = `%${text.trim()}%`;
        const found = await db.getAllAsync(
          `SELECT * FROM items WHERE name LIKE ? OR brand LIKE ? OR model LIKE ?`,
          [keyword, keyword, keyword]
        );
        setResults(found);
      } catch (err) {
        console.error(err);
        Alert.alert('❌ Search failed');
      }
    }, 300);
  }, [db]);

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
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.meta}>
        {item.brand} | {item.model} | Qty: {item.quantity}
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
          <StatBox label="Total" value={stats.total} icon="📦" />
          <StatBox label="Low" value={stats.lowStock} icon="⚠️" />
          <StatBox label="New" value={stats.recent} icon="🆕" />
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    </>
  );
}

function StatBox({ label, value, icon }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{icon} {value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#305F72',
  },
  meta: {
    fontSize: 14,
    color: '#687E91',
    marginTop: 4,
  },
});
