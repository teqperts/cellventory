import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { borderRadius, colors, shadows } from '../constants/theme';
import {
  getDeliveriesDueToday,
  getHomeDashboardStats,
  getNextActionSuggestions,
  lookupIMEI,
  searchItems,
  updateCustomerStatus,
} from '../database/Helper';
import { formatIMEI } from '../utils/imei';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ dueToday: 0, inProgress: 0, lowStock: 0 });
  const [todayDeliveries, setTodayDeliveries] = useState([]);
  const [nextActions, setNextActions] = useState({
    pendingInquiries: [],
    criticalStock: [],
    overdueRepairs: [],
  });
  const [scannerVisible, setScannerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [statsData, deliveries, actions] = await Promise.all([
        getHomeDashboardStats(),
        getDeliveriesDueToday(),
        getNextActionSuggestions(),
      ]);
      setStats(statsData || { dueToday: 0, inProgress: 0, lowStock: 0 });
      setTodayDeliveries(deliveries || []);
      setNextActions(
        actions || {
          pendingInquiries: [],
          criticalStock: [],
          overdueRepairs: [],
        }
      );
    } catch (err) {
      console.error('Fetch dashboard data error:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
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

  const cleanPhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
  };

  const handleCall = (phone) => {
    if (!phone) {
      Alert.alert('No Phone', 'No contact phone number recorded for this customer.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Unable to Dial', 'Could not open phone dialer on this device.');
    });
  };

  const handleWhatsAppReady = (customer) => {
    const raw = cleanPhone(customer.phone);
    if (!raw) {
      Alert.alert('No Phone', 'No contact phone number recorded.');
      return;
    }
    const msg = encodeURIComponent(
      `Hello ${customer.name}, your ${
        customer.device_model || 'device'
      } is ready for pickup at CELLVENTORY! Please visit our shop to collect it.`
    );
    Linking.openURL(`https://wa.me/${raw}?text=${msg}`).catch(() => {
      Alert.alert('Unable to open WhatsApp', 'Please ensure WhatsApp is installed.');
    });
  };

  const handleWhatsAppInquiryFollowUp = (customer) => {
    const raw = cleanPhone(customer.phone);
    if (!raw) {
      Alert.alert('No Phone', 'No contact phone number recorded.');
      return;
    }
    const msg = encodeURIComponent(
      `Hello ${customer.name}, following up from CELLVENTORY regarding your inquiry about ${
        customer.device_model || 'mobile repair/accessories'
      }. Would you like to proceed or have any questions?`
    );
    Linking.openURL(`https://wa.me/${raw}?text=${msg}`).catch(() => {
      Alert.alert('Unable to open WhatsApp', 'Please ensure WhatsApp is installed.');
    });
  };

  const handleWhatsAppOverdue = (customer) => {
    const raw = cleanPhone(customer.phone);
    if (!raw) {
      Alert.alert('No Phone', 'No contact phone number recorded.');
      return;
    }
    const msg = encodeURIComponent(
      `Hello ${customer.name}, this is CELLVENTORY updating you regarding your ${
        customer.device_model || 'device'
      }. Our technician is currently working on it and will notify you as soon as it is ready.`
    );
    Linking.openURL(`https://wa.me/${raw}?text=${msg}`).catch(() => {
      Alert.alert('Unable to open WhatsApp', 'Please ensure WhatsApp is installed.');
    });
  };

  const handleMarkDelivered = (customer) => {
    Alert.alert(
      '📦 Mark as Delivered',
      `Confirm device handover to ${customer.name} for ${customer.device_model || 'device'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Delivered',
          style: 'default',
          onPress: async () => {
            try {
              await updateCustomerStatus(customer.id, 'Delivered');
              await loadDashboardData();
              Alert.alert('✅ Device Delivered', `${customer.name}'s repair was marked Delivered.`);
            } catch (err) {
              console.error('Update status error:', err);
              Alert.alert('❌ Error', 'Failed to update delivery status.');
            }
          },
        },
      ]
    );
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
        // Brand new device
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

  const renderSearchResultItem = ({ item }) => {
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

  const hasNextActions =
    nextActions.pendingInquiries.length > 0 ||
    nextActions.criticalStock.length > 0 ||
    nextActions.overdueRepairs.length > 0;

  return (
    <View style={styles.container}>
      {/* Top Search Bar & Persistent Controls */}
      <View style={styles.topContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory items, models..."
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
      </View>

      {/* Conditionally Show Live Search Results or Smart Feed */}
      {query.trim().length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSearchResultItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="search" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No Matching Items</Text>
              <Text style={styles.emptySubtitle}>
                Try searching with different keywords, brand name, or part model.
              </Text>
            </View>
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Quick Stat Cards */}
          <View style={styles.statsRow}>
            <StatBox
              label="Due Today"
              value={stats.dueToday}
              icon="truck"
              highlight={stats.dueToday > 0}
              highlightColor="#EA580C"
              highlightBg="#FFF7ED"
              onPress={() => {}}
            />
            <StatBox
              label="In Progress"
              value={stats.inProgress}
              icon="tool"
              onPress={() => navigation.navigate('Customers')}
            />
            <StatBox
              label="Low Stock"
              value={stats.lowStock}
              icon="alert-triangle"
              highlight={stats.lowStock > 0}
              highlightColor={colors.lowStock}
              highlightBg={colors.lowStockBg}
              onPress={() => navigation.navigate('Inventory', { filter: 'Low Stock' })}
            />
          </View>

          {/* Smart IMEI Scanner Router Banner */}
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
                Sells inventory, views repair history, or intakes device
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* SECTION 1: Deliveries & Pickups Today */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Feather name="truck" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>
                Deliveries & Pickups Today ({todayDeliveries.length})
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Customers')}>
              <Text style={styles.seeAllText}>View All Clients →</Text>
            </TouchableOpacity>
          </View>

          {todayDeliveries.length > 0 ? (
            todayDeliveries.map((delivery) => {
              const isReady = delivery.status === 'Ready for Delivery';
              return (
                <View key={delivery.id} style={styles.deliveryCard}>
                  <View style={styles.deliveryTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deliveryCustomerName}>{delivery.name}</Text>
                      <Text style={styles.deliverySub}>
                        {delivery.device_model || 'Device'} • {delivery.phone}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        isReady ? styles.statusPillReady : styles.statusPillProgress,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isReady ? styles.statusPillTextReady : styles.statusPillTextProgress,
                        ]}
                      >
                        {isReady ? 'Ready for Pickup' : 'Due Today'}
                      </Text>
                    </View>
                  </View>

                  {delivery.notes ? (
                    <Text style={styles.deliveryNotes} numberOfLines={2}>
                      Note: {delivery.notes}
                    </Text>
                  ) : null}

                  {/* 1-Tap Action Buttons */}
                  <View style={styles.deliveryActionRow}>
                    <TouchableOpacity
                      style={styles.btnActionWhatsApp}
                      activeOpacity={0.8}
                      onPress={() => handleWhatsAppReady(delivery)}
                    >
                      <FontAwesome5 name="whatsapp" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.btnActionText}>Notify Ready</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnActionCall}
                      activeOpacity={0.8}
                      onPress={() => handleCall(delivery.phone)}
                    >
                      <Ionicons name="call" size={14} color={colors.textPrimary} style={{ marginRight: 5 }} />
                      <Text style={styles.btnActionTextCall}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.btnActionDeliver}
                      activeOpacity={0.8}
                      onPress={() => handleMarkDelivered(delivery)}
                    >
                      <Feather name="check" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.btnActionText}>Delivered</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyDeliveryBox}>
              <Feather name="check-circle" size={26} color="#10B981" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyDeliveryTitle}>No deliveries scheduled for today 🎉</Text>
              <Text style={styles.emptyDeliverySub}>
                All customer devices are either delivered or scheduled for future dates.
              </Text>
            </View>
          )}

          {/* SECTION 2: Next Actions & Suggestions */}
          <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
            <View style={styles.sectionTitleRow}>
              <Feather name="zap" size={16} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Next Actions & Suggestions</Text>
            </View>
          </View>

          {hasNextActions ? (
            <View style={styles.suggestionsContainer}>
              {/* 1. Overdue Repairs */}
              {nextActions.overdueRepairs.map((repair) => (
                <View key={`overdue-${repair.id}`} style={styles.actionCardOverdue}>
                  <View style={styles.actionCardHeader}>
                    <View style={styles.actionIconWrapOverdue}>
                      <Feather name="clock" size={14} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.actionCardTitle}>Overdue Repair: {repair.name}</Text>
                      <Text style={styles.actionCardSub}>
                        {repair.device_model || 'Device'} • Promised on {repair.delivery_date}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actionCardBtnRow}>
                    <TouchableOpacity
                      style={styles.actionBtnSecondary}
                      onPress={() => handleWhatsAppOverdue(repair)}
                      activeOpacity={0.8}
                    >
                      <FontAwesome5 name="whatsapp" size={12} color="#16A34A" style={{ marginRight: 5 }} />
                      <Text style={styles.actionBtnSecondaryText}>WhatsApp Update</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() => navigation.navigate('CustomerDetailsScreen', { customer: repair })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnPrimaryText}>View Job →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* 2. Pending Inquiry Follow-ups */}
              {nextActions.pendingInquiries.map((inquiry) => (
                <View key={`inquiry-${inquiry.id}`} style={styles.actionCardInquiry}>
                  <View style={styles.actionCardHeader}>
                    <View style={styles.actionIconWrapInquiry}>
                      <Feather name="message-square" size={14} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.actionCardTitle}>Inquiry Follow-up: {inquiry.name}</Text>
                      <Text style={styles.actionCardSub}>
                        {inquiry.device_model ? `${inquiry.device_model} • ` : ''}
                        {inquiry.notes ? `"${inquiry.notes}"` : 'Pending quote / decision'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actionCardBtnRow}>
                    <TouchableOpacity
                      style={styles.actionBtnSecondary}
                      onPress={() => handleWhatsAppInquiryFollowUp(inquiry)}
                      activeOpacity={0.8}
                    >
                      <FontAwesome5 name="whatsapp" size={12} color="#16A34A" style={{ marginRight: 5 }} />
                      <Text style={styles.actionBtnSecondaryText}>1-Tap Follow-Up</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() => navigation.navigate('CustomerDetailsScreen', { customer: inquiry })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnPrimaryText}>Convert →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* 3. Critical Low Stock Items */}
              {nextActions.criticalStock.map((stock) => (
                <View key={`stock-${stock.id}`} style={styles.actionCardStock}>
                  <View style={styles.actionCardHeader}>
                    <View style={styles.actionIconWrapStock}>
                      <Feather name="alert-triangle" size={14} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.actionCardTitle}>Reorder Stock: {stock.name}</Text>
                      <Text style={styles.actionCardSub}>
                        Only {stock.quantity} unit(s) left • {stock.brand || 'Device Part'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actionCardBtnRow}>
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() => navigation.navigate('ItemDetailsScreen', { item: stock })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnPrimaryText}>View & Restock →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyDeliveryBox}>
              <Feather name="smile" size={26} color="#3B82F6" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyDeliveryTitle}>Everything Caught Up!</Text>
              <Text style={styles.emptyDeliverySub}>
                No pending customer follow-ups or critical low-stock items at this moment.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <IMEIScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScanIMEI}
      />
    </View>
  );
}

