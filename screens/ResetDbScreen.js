import { Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, colors, shadows } from '../constants/theme';
import { getDatabase } from '../database/Helper';

export default function ResetDbScreen() {
  const [db, setDb] = useState(null);
  const [tableName, setTableName] = useState('items');
  const [recordCount, setRecordCount] = useState(0);
  const navigation = useNavigation();

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color={colors.primary} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>🛠️ Database Utility Panel</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Select Table:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={tableName}
              onValueChange={(value) => setTableName(value)}
              style={styles.picker}
            >
              {knownTables.map((table) => (
                <Picker.Item key={table} label={table} value={table} />
              ))}
            </Picker>
          </View>

          <Text style={styles.info}>
            Selected Table: <Text style={{ fontWeight: '700', color: colors.primary }}>{tableName}</Text> ({recordCount} rows)
          </Text>

          <TouchableOpacity style={styles.orangeBtn} onPress={clearTable}>
            <Text style={styles.btnText}>Clear Table Records</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.redBtn} onPress={dropTable}>
            <Text style={styles.btnText}>Drop Table</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.greenBtn} onPress={recreateTable}>
            <Text style={styles.btnText}>Recreate Default Schema</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  pickerWrapper: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 15,
  },
  picker: {
    height: 50,
    color: colors.textPrimary,
  },
  info: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 24,
  },
  btnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  orangeBtn: {
    backgroundColor: colors.lowStock,
    padding: 14,
    borderRadius: borderRadius.md,
    marginBottom: 12,
  },
  redBtn: {
    backgroundColor: colors.outOfStock,
    padding: 14,
    borderRadius: borderRadius.md,
    marginBottom: 12,
  },
  greenBtn: {
    backgroundColor: colors.inStock,
    padding: 14,
    borderRadius: borderRadius.md,
  },
});
