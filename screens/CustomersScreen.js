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
import {
  getAllCustomers,
  getAllRepairs,
  updateRepairStatus,
} from '../database/Helper';
import { formatIMEI } from '../utils/imei';

const STATUS_FILTERS = [
  { id: 'All', label: 'All Status' },
  { id: 'In Progress', label: '⏳ In Progress' },
  { id: 'Ready for Delivery', label: '✅ Ready' },
  { id: 'Delivered', label: '🚚 Delivered' },
  { id: 'Overdue', label: '⚠️ Overdue' },
];

export default function CustomersScreen() {
  const [activeTab, setActiveTab] = useState('repairs'); // 'repairs' | 'customers'
  const [repairs, setRepairs] = useState([]);
  const [filteredRepairs, setFilteredRepairs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation();

  const loadData = async () => {
    try {
      setLoading(true);
      const [allCusts, allReps] = await Promise.all([
        getAllCustomers(),
        getAllRepairs(),
      ]);

      // If repairs is empty, fall back to legacy customer records as repairs
      let activeRepairs = allReps || [];
      if (activeRepairs.length === 0 && allCusts && allCusts.length > 0) {
        activeRepairs = allCusts
          .filter((c) => c.device_model || c.purpose || c.imei)
          .map((c) => ({
            id: c.id,
            customer_id: c.id,
            customer_name: c.name,
            customer_phone: c.phone,
            name: c.name,
            phone: c.phone,
            device_model: c.device_model || 'Device',
            imei: c.imei,
            purpose: c.purpose || 'Repair / Service',
            status: c.status || 'In Progress',
            delivery_date: c.delivery_date,
            estimated_cost: c.estimated_cost || 0,
            advance_paid: c.advance_paid || 0,
            issue: c.notes,
          }));
      }

      setCustomers(allCusts || []);
      setRepairs(activeRepairs);

      applyFiltering(activeRepairs, allCusts || [], search, selectedStatusFilter);
    } catch (err) {
      console.error('Failed to load customers & repairs:', err);
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const applyFiltering = (repList, custList, query, statusFilter) => {
    const today = new Date().toISOString().split('T')[0];
    const q = (query || '').toLowerCase().trim();

    // 1. Filter Repairs
    let repResult = repList;
    if (statusFilter === 'In Progress') {
      repResult = repResult.filter(
        (r) => (r.status === 'In Progress' || !r.status) && r.status !== 'Delivered'
      );
    } else if (statusFilter === 'Ready for Delivery') {
      repResult = repResult.filter((r) => r.status === 'Ready for Delivery');
    } else if (statusFilter === 'Delivered') {
      repResult = repResult.filter((r) => r.status === 'Delivered');
    } else if (statusFilter === 'Overdue') {
      repResult = repResult.filter(
        (r) =>
          r.delivery_date &&
          r.delivery_date < today &&
          r.delivery_date !== '' &&
          r.status !== 'Delivered'
      );
    }

    if (q) {
      repResult = repResult.filter(
        (r) =>
          (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.customer_phone && r.customer_phone.includes(q)) ||
          (r.phone && r.phone.includes(q)) ||
          (r.device_model && r.device_model.toLowerCase().includes(q)) ||
          (r.imei && r.imei.toLowerCase().includes(q))
      );
    }
    setFilteredRepairs(repResult);

    // 2. Filter Customers
    let custResult = custList;
    if (q) {
      custResult = custResult.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
      );
    }
    setFilteredCustomers(custResult);
  };

  const handleSearch = (text) => {
    setSearch(text);
    applyFiltering(repairs, customers, text, selectedStatusFilter);
  };

  const handleStatusFilterSelect = (statusId) => {
    setSelectedStatusFilter(statusId);
    applyFiltering(repairs, customers, search, statusId);
  };

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Could not open phone dialer.');
    });
  };

  const handleWhatsApp = (name, phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const cleanWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(`Hello ${name}, greetings from CELLVENTORY!`);
    Linking.openURL(`https://wa.me/${cleanWithCode}?text=${msg}`).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp.');
    });
  };

  const handleQuickDeliver = (repair) => {
    const est = parseFloat(repair.estimated_cost) || 0;
    const adv = parseFloat(repair.advance_paid) || 0;
    const bal = Math.max(0, est - adv);

    Alert.alert(
      '📦 Mark as Delivered',
      `Confirm device handover for ${repair.device_model}?${
        bal > 0 ? `\n\n💰 Collect remaining balance of ₹${bal}.` : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Delivered',
          onPress: async () => {
            try {
              await updateRepairStatus(repair.id, 'Delivered');
              loadData();
              Alert.alert('Success', `${repair.device_model} marked as Delivered.`);
            } catch (e) {
              Alert.alert('Error', 'Failed to update status.');
            }
          },
        },
      ]
    );
  };

  // Render a Single Repair Ticket Card
  const renderRepairItem = ({ item }) => {
    const isDelivered = item.status === 'Delivered';
    const isReady = item.status === 'Ready for Delivery';
    const today = new Date().toISOString().split('T')[0];
    const isOverdue =
      item.delivery_date &&
      item.delivery_date < today &&
      item.delivery_date !== '' &&
      !isDelivered;

    const est = parseFloat(item.estimated_cost) || 0;
    const adv = parseFloat(item.advance_paid) || 0;
    const bal = Math.max(0, est - adv);

    const clientName = item.customer_name || item.name || 'Client';
    const clientPhone = item.customer_phone || item.phone || '';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('CustomerDetails', {
            customer: {
              id: item.customer_id || item.id,
              name: clientName,
              phone: clientPhone,
              device_model: item.device_model,
              imei: item.imei,
              purpose: item.purpose,
            },
          })
        }
      >
        {/* Card Header: Device & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.deviceIconCircle}>
              <Feather name="smartphone" size={15} color={colors.primary} />
            </View>
            <View style={{ marginLeft: 10, flexShrink: 1 }}>
              <Text style={styles.deviceTitle} numberOfLines={1}>
                {item.device_model}
              </Text>
              <Text style={styles.clientSubText} numberOfLines={1}>
                {clientName} • {clientPhone}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusPill,
              isDelivered
                ? styles.pillDelivered
                : isReady
                ? styles.pillReady
                : styles.pillInProgress,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                isDelivered
                  ? styles.textDelivered
                  : isReady
                  ? styles.textReady
                  : styles.textInProgress,
              ]}
            >
              {isDelivered ? '✓ Delivered' : isReady ? '✅ Ready' : '⏳ In Progress'}
            </Text>
          </View>
        </View>

        {/* Card Info: IMEI & Due Date */}
        <View style={styles.infoRow}>
          {item.imei ? (
            <View style={styles.infoChip}>
              <Feather name="hash" size={11} color={colors.textSecondary} style={{ marginRight: 3 }} />
              <Text style={styles.infoChipText}>{formatIMEI(item.imei)}</Text>
            </View>
          ) : null}

          {item.delivery_date ? (
            <View style={[styles.infoChip, isOverdue && styles.infoChipOverdue]}>
              <Feather
                name="calendar"
                size={11}
                color={isOverdue ? '#DC2626' : colors.textSecondary}
                style={{ marginRight: 3 }}
              />
              <Text style={[styles.infoChipText, isOverdue && styles.infoChipTextOverdue]}>
                {isOverdue ? `Overdue (${item.delivery_date})` : item.delivery_date}
              </Text>
            </View>
          ) : null}

          {est > 0 && (
            <View style={[styles.khataPill, bal > 0 ? styles.khataDue : styles.khataPaid]}>
              <Text style={[styles.khataPillText, bal > 0 ? styles.khataDueText : styles.khataPaidText]}>
                {bal > 0 ? `Due: ₹${bal}` : '✅ Paid'}
              </Text>
            </View>
          )}
        </View>

        {/* Action Row */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => handleCall(clientPhone)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="phone" size={15} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => handleWhatsApp(clientName, clientPhone)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FontAwesome5 name="whatsapp" size={15} color="#25D366" />
          </TouchableOpacity>

          {!isDelivered && (
            <TouchableOpacity
              style={styles.deliverActionBtn}
              onPress={() => handleQuickDeliver(item)}
              activeOpacity={0.8}
            >
              <Feather name="check" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.deliverActionText}>Deliver</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render a Single Customer Profile Card
  const renderCustomerItem = ({ item }) => {
    const balDue = parseFloat(item.balance_due) || 0;
    const deviceCount = parseInt(item.device_count, 10) || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CustomerDetails', { customer: item })}
      >
        <View style={styles.customerCardRow}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase() || 'C'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerNameText}>{item.name}</Text>
            <Text style={styles.customerPhoneText}>{item.phone}</Text>
            <View style={styles.customerMetaRow}>
              <View style={styles.deviceCountPill}>
                <Feather name="smartphone" size={11} color={colors.primary} style={{ marginRight: 3 }} />
                <Text style={styles.deviceCountPillText}>
                  {deviceCount} {deviceCount === 1 ? 'Device' : 'Devices'}
                </Text>
              </View>
              {balDue > 0 ? (
                <View style={[styles.khataPill, styles.khataDue]}>
                  <Text style={[styles.khataPillText, styles.khataDueText]}>Due: ₹{balDue}</Text>
                </View>
              ) : (
                <View style={[styles.khataPill, styles.khataPaid]}>
                  <Text style={[styles.khataPillText, styles.khataPaidText]}>All Settled</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.customerActionCol}>
            <TouchableOpacity
              style={styles.customerCircleBtn}
              onPress={() => handleCall(item.phone)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="phone" size={15} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.customerCircleBtn}
              onPress={() => handleWhatsApp(item.name, item.phone)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome5 name="whatsapp" size={15} color="#25D366" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Segmented Control */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'repairs' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('repairs')}
          activeOpacity={0.8}
        >
          <Feather
            name="tool"
            size={13}
            color={activeTab === 'repairs' ? '#FFFFFF' : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentText, activeTab === 'repairs' && styles.segmentTextActive]}>
            Active Repairs ({repairs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'customers' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('customers')}
          activeOpacity={0.8}
        >
          <Feather
            name="users"
            size={13}
            color={activeTab === 'customers' ? '#FFFFFF' : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentText, activeTab === 'customers' && styles.segmentTextActive]}>
            Customers ({customers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <Feather name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={
            activeTab === 'repairs'
              ? 'Search by model, customer, IMEI...'
              : 'Search customers by name, phone...'
          }
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearSearchBtn}>
            <Feather name="x-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Row of Status Filters (Only for Repairs Tab) */}
      {activeTab === 'repairs' && (
        <View style={styles.statusFiltersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusFilterScroll}
          >
            {STATUS_FILTERS.map((filter) => {
              const isSelected = selectedStatusFilter === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.statusFilterChip,
                    isSelected && styles.statusFilterChipActive,
                  ]}
                  onPress={() => handleStatusFilterSelect(filter.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.statusFilterText,
                      isSelected && styles.statusFilterTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* List Body */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'repairs' ? (
        <FlatList
          data={filteredRepairs}
          keyExtractor={(item, idx) => (item.id ? `rep-${item.id}` : `idx-${idx}`)}
          renderItem={renderRepairItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={44} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Repair Records Found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try adjusting your search terms.' : 'Tap "+" below to record a device repair.'}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => `cust-${item.id}`}
          renderItem={renderCustomerItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="users" size={44} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Customers Found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'No clients match your search query.' : 'Tap "+" below to add your first client.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddCustomerScreen')}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  clearSearchBtn: {
    padding: 4,
  },
  statusFiltersWrapper: {
    marginBottom: 6,
  },
  statusFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statusFilterChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  statusFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  deviceIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  clientSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  pillInProgress: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  pillReady: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  pillDelivered: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textInProgress: {
    color: '#B45309',
  },
  textReady: {
    color: '#065F46',
  },
  textDelivered: {
    color: '#475569',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  infoChipOverdue: {
    backgroundColor: '#FEE2E2',
  },
  infoChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  infoChipTextOverdue: {
    color: '#DC2626',
    fontWeight: '700',
  },
  khataPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  khataDue: {
    backgroundColor: '#FEF3C7',
  },
  khataPaid: {
    backgroundColor: '#ECFDF5',
  },
  khataPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  khataDueText: {
    color: '#B45309',
  },
  khataPaidText: {
    color: '#047857',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    gap: 10,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliverActionBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  deliverActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  customerCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  customerNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  customerPhoneText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  customerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  deviceCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  deviceCountPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  customerActionCol: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  customerCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
});
