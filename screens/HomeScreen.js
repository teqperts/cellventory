import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import IMEIScannerModal from '../components/IMEIScannerModal';
import { borderRadius, colors, shadows } from '../constants/theme';
import { getAllItems, getInventoryStats, lookupIMEI, searchItems } from '../database/Helper';
import { formatIMEI } from '../utils/imei';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, recent: 0 });
  const [scannerVisible, setScannerVisible] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [statsData, allItems] = await Promise.all([
        getInventoryStats(),
        getAllItems(),
      ]);
      setStats(statsData);
      setRecentItems((allItems || []).slice(0, 10));
    } catch (err) {
      console.error('Fetch dashboard data error:', err);
    }
  };

  const handleScanIMEI = async (scannedImei) => {
    try {
      const result = await lookupIMEI(scannedImei);

      if (result.type === 'inventory') {
        const item = result.item;
        Alert.alert(
          '📦 Inventory Item Found',
          `Matched stock: ${item.name} (${item.brand || 'Device'})\n\nSelling Price: ₹${
            item.selling_price || 0
          }\nIn Stock: ${item.quantity} unit(s)\n\nWould you like to open this item to view details and sell?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open & Sell Item',
              onPress: () => {
                navigation.navigate('ItemDetailsScreen', { item });
              },
            },
          ]
        );
      } else if (result.type === 'customer') {
        const customer = result.customer;
        const visitsCount = result.history ? result.history.length : 1;
        Alert.alert(
          '📱 Customer Device Found',
          `Owner: ${customer.name}\nMobile: ${customer.phone}\nDevice: ${
            customer.device_model || 'Device'
          }\nIMEI: ${formatIMEI(scannedImei)}\nPast Visits: ${visitsCount}\nLast Purpose: ${
            customer.purpose
          }`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'View Repair History',
              onPress: () => {
                navigation.navigate('CustomerDetailsScreen', { customer });
              },
            },
            {
              text: 'Log New Visit',
              onPress: () => {
                navigation.navigate('AddCustomerScreen', {
                  initialValues: {
                    phone: customer.phone,
                    name: customer.name,
                    device_model: customer.device_model,
                    imei: scannedImei,
                    purpose: 'Repair / Service',
                  },
                });
              },
            },
          ]
        );
      } else {
        // Brand new device (not in inventory or customer records)
        Alert.alert(
          '🆕 Unrecognized Device',
          `IMEI: ${formatIMEI(
            scannedImei
          )}\n\nThis device is not in your customer records or inventory. What would you like to do?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Accept for Repair',
              onPress: () => {
                navigation.navigate('AddCustomerScreen', {
                  initialValues: {
                    imei: scannedImei,
                    purpose: 'Repair / Service',
                  },
                });
              },
            },
            {
              text: 'Record Inquiry',
              onPress: () => {
                navigation.navigate('AddCustomerScreen', {
                  initialValues: {
                    imei: scannedImei,
                    purpose: 'Inquiry / Quotation',
                  },
                });
              },
            },
            {
              text: 'Add to Inventory',
              onPress: () => {
                navigation.navigate('AddItemScreen', {
                  initialValues: {
                    imei: scannedImei,
                    category: 'Mobile',
                  },
                });
              },
            },
          ]
        );
      }
    } catch (err) {
      console.error('IMEI lookup error:', err);
      Alert.alert('❌ Error', 'Failed to lookup device IMEI.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      setQuery('');
      setResults([]);
    }, [])
  );

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

  const renderItem = ({ item }) => {
    const isOutOfStock = item.quantity === 0;
    const isLowStock = item.quantity > 0 && item.quantity < 10;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ItemDetailsScreen', { item })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {isOutOfStock ? (
            <Text style={[styles.badge, styles.badgeOut]}>Out of Stock</Text>
          ) : isLowStock ? (
            <Text style={[styles.badge, styles.badgeLow]}>Low: {item.quantity} left</Text>
          ) : (
            <Text style={[styles.badge, styles.badgeNormal]}>Qty: {item.quantity}</Text>
          )}
        </View>

        <View style={styles.metaRow}>
          {item.category ? (
            <Text style={styles.categoryPill}>{item.category}</Text>
          ) : null}
          <Text style={styles.metaText}>
            {item.brand || 'No brand'} • {item.model || 'No model'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Persistent Search and Stats Section (Never unmounts on keystrokes) */}
      <View style={styles.topContainer}>
        {/* Modern Search Bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Quick search by name, brand, or model..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleInputChange}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => handleInputChange('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginRight: 6 }}
            >
              <Feather name="x-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.scanSearchBtn}
            onPress={() => setScannerVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="camera" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {query.trim().length > 0 && (
          <Text style={styles.resultCount}>
            {results.length > 0
              ? `${results.length} item${results.length > 1 ? 's' : ''} found`
              : 'No matching items in inventory'}
          </Text>
        )}

        {/* Quick Stat Cards */}
        <View style={styles.statsRow}>
          <StatBox
            label="Total Items"
            value={stats.total}
            icon="package"
            onPress={() => navigation.navigate('Inventory', { filter: 'All' })}
          />
          <StatBox
            label="Low Stock"
            value={stats.lowStock}
            icon="alert-triangle"
            highlight={stats.lowStock > 0}
            onPress={() => navigation.navigate('Inventory', { filter: 'Low Stock' })}
          />
          <StatBox
            label="New (7d)"
            value={stats.recent}
            icon="clock"
            onPress={() => navigation.navigate('Inventory', { filter: 'Recent' })}
          />
        </View>

        {/* Quicklinks (Add Item & Add Customer) */}
        <View style={styles.quickLinksRow}>
          <TouchableOpacity
            style={styles.quickLinkCardItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddItemScreen')}
          >
            <View style={styles.quickLinkIconWrapItem}>
              <Feather name="plus-circle" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.quickLinkTextWrap}>
              <Text style={styles.quickLinkTitle}>+ Add Item</Text>
              <Text style={styles.quickLinkSub}>New stock or part</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLinkCardCustomer}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddCustomerScreen')}
          >
            <View style={styles.quickLinkIconWrapCustomer}>
              <Feather name="user-plus" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.quickLinkTextWrap}>
              <Text style={styles.quickLinkTitle}>+ Add Customer</Text>
              <Text style={styles.quickLinkSub}>Register client / visit</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Smart IMEI Scanner Banner */}
        <TouchableOpacity
          style={styles.scannerBanner}
          activeOpacity={0.8}
          onPress={() => setScannerVisible(true)}
        >
          <View style={styles.scannerBannerIconWrap}>
            <Feather name="maximize" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.scannerBannerTextWrap}>
            <View style={styles.scannerBannerTitleRow}>
              <Text style={styles.scannerBannerTitle}>Scan Device IMEI</Text>
              <View style={styles.smartTag}>
                <Text style={styles.smartTagText}>SMART ROUTER</Text>
              </View>
            </View>
            <Text style={styles.scannerBannerSub} numberOfLines={1}>
              Sells inventory, views repair history, or intakes new device
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {query.trim().length > 0
              ? `Search Results (${results.length})`
              : `Recently Added Items (${recentItems.length})`}
          </Text>
          {query.trim().length === 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Inventory', { filter: 'All' })}>
              <Text style={styles.seeAllText}>View All →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={query.trim().length > 0 ? results : recentItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather
              name={query.trim().length > 0 ? 'search' : 'inbox'}
              size={36}
              color={colors.textMuted}
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.emptyTitle}>
              {query.trim().length > 0 ? 'No Matching Items' : 'No Inventory Items Yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {query.trim().length > 0
                 ? 'Try searching with different keywords or model numbers.'
                 : 'Start recording your stock by tapping "+ Add Item" above.'}
            </Text>
          </View>
        }
      />

      <IMEIScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScanIMEI}
      />
    </View>
  );
}

