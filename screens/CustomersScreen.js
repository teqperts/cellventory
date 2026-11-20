// screens/CustomersScreen.js
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { borderRadius, colors, shadows } from '../constants/theme';
import { getAllCustomers, searchCustomers } from '../database/Helper';

const FILTER_CHIPS = [
  'All',
  'Repair',
  'Purchase',
  'Inquiry',
  'Trade-In',
  'Warranty',
];

export default function CustomersScreen() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation();

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAllCustomers();
      setCustomers(data);
      applyFilterAndSearch(data, search, selectedFilter);
    } catch (err) {
      console.error('Failed to load customers:', err);
      Alert.alert('Error', 'Failed to load customer list.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const applyFilterAndSearch = (list, query, filter) => {
    let result = list;

    // Apply category / purpose filter
    if (filter !== 'All') {
      result = result.filter(
        (c) => c.purpose && c.purpose.toLowerCase().includes(filter.toLowerCase())
      );
    }

    // Apply search query
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.device_model && c.device_model.toLowerCase().includes(q)) ||
          (c.purpose && c.purpose.toLowerCase().includes(q))
      );
    }

    setFiltered(result);
  };

  const handleSearch = (text) => {
    setSearch(text);
    applyFilterAndSearch(customers, text, selectedFilter);
  };

  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
    applyFilterAndSearch(customers, search, filter);
  };

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Could not open phone dialer.');
    });
  };

  const handleWhatsApp = (customer) => {
    if (!customer.phone) return;
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Hello ${customer.name}, greeting from our store regarding your ${customer.purpose || 'visit'}!`
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Ensure it is installed.');
    });
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getPurposeBadgeStyle = (purpose) => {
    if (!purpose) return { bg: '#F1F5F9', text: '#475569' };
    if (purpose.includes('Repair')) return { bg: '#EFF6FF', text: '#1D4ED8' };
    if (purpose.includes('Purchase')) return { bg: '#ECFDF5', text: '#047857' };
    if (purpose.includes('Inquiry')) return { bg: '#FEF3C7', text: '#B45309' };
    if (purpose.includes('Trade-In') || purpose.includes('Sale')) return { bg: '#FAF5FF', text: '#7E22CE' };
    if (purpose.includes('Warranty')) return { bg: '#FEF2F2', text: '#B91C1C' };
    return { bg: '#F3F4F6', text: '#374151' };
  };

  const renderCustomerItem = ({ item }) => {
    const badgeStyle = getPurposeBadgeStyle(item.purpose);

    return (
      <TouchableOpacity
        style={styles.customerCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CustomerDetailsScreen', { customer: item })}
      >
        <View style={styles.cardHeaderRow}>
          {/* Avatar Initials */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>

          {/* Customer Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.customerPhone}>{item.phone}</Text>

            {item.device_model ? (
              <View style={styles.deviceRow}>
                <Feather name="smartphone" size={13} color={colors.textSecondary} />
                <Text style={styles.deviceText} numberOfLines={1}>
                  {item.device_model}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Purpose Badge */}
          <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.badgeText, { color: badgeStyle.text }]}>
              {item.purpose || 'Customer'}
            </Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtnCall}
            activeOpacity={0.7}
            onPress={() => handleCall(item.phone)}
          >
            <Ionicons name="call" size={15} color={colors.primary} />
            <Text style={styles.actionBtnCallText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnWhatsApp}
            activeOpacity={0.7}
            onPress={() => handleWhatsApp(item)}
          >
            <FontAwesome5 name="whatsapp" size={15} color="#16A34A" />
            <Text style={styles.actionBtnWhatsAppText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by name, phone, or device..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={handleSearch}
            style={styles.searchInput}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Feather name="x-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {FILTER_CHIPS.map((chip) => {
            const isSelected = selectedFilter === chip;
            return (
              <TouchableOpacity
                key={chip}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => handleFilterSelect(chip)}
              >
                <Text
                  style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}
                >
                  {chip}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Summary Header */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          Showing {filtered.length} of {customers.length} customers
        </Text>
        <TouchableOpacity
          style={styles.addSmallBtn}
          onPress={() => navigation.navigate('AddCustomerScreen')}
        >
          <Feather name="user-plus" size={14} color={colors.primary} />
          <Text style={styles.addSmallBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCustomerItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="users" size={44} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Customers Found</Text>
              <Text style={styles.emptySubtitle}>
                {search || selectedFilter !== 'All'
                  ? 'Try adjusting your search query or purpose filter.'
                  : 'Start building your customer directory by adding your first walk-in client.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => navigation.navigate('AddCustomerScreen')}
              >
                <Feather name="plus" size={16} color={colors.textInverse} style={{ marginRight: 6 }} />
                <Text style={styles.emptyAddBtnText}>Add First Customer</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addSmallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  customerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  cardInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  customerPhone: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  deviceText: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  actionBtnCall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  actionBtnCallText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
  },
  actionBtnWhatsApp: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  actionBtnWhatsAppText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
    marginLeft: 6,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: borderRadius.md,
    marginTop: 18,
    ...shadows.button,
  },
  emptyAddBtnText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
});
