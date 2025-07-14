import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { getDatabase } from '../database/Helper';

export default function ResetDbScreen() {
  const [db, setDb] = useState(null);
  const [tableName, setTableName] = useState('items');
  const [recordCount, setRecordCount] = useState(0);

  const knownTables = ['items', 'repair_jobs', 'vendors'];

  useEffect(() => {
    getDatabase().then(setDb);
  }, []);

  const updateRecordCount = async () => {
    try {
      const result = await db.getAllAsync(`SELECT * FROM ${tableName}`);
      setRecordCount(result.length);
    } catch (error) {
      console.warn('⚠️ Failed to get record count:', error);
      setRecordCount(0);
    }
  };

  const clearTable = async () => {
    try {
      await db.runAsync(`DELETE FROM ${tableName}`);
      await db.runAsync(`DELETE FROM sqlite_sequence WHERE name="${tableName}"`);
      await updateRecordCount();
      Alert.alert(`✅ Cleared ${tableName}`);
    } catch (error) {
      console.error(error);
      Alert.alert('❌ Clear failed');
    }
  };

  const dropTable = async () => {
    try {
      await db.runAsync(`DROP TABLE IF EXISTS ${tableName}`);
      setRecordCount(0);
      Alert.alert(`🧨 Dropped ${tableName}`);
    } catch (error) {
      console.error(error);
      Alert.alert('❌ Drop failed');
    }
  };

  const recreateTable = async () => {
    if (tableName === 'items') {
      try {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT,
            name TEXT NOT NULL,
            brand TEXT,
            model TEXT,
            part_type TEXT,
            quantity INTEGER DEFAULT 0,
            cost_price REAL,
            selling_price REAL,
            added_on TEXT,
            notes TEXT
          );
        `);
        Alert.alert('✅ items table recreated');
      } catch (error) {
        console.error(error);
        Alert.alert('❌ Recreate failed');
      }
    } else {
      Alert.alert('ℹ️ Recreate not available for this table yet');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>🛠️ Database Utility Panel</Text>

      <Picker
        selectedValue={tableName}
        onValueChange={(value) => setTableName(value)}
        style={styles.picker}
      >
        {knownTables.map((table) => (
          <Picker.Item key={table} label={table} value={table} />
        ))}
      </Picker>

      <Text style={styles.info}>
        Selected: <Text style={{ fontWeight: '600' }}>{tableName}</Text> — Rows: {recordCount}
      </Text>

      <TouchableOpacity style={styles.orangeBtn} onPress={clearTable}>
        <Text style={styles.btnText}>Clear Table</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.redBtn} onPress={dropTable}>
        <Text style={styles.btnText}>Drop Table</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.greenBtn} onPress={recreateTable}>
        <Text style={styles.btnText}>Recreate Table</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F6F9FF',
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: '#305F72',
    textAlign: 'center',
    marginBottom: 16,
  },
  picker: {
    backgroundColor: '#E3EAF2',
    borderRadius: 8,
    marginBottom: 15,
    height: 50,
  },
  info: {
    fontSize: 16,
    textAlign: 'center',
    color: '#687E91',
    marginBottom: 30,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  orangeBtn: {
    backgroundColor: '#FFA500',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  redBtn: {
    backgroundColor: '#E94F37',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  greenBtn: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
  },
});
