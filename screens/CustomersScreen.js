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
import { getAllCustomers, searchCustomers, updateCustomerStatus } from '../database/Helper';

const STATUS_FILTERS = [
  { id: 'All', label: 'All Status' },
  { id: 'In Progress', label: '⏳ In Progress' },
  { id: 'Ready for Delivery', label: '✅ Ready' },
  { id: 'Delivered', label: '🚚 Delivered' },
  { id: 'Overdue', label: '⚠️ Overdue' },
];

const PURPOSE_FILTERS = [
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
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [selectedPurposeFilter, setSelectedPurposeFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation();

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAllCustomers();
      setCustomers(data || []);
      applyFilterAndSearch(data || [], search, selectedStatusFilter, selectedPurposeFilter);
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

  const applyFilterAndSearch = (list, query, statusFilter, purposeFilter) => {
    let result = list;
    const today = new Date().toISOString().split('T')[0];

    // 1. Status Filter
    if (statusFilter === 'In Progress') {
      result = result.filter(
        (c) => (c.status === 'In Progress' || !c.status) && c.status !== 'Delivered'
      );
    } else if (statusFilter === 'Ready for Delivery') {
      result = result.filter((c) => c.status === 'Ready for Delivery');
    } else if (statusFilter === 'Delivered') {
      result = result.filter((c) => c.status === 'Delivered');
    } else if (statusFilter === 'Overdue') {
      result = result.filter(
        (c) =>
          c.delivery_date &&
          c.delivery_date < today &&
          c.delivery_date !== '' &&
          c.status !== 'Delivered'
      );
    }

    // 2. Purpose Filter
    if (purposeFilter !== 'All') {
      result = result.filter(
        (c) => c.purpose && c.purpose.toLowerCase().includes(purposeFilter.toLowerCase())
      );
    }

    // 3. Search Query
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.device_model && c.device_model.toLowerCase().includes(q)) ||
          (c.purpose && c.purpose.toLowerCase().includes(q)) ||
          (c.imei && c.imei.toLowerCase().includes(q))
      );
    }

    setFiltered(result);
  };

  const handleSearch = (text) => {
    setSearch(text);
    applyFilterAndSearch(customers, text, selectedStatusFilter, selectedPurposeFilter);
  };

  const handleStatusFilterSelect = (statusId) => {
    setSelectedStatusFilter(statusId);
    applyFilterAndSearch(customers, search, statusId, selectedPurposeFilter);
  };

  const handlePurposeFilterSelect = (purpose) => {
    setSelectedPurposeFilter(purpose);
    applyFilterAndSearch(customers, search, selectedStatusFilter, purpose);
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
      `Hello ${customer.name}, greeting from CELLVENTORY regarding your ${customer.purpose || 'visit'}!`
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Ensure it is installed.');
    });
  };

  const handleQuickDeliver = (customer) => {
    const est = parseFloat(customer.estimated_cost) || 0;
    const adv = parseFloat(customer.advance_paid) || 0;
    const bal = Math.max(0, est - adv);

    Alert.alert(
      '📦 Mark as Delivered',
      `Confirm device handover to ${customer.name}?${
        bal > 0 ? `\n\n💰 Collect remaining balance of ₹${bal}.` : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Delivered',
          onPress: async () => {
            try {
              await updateCustomerStatus(customer.id, 'Delivered');
              await loadData();
            } catch (e) {
              Alert.alert('Error', 'Failed to mark delivered');
            }
          },
        },
      ]
    );
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

  const getStatusBadgeStyle = (status) => {
    if (status === 'Delivered') return { bg: '#E0E7FF', text: '#4338CA' };
    if (status === 'Ready for Delivery') return { bg: '#DCFCE7', text: '#15803D' };
    return { bg: '#FEF3C7', text: '#B45309' };
  };

  const renderCustomerItem = ({ item }) => {
    const purposeStyle = getPurposeBadgeStyle(item.purpose);
    const statusStyle = getStatusBadgeStyle(item.status);

    const estimatedCost = parseFloat(item.estimated_cost) || 0;
    const advancePaid = parseFloat(item.advance_paid) || 0;
    const balanceDue = Math.max(0, estimatedCost - advancePaid);
    const today = new Date().toISOString().split('T')[0];
    const isOverdue =
      item.delivery_date && item.delivery_date < today && item.status !== 'Delivered';

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

            {item.imei ? (
              <View style={styles.imeiBadgeRow}>
                <Feather name="hash" size={12} color={colors.accent} />
                <Text style={styles.imeiBadgeText} numberOfLines={1}>
                  IMEI: {item.imei}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Badges Column */}
          <View style={styles.badgeColumn}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                {item.status || 'In Progress'}
              </Text>
            </View>
            <View style={[styles.purposeBadge, { backgroundColor: purposeStyle.bg }]}>
              <Text style={[styles.purposeBadgeText, { color: purposeStyle.text }]}>
                {item.purpose || 'Customer'}
              </Text>
            </View>
          </View>
        </View>

        {/* Operational Highlights (Delivery Date & Payment Due) */}
        {(item.delivery_date || estimatedCost > 0 || advancePaid > 0) && (
          <View style={styles.operationalTagsRow}>
            {item.delivery_date ? (
              <View style={[styles.dateTag, isOverdue && styles.dateTagOverdue]}>
                <Feather
                  name={isOverdue ? 'alert-circle' : 'calendar'}
                  size={12}
                  color={isOverdue ? '#DC2626' : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.dateTagText, isOverdue && styles.dateTagTextOverdue]}>
                  {isOverdue ? `Overdue (${item.delivery_date})` : `Promised: ${item.delivery_date}`}
                </Text>
              </View>
            ) : null}

            {balanceDue > 0 ? (
              <View style={styles.balanceDueTag}>
                <Text style={styles.balanceDueTagText}>Due: ₹{balanceDue}</Text>
              </View>
            ) : estimatedCost > 0 ? (
              <View style={styles.paidTag}>
                <Text style={styles.paidTagText}>Paid ₹{estimatedCost}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtnCall}
            activeOpacity={0.7}
            onPress={() => handleCall(item.phone)}
          >
            <Ionicons name="call" size={14} color={colors.primary} />
            <Text style={styles.actionBtnCallText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnWhatsApp}
            activeOpacity={0.7}
            onPress={() => handleWhatsApp(item)}
          >
            <FontAwesome5 name="whatsapp" size={14} color="#16A34A" />
            <Text style={styles.actionBtnWhatsAppText}>WhatsApp</Text>
          </TouchableOpacity>

          {item.status !== 'Delivered' && (
            <TouchableOpacity
              style={styles.actionBtnDeliver}
              activeOpacity={0.7}
              onPress={() => handleQuickDeliver(item)}
            >
              <Feather name="check" size={14} color="#FFFFFF" />
              <Text style={styles.actionBtnDeliverText}>Delivered</Text>
            </TouchableOpacity>
          )}
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
            placeholder="Search by name, phone, device, or IMEI..."
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

        {/* Row 1: Status Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {STATUS_FILTERS.map((tab) => {
            const isSelected = selectedStatusFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.statusTabChip, isSelected && styles.statusTabChipActive]}
                onPress={() => handleStatusFilterSelect(tab.id)}
              >
                <Text
                  style={[
                    styles.statusTabChipText,
                    isSelected && styles.statusTabChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Row 2: Purpose Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterBar, { marginTop: 6 }]}
        >
          {PURPOSE_FILTERS.map((chip) => {
            const isSelected = selectedPurposeFilter === chip;
            return (
              <TouchableOpacity
                key={chip}
                style={[styles.purposeFilterChip, isSelected && styles.purposeFilterChipActive]}
                onPress={() => handlePurposeFilterSelect(chip)}
              >
                <Text
                  style={[
                    styles.purposeFilterChipText,
                    isSelected && styles.purposeFilterChipTextActive,
                  ]}
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
          Showing {filtered.length} of {customers.length} clients
        </Text>
        <TouchableOpacity
          style={styles.addSmallBtn}
          onPress={() => navigation.navigate('AddCustomerScreen')}
        >
          <Feather name="user-plus" size={14} color={colors.primary} />
          <Text style={styles.addSmallBtnText}>+ New Client</Text>
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
                {search || selectedStatusFilter !== 'All' || selectedPurposeFilter !== 'All'
                  ? 'Try adjusting your search query, status, or purpose filters.'
                  : 'Start building your customer directory by adding your first client.'}
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
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTabChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusTabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusTabChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusTabChipTextActive: {
    color: '#FFFFFF',
  },
  purposeFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  purposeFilterChipActive: {
    backgroundColor: colors.teqperts,
    borderColor: colors.teqperts,
  },
  purposeFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  purposeFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  imeiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  imeiBadgeText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
    marginLeft: 4,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  purposeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  purposeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  operationalTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  dateTagOverdue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  dateTagText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dateTagTextOverdue: {
    color: '#DC2626',
    fontWeight: '700',
  },
  balanceDueTag: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FED7AA',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  balanceDueTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  paidTag: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  paidTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
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
  actionBtnDeliver: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  actionBtnDeliverText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
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
