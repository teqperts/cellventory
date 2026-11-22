// screens/CustomersScreen.js
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import IMEIScannerModal from '../components/IMEIScannerModal';
import QuickCustomerEntryModal from '../components/QuickCustomerEntryModal';
import { borderRadius, colors, shadows } from '../constants/theme';
import {
  getAllCustomers,
  getAllRepairs,
  updateRepairStatus,
} from '../database/Helper';
import { formatIMEI } from '../utils/imei';

const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: '⏳ In Progress' },
  { id: 'ready', label: '✅ Ready' },
  { id: 'overdue', label: '⚠️ Overdue' },
  { id: 'khata_due', label: '💰 Khata Due' },
  { id: 'inquiry', label: '💡 Enquiries' },
];

export default function CustomersScreen() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [quickEntryVisible, setQuickEntryVisible] = useState(false);

  const navigation = useNavigation();

  const loadData = async () => {
    try {
      setLoading(true);
      const [allCusts, allReps] = await Promise.all([
        getAllCustomers(),
        getAllRepairs(),
      ]);

      const today = new Date().toISOString().split('T')[0];

      // Group genuine repairs by customer_id
      const repairsByCust = {};
      (allReps || []).forEach((r) => {
        const isRInquiry =
          r.status === 'Inquiry' ||
          (r.purpose && r.purpose.toLowerCase().includes('inquiry'));
        if (!isRInquiry && r.customer_id) {
          if (!repairsByCust[r.customer_id]) {
            repairsByCust[r.customer_id] = [];
          }
          repairsByCust[r.customer_id].push(r);
        }
      });

      // Build unified customer records
      const unified = (allCusts || []).map((c) => {
        const custRepairs = repairsByCust[c.id] || [];
        const isInquiry =
          ((c.purpose &&
            (c.purpose.toLowerCase().includes('inquiry') ||
              c.purpose.toLowerCase().includes('enquiry'))) ||
            c.status === 'Inquiry' ||
            c.status === 'Enquiry') &&
          c.status !== 'converted' &&
          c.status !== 'Converted' &&
          c.status !== 'closed' &&
          c.status !== 'Closed' &&
          !c.converted_repair_id;

        let totalEst = 0;
        let totalAdv = 0;
        const activeRepairs = [];
        let hasReady = false;
        let hasOverdue = false;

        custRepairs.forEach((r) => {
          const isDelivered = r.status === 'Delivered';
          const isReady = r.status === 'Ready for Delivery';
          const est = parseFloat(r.estimated_cost) || 0;
          const adv = parseFloat(r.advance_paid) || 0;
          totalEst += est;
          totalAdv += adv;

          if (!isDelivered) {
            activeRepairs.push(r);
            if (isReady) hasReady = true;
            if (r.delivery_date && r.delivery_date < today && r.delivery_date !== '') {
              hasOverdue = true;
            }
          }
        });

        // Fallback to customer table legacy fields if no repairs exist in repairs table
        if (custRepairs.length === 0 && (c.device_model || c.imei || c.notes)) {
          const est = parseFloat(c.estimated_cost) || 0;
          const adv = parseFloat(c.advance_paid) || 0;
          if (!isInquiry) {
            totalEst = est;
            totalAdv = adv;
            if (c.status !== 'Delivered') {
              const legacyItem = {
                id: c.id,
                device_model: c.device_model || 'Device',
                status: c.status || 'In Progress',
                delivery_date: c.delivery_date,
                estimated_cost: est,
                advance_paid: adv,
                imei: c.imei || '',
                issue: c.notes || '',
              };
              activeRepairs.push(legacyItem);
              if (c.status === 'Ready for Delivery') hasReady = true;
              if (c.delivery_date && c.delivery_date < today && c.delivery_date !== '') {
                hasOverdue = true;
              }
            }
          }
        }

        const balanceDue = Math.max(0, totalEst - totalAdv);

        // Determine primary active repair / display device
        const primaryRepair = activeRepairs[0] || custRepairs[0] || null;
        const displayDevice = primaryRepair
          ? primaryRepair.device_model
          : c.device_model || (isInquiry ? 'Device Inquiry' : '');
        const displayIssue = primaryRepair
          ? (primaryRepair.issue || primaryRepair.notes || '')
          : (c.notes || '');
        const displayImei = primaryRepair ? primaryRepair.imei : (c.imei || '');
        const displayDueDate = primaryRepair ? primaryRepair.delivery_date : (c.delivery_date || '');

        // Determine overall status category
        let statusCategory = 'settled';
        let statusLabel = '✓ Settled';
        let statusStyle = 'settled';

        if (isInquiry) {
          statusCategory = 'inquiry';
          statusLabel = '💡 Enquiry';
          statusStyle = 'inquiry';
        } else if (hasOverdue) {
          statusCategory = 'overdue';
          statusLabel = '⚠️ Overdue';
          statusStyle = 'overdue';
        } else if (hasReady) {
          statusCategory = 'ready';
          statusLabel = '✅ Ready';
          statusStyle = 'ready';
        } else if (activeRepairs.length > 0) {
          statusCategory = 'in_progress';
          statusLabel = '⏳ In Progress';
          statusStyle = 'in_progress';
        }

        return {
          ...c,
          custRepairs,
          activeRepairs,
          activeCount: activeRepairs.length,
          totalCount: custRepairs.length || (c.device_model ? 1 : 0),
          totalEstimated: totalEst,
          totalAdvance: totalAdv,
          balanceDue,
          isInquiry,
          hasReady,
          hasOverdue,
          statusCategory,
          statusLabel,
          statusStyle,
          primaryRepair,
          displayDevice,
          displayIssue,
          displayImei,
          displayDueDate,
        };
      });

      setCustomers(unified);
    } catch (err) {
      console.error('Failed to load customers:', err);
      Alert.alert('Error', 'Failed to load customer records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter and search logic
  const filteredCustomers = useMemo(() => {
    const q = (search || '').toLowerCase().trim();

    return customers.filter((item) => {
      // 1. Chip Filter
      if (activeFilter === 'in_progress' && item.statusCategory !== 'in_progress') {
        return false;
      }
      if (activeFilter === 'ready' && !item.hasReady) {
        return false;
      }
      if (activeFilter === 'overdue' && !item.hasOverdue) {
        return false;
      }
      if (activeFilter === 'khata_due' && item.balanceDue <= 0) {
        return false;
      }
      if (activeFilter === 'inquiry' && !item.isInquiry) {
        return false;
      }

      // 2. Query Search
      if (q) {
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const phoneMatch = (item.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const modelMatch = (item.displayDevice || '').toLowerCase().includes(q);
        const imeiMatch = (item.displayImei || '').includes(q);
        const issueMatch = (item.displayIssue || '').toLowerCase().includes(q);

        return nameMatch || phoneMatch || modelMatch || imeiMatch || issueMatch;
      }

      return true;
    });
  }, [customers, search, activeFilter]);

  // Compute counts for filter pills
  const counts = useMemo(() => {
    let inProgress = 0;
    let ready = 0;
    let overdue = 0;
    let khata = 0;
    let inquiry = 0;

    customers.forEach((c) => {
      if (c.statusCategory === 'in_progress') inProgress++;
      if (c.hasReady) ready++;
      if (c.hasOverdue) overdue++;
      if (c.balanceDue > 0) khata++;
      if (c.isInquiry) inquiry++;
    });

    return {
      all: customers.length,
      in_progress: inProgress,
      ready,
      overdue,
      khata_due: khata,
      inquiry,
    };
  }, [customers]);

  const handleCall = (phone) => {
    if (!phone) {
      Alert.alert('No Phone', 'No mobile number recorded for this customer.');
      return;
    }
    const clean = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${clean}`).catch(() => {
      Alert.alert('Error', 'Unable to make phone call.');
    });
  };

  const handleWhatsApp = (name, phone, device) => {
    if (!phone) {
      Alert.alert('No Phone', 'No mobile number recorded for this customer.');
      return;
    }
    const cleanDigits = phone.replace(/\D/g, '');
    const finalPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const msg = encodeURIComponent(
      `Hello ${name || 'Customer'}, greetings from CELLVENTORY regarding your ${device || 'device'}.`
    );
    Linking.openURL(`https://wa.me/${finalPhone}?text=${msg}`).catch(() => {
      Alert.alert('Error', 'Unable to open WhatsApp.');
    });
  };

  const handleConvertInquiry = (item) => {
    const rawCost =
      item.estimated_cost && Number(item.estimated_cost) > 0
        ? String(item.estimated_cost)
        : item.totalEstimated && Number(item.totalEstimated) > 0
        ? String(item.totalEstimated)
        : item.estimated_cost ? String(item.estimated_cost) : '';
    const rawAdv =
      item.advance_paid && Number(item.advance_paid) > 0
        ? String(item.advance_paid)
        : item.totalAdvance && Number(item.totalAdvance) > 0
        ? String(item.totalAdvance)
        : item.advance_paid ? String(item.advance_paid) : '';

    navigation.navigate('AddCustomerScreen', {
      convertInquiryId: item.id,
      customer: item,
      initialValues: {
        convertInquiryId: item.id,
        phone: item.phone || '',
        name: item.name || '',
        device_model: item.displayDevice && item.displayDevice !== 'Device Inquiry' && item.displayDevice !== 'Device' ? item.displayDevice : '',
        imei: item.displayImei || '',
        notes: item.displayIssue || '',
        email: item.email || '',
        address: item.address || '',
        estimated_cost: rawCost,
        advance_paid: rawAdv,
        delivery_date: item.displayDueDate || '',
        purpose: 'Repair',
      },
    });
  };

  const handleQuickDeliver = (customer) => {
    const repair = customer.primaryRepair;
    if (!repair) return;

    Alert.alert(
      'Deliver Device',
      `Mark ${repair.device_model} as Delivered for ${customer.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deliver & Settle',
          style: 'default',
          onPress: async () => {
            try {
              await updateRepairStatus(repair.id, 'Delivered');
              loadData();
              Alert.alert('✅ Done', `${repair.device_model} marked as Delivered.`);
            } catch (e) {
              Alert.alert('Error', 'Failed to update repair status.');
            }
          },
        },
      ]
    );
  };

  const handleScanCode = (scannedCode) => {
    setScannerVisible(false);
    if (scannedCode) {
      setSearch(scannedCode.trim());
    }
  };

  // Render a Single Clean Customer Card
  const renderCustomerCard = ({ item }) => {
    const isDeliverable = item.hasReady && item.primaryRepair;
    const cleanPh = (item.phone || '').replace(/[^0-9]/g, '');
    const hasPhone = cleanPh.length >= 6;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('CustomerDetailsScreen', { customer: item })}
      >
        {/* Top Header: Customer Identity & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase() || 'C'}</Text>
          </View>
          <View style={styles.customerInfoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.customerName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.activeCount > 1 && (
                <View style={styles.multiDevicePill}>
                  <Text style={styles.multiDevicePillText}>{item.activeCount} Devices</Text>
                </View>
              )}
            </View>
            <Text style={styles.customerPhone} numberOfLines={1}>
              {item.phone || 'No phone number'}
            </Text>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, styles[`badge_${item.statusStyle}`]]}>
            <Text style={[styles.statusBadgeText, styles[`badgeText_${item.statusStyle}`]]}>
              {item.statusLabel}
            </Text>
          </View>
        </View>

        {/* Middle Section: Device, Issue & Due Summary */}
        <View style={styles.cardBody}>
          {item.displayDevice ? (
            <View style={styles.deviceRow}>
              <Feather
                name={item.isInquiry ? 'help-circle' : 'smartphone'}
                size={13}
                color={item.isInquiry ? '#B45309' : colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.deviceText} numberOfLines={1}>
                {item.displayDevice}
                {item.displayIssue ? ` • ${item.displayIssue}` : ''}
              </Text>
            </View>
          ) : null}

          {/* Metadata Row: Due Date & Khata Balance */}
          <View style={styles.metaRow}>
            {item.displayDueDate ? (
              <View style={styles.metaItem}>
                <Feather
                  name="calendar"
                  size={11}
                  color={item.hasOverdue ? '#DC2626' : colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.metaText, item.hasOverdue && styles.metaTextOverdue]}>
                  {item.hasOverdue ? `Overdue (${item.displayDueDate})` : `Due: ${item.displayDueDate}`}
                </Text>
              </View>
            ) : null}

            {item.displayImei ? (
              <View style={styles.metaItem}>
                <Feather name="hash" size={11} color={colors.textMuted} style={{ marginRight: 3 }} />
                <Text style={styles.metaText}>{formatIMEI(item.displayImei)}</Text>
              </View>
            ) : null}

            {item.balanceDue > 0 ? (
              <View style={styles.khataDueBadge}>
                <Text style={styles.khataDueText}>Due: ₹{item.balanceDue}</Text>
              </View>
            ) : item.totalEstimated > 0 ? (
              <View style={styles.khataPaidBadge}>
                <Text style={styles.khataPaidText}>Paid</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bottom Actions: Call, WhatsApp & Quick Deliver */}
        <View style={styles.cardActions}>
          {hasPhone ? (
            <>
              <TouchableOpacity
                style={styles.actionBtnCall}
                onPress={() => handleCall(item.phone)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="phone" size={13} color={colors.primary} style={{ marginRight: 5 }} />
                <Text style={styles.actionBtnCallText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnWa}
                onPress={() => handleWhatsApp(item.name, item.phone, item.displayDevice)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <FontAwesome5 name="whatsapp" size={14} color="#059669" style={{ marginRight: 5 }} />
                <Text style={styles.actionBtnWaText}>WhatsApp</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.actionBtnAddPhone}
              onPress={() => navigation.navigate('EditCustomerScreen', { customer: item })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="phone" size={12} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnAddPhoneText}>+ Add Phone</Text>
            </TouchableOpacity>
          )}

          {item.isInquiry ? (
            <TouchableOpacity
              style={styles.actionBtnConvert}
              onPress={() => handleConvertInquiry(item)}
              activeOpacity={0.8}
            >
              <Feather name="arrow-right-circle" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnConvertText}>Convert</Text>
            </TouchableOpacity>
          ) : isDeliverable ? (
            <TouchableOpacity
              style={styles.actionBtnDeliver}
              onPress={() => handleQuickDeliver(item)}
              activeOpacity={0.8}
            >
              <Feather name="check-circle" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnDeliverText}>Deliver</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.actionBtnDetails}
            onPress={() => navigation.navigate('CustomerDetailsScreen', { customer: item })}
          >
            <Feather name="chevron-right" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Input Bar with Integrated Camera Scanner */}
      <View style={styles.searchBarContainer}>
        <Feather name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, device, IMEI..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
            <Feather name="x-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => setScannerVisible(true)}
          accessibilityLabel="Scan Barcode or IMEI"
        >
          <Feather name="camera" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Horizontal Status Filter Chips */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_CHIPS.map((chip) => {
            const isSelected = activeFilter === chip.id;
            const count = counts[chip.id] !== undefined ? counts[chip.id] : 0;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setActiveFilter(chip.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {chip.label}
                </Text>
                <View
                  style={[
                    styles.filterCountBadge,
                    isSelected && styles.filterCountBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      isSelected && styles.filterCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Customer Directory List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => `cust-${item.id}`}
          renderItem={renderCustomerCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="users" size={44} color={colors.textMuted} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyTitle}>No Customers Found</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? 'No records match your search query.'
                  : activeFilter !== 'all'
                  ? 'No customers match the selected filter.'
                  : 'Tap "+" below to record your first customer or repair.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Global + Customer Entry Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setQuickEntryVisible(true)}
        activeOpacity={0.85}
        accessibilityLabel="Add Customer Entry"
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Global Quick Customer Entry Modal */}
      <QuickCustomerEntryModal
        visible={quickEntryVisible}
        onClose={() => setQuickEntryVisible(false)}
        onSuccess={() => loadData()}
      />

      {/* Camera Barcode / IMEI Scanner */}
      <IMEIScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScanCode}
      />
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
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 46,
    ...shadows.card,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    height: '100%',
  },
  clearSearchBtn: {
    padding: 6,
  },
  scanBtn: {
    padding: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    marginLeft: 6,
  },
  filterWrapper: {
    marginBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: 6,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterCountBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  filterCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  filterCountTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 85,
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
    marginBottom: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  customerInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  multiDevicePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 99,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  multiDevicePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  customerPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badge_in_progress: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  badgeText_in_progress: {
    color: '#B45309',
  },
  badge_ready: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  badgeText_ready: {
    color: '#065F46',
  },
  badge_overdue: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  badgeText_overdue: {
    color: '#DC2626',
  },
  badge_inquiry: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  badgeText_inquiry: {
    color: '#B45309',
  },
  badge_settled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  badgeText_settled: {
    color: '#475569',
  },
  cardBody: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  deviceText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metaTextOverdue: {
    color: '#DC2626',
    fontWeight: '700',
  },
  khataDueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  khataDueText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  khataPaidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  khataPaidText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnAddPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: borderRadius.sm,
  },
  actionBtnAddPhoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  actionBtnCall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: borderRadius.sm,
  },
  actionBtnCallText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  actionBtnWa: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: borderRadius.sm,
  },
  actionBtnWaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  actionBtnDeliver: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: borderRadius.sm,
    ...shadows.card,
  },
  actionBtnDeliverText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnConvert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: borderRadius.sm,
    ...shadows.card,
  },
  actionBtnConvertText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnDetails: {
    marginLeft: 'auto',
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
});