function StatBox({ label, value, icon, onPress, highlight }) {
  return (
    <TouchableOpacity
      style={[styles.statBox, highlight && styles.statBoxHighlight]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.statIconWrap}>
        <Feather
          name={icon}
          size={16}
          color={highlight ? colors.lowStock : colors.primary}
        />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statActionHint}>View →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    ...shadows.card,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  resultCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statBox: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: borderRadius.md,
    width: '31%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  statBoxHighlight: {
    backgroundColor: colors.lowStockBg,
    borderColor: '#FDE68A',
  },
  statIconWrap: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  statActionHint: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '700',
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: borderRadius.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  badgeNormal: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.primary,
  },
  badgeLow: {
    backgroundColor: colors.lowStockBg,
    color: colors.lowStock,
  },
  badgeOut: {
    backgroundColor: colors.outOfStockBg,
    color: colors.outOfStock,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryPill: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 14,
  },
  quickLinkCardItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    ...shadows.card,
  },
  quickLinkIconWrapItem: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  quickLinkCardCustomer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    ...shadows.card,
  },
  quickLinkIconWrapCustomer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  quickLinkTextWrap: {
    flex: 1,
  },
  quickLinkTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  quickLinkSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  scanSearchBtn: {
    padding: 6,
    marginLeft: 2,
  },
  scannerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A', // Slate 900
    borderRadius: borderRadius.lg,
    padding: 12,
    marginTop: 2,
    marginBottom: 14,
    ...shadows.card,
  },
  scannerBannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.teqperts, // Brand Orange Accent
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scannerBannerTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  scannerBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scannerBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  smartTag: {
    backgroundColor: 'rgba(255, 122, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 0, 0.4)',
  },
  smartTagText: {
    color: '#FF7A00',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scannerBannerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