function StatBox({
  label,
  value,
  icon,
  onPress,
  highlight,
  highlightColor,
  highlightBg,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.statBox,
        highlight && {
          backgroundColor: highlightBg || colors.lowStockBg,
          borderColor: highlightColor || '#FDE68A',
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.statIconWrap}>
        <Feather
          name={icon}
          size={16}
          color={highlight ? highlightColor || colors.lowStock : colors.primary}
        />
      </View>
      <Text
        style={[
          styles.statValue,
          highlight && { color: highlightColor || colors.lowStock },
        ]}
      >
        {value}
      </Text>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 60,
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
    marginBottom: 10,
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
  scanSearchBtn: {
    padding: 6,
    marginLeft: 2,
  },
  resultCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
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
  scannerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 14,
    ...shadows.card,
  },
  scannerBannerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.teqperts,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 6,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
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
  deliveryCard: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: borderRadius.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  deliveryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  deliveryCustomerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deliverySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusPillReady: {
    backgroundColor: '#DCFCE7',
  },
  statusPillProgress: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillTextReady: {
    color: '#15803D',
  },
  statusPillTextProgress: {
    color: '#B45309',
  },
  deliveryNotes: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  deliveryActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  btnActionWhatsApp: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
  },
  btnActionCall: {
    flex: 0.7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
  },
  btnActionDeliver: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
  },
  btnActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnActionTextCall: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyDeliveryBox: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...shadows.card,
  },
  emptyDeliveryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  emptyDeliverySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  suggestionsContainer: {
    gap: 8,
  },
  actionCardInquiry: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: 12,
    ...shadows.card,
  },
  actionCardOverdue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: 12,
    ...shadows.card,
  },
  actionCardStock: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: 12,
    ...shadows.card,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  actionIconWrapInquiry: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionIconWrapOverdue: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionIconWrapStock: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionCardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionCardBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
  },
  actionBtnSecondaryText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
});
