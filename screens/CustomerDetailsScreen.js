// screens/CustomerDetailsScreen.js
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AddDeviceModal from '../components/AddDeviceModal';
import { borderRadius, colors, shadows } from '../constants/theme';
import { useShop } from '../context/ShopContext';
import {
  deleteCustomer,
  deleteRepair,
  getCustomerById,
  getRepairsByCustomerId,
  updateCustomer,
  updateRepairStatus,
} from '../database/Helper';
import { formatIMEI } from '../utils/imei';

export default function CustomerDetailsScreen({ route }) {
  const initialCustomer = route.params?.customer;
  const incomingParam = route.params?.customer;
  const [customer, setCustomer] = useState(incomingParam);
  const [repairs, setRepairs] = useState([]);
  const [loadingRepairs, setLoadingRepairs] = useState(false);
  const [addDeviceVisible, setAddDeviceVisible] = useState(false);

  // Edit Customer Modal state
  const [editCustomerVisible, setEditCustomerVisible] = useState(false);
  const [editName, setEditName] = useState(incomingParam?.name || '');
  const [editPhone, setEditPhone] = useState(incomingParam?.phone || '');
  const [savingCustomer, setSavingCustomer] = useState(false);

  const { shopName } = useShop();
  const navigation = useNavigation();

  // Keep state synced whenever a new customer is navigated to
  useEffect(() => {
    if (route.params?.customer) {
      setCustomer(route.params.customer);
      setEditName(route.params.customer.name || '');
      setEditPhone(route.params.customer.phone || '');
    }
  }, [route.params?.customer]);

  const loadCustomerAndRepairs = useCallback(async () => {
    const custId = route.params?.customer?.customer_id || route.params?.customer?.id || customer?.customer_id || customer?.id;
    if (!custId) {
      if (route.params?.customer) setCustomer(route.params.customer);
      return;
    }
    try {
      setLoadingRepairs(true);
      const [latestCust, deviceRepairs] = await Promise.all([
        getCustomerById(custId),
        getRepairsByCustomerId(custId),
      ]);
      if (latestCust) {
        setCustomer(latestCust);
        setEditName(latestCust.name || '');
        setEditPhone(latestCust.phone || '');
      } else if (route.params?.customer) {
        setCustomer(route.params.customer);
      }

      // If repairs exist, set them; if not, create a fallback virtual repair from customer's legacy fields if present
      if (deviceRepairs && deviceRepairs.length > 0) {
        setRepairs(deviceRepairs);
      } else {
        const fallbackSource = latestCust || route.params?.customer || customer;
        if (fallbackSource?.device_model || fallbackSource?.imei || fallbackSource?.purpose || fallbackSource?.notes) {
          const isCustInquiry =
            (fallbackSource.purpose && fallbackSource.purpose.toLowerCase().includes('inquiry')) ||
            fallbackSource.status === 'Inquiry';

          setRepairs([
            {
              id: fallbackSource.id || custId,
              customer_id: custId,
              device_model: fallbackSource.device_model || (isCustInquiry ? 'Device Inquiry' : 'Device'),
              imei: fallbackSource.imei || '',
              issue: fallbackSource.notes || '',
              purpose: fallbackSource.purpose || (isCustInquiry ? 'Inquiry / Quotation' : 'Repair / Service'),
              status: isCustInquiry ? 'Inquiry' : (fallbackSource.status || 'In Progress'),
              delivery_date: fallbackSource.delivery_date || '',
              estimated_cost: fallbackSource.estimated_cost || 0,
              advance_paid: fallbackSource.advance_paid || 0,
              notes: fallbackSource.notes || '',
              isLegacyFallback: true,
              isInquiry: isCustInquiry,
            },
          ]);
        } else {
          setRepairs([]);
        }
      }
    } catch (e) {
      console.error('Error loading customer repairs:', e);
      if (route.params?.customer) setCustomer(route.params.customer);
    } finally {
      setLoadingRepairs(false);
    }
  }, [route.params?.customer, customer?.id]);

  useFocusEffect(
    useCallback(() => {
      loadCustomerAndRepairs();
    }, [loadCustomerAndRepairs])
  );

  if (!customer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No customer record selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Aggregate Khata Calculations across all repairs (excluding inquiries)
  let totalEstimated = 0;
  let totalAdvance = 0;
  let activeCount = 0;
  repairs.forEach((r) => {
    const isRInquiry =
      r.isInquiry ||
      r.status === 'Inquiry' ||
      (r.purpose && r.purpose.toLowerCase().includes('inquiry'));

    if (!isRInquiry) {
      const est = parseFloat(r.estimated_cost) || 0;
      const adv = parseFloat(r.advance_paid) || 0;
      totalEstimated += est;
      totalAdvance += adv;
      if (r.status !== 'Delivered') {
        activeCount++;
      }
    }
  });
  const totalBalanceDue = Math.max(0, totalEstimated - totalAdvance);

  const getCleanPhone = (phoneStr) => {
    if (!phoneStr) return '';
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  const handleCall = () => {
    if (!customer.phone) return;
    Linking.openURL(`tel:${customer.phone}`).catch(() => {
      Alert.alert('Unable to Dial', 'Could not open phone dialer.');
    });
  };

  const handleWhatsAppCustomer = () => {
    const clean = getCleanPhone(customer.phone);
    if (!clean) {
      Alert.alert('No Phone', 'No mobile number available for WhatsApp.');
      return;
    }
    const msg = encodeURIComponent(`Hello ${customer.name}, greetings from ${shopName || 'Cellventory'}!`);
    Linking.openURL(`https://wa.me/${clean}?text=${msg}`).catch(() => {
      Alert.alert('Unable to open WhatsApp', 'Please ensure WhatsApp is installed.');
    });
  };

  const handleUpdateDeviceStatus = async (repair, newStatus) => {
    const est = parseFloat(repair.estimated_cost) || 0;
    const adv = parseFloat(repair.advance_paid) || 0;
    const bal = Math.max(0, est - adv);

    if (newStatus === 'Delivered' && bal > 0) {
      Alert.alert(
        '💰 Collect Remaining Balance',
        `Remaining balance for ${repair.device_model} is ₹${bal}. Confirm device handover and payment collection?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark Delivered & Collected',
            onPress: async () => {
              try {
                await updateRepairStatus(repair.id, newStatus);
                loadCustomerAndRepairs();
                Alert.alert('✅ Handover Complete', `${repair.device_model} marked as Delivered.`);
              } catch (err) {
                Alert.alert('❌ Error', 'Failed to update device status.');
              }
            },
          },
        ]
      );
      return;
    }

    try {
      await updateRepairStatus(repair.id, newStatus);
      loadCustomerAndRepairs();
      Alert.alert('✅ Status Updated', `${repair.device_model} marked as "${newStatus}".`);
    } catch (err) {
      console.error('Update status error:', err);
      Alert.alert('❌ Error', 'Failed to update device status.');
    }
  };

  const handleSendJobSheetWhatsApp = (repair) => {
    const clean = getCleanPhone(customer.phone);
    if (!clean) {
      Alert.alert('No Phone', 'No mobile number available for WhatsApp.');
      return;
    }

    const est = parseFloat(repair.estimated_cost) || 0;
    const adv = parseFloat(repair.advance_paid) || 0;
    const bal = Math.max(0, est - adv);

    const lines = [
      `📱 *REPAIR ESTIMATE & JOB SHEET*`,
      `🏪 *${shopName || 'CELLVENTORY by teqperts'}*`,
      `--------------------------------`,
      `👤 *Customer:* ${customer.name}`,
      `📞 *Phone:* ${customer.phone}`,
      `📱 *Device:* ${repair.device_model}`,
      repair.imei ? `🔢 *IMEI:* ${formatIMEI(repair.imei)}` : null,
      repair.issue ? `📝 *Reported Issue:* ${repair.issue}` : null,
      repair.delivery_date ? `📅 *Promised Date:* ${repair.delivery_date}` : null,
      `--------------------------------`,
      est > 0 ? `💰 *Est. Amount:* ₹${est}` : null,
      adv > 0 ? `💵 *Advance Paid:* ₹${adv}` : null,
      bal > 0
        ? `⚠️ *Balance Due on Pickup:* ₹${bal}`
        : est > 0
        ? `✅ *Balance:* Fully Paid`
        : null,
      `🔄 *Status:* ${repair.status || 'In Progress'}`,
      `--------------------------------`,
      `Thank you for trusting ${shopName || 'our shop'}! 🙏`,
    ].filter(Boolean);

    const msg = encodeURIComponent(lines.join('\n'));
    Linking.openURL(`https://wa.me/${clean}?text=${msg}`).catch(() => {
      Alert.alert('Unable to open WhatsApp', 'Please ensure WhatsApp is installed.');
    });
  };

  const handleDeleteRepair = (repair) => {
    Alert.alert(
      'Delete Repair Record',
      `Are you sure you want to delete the repair record for ${repair.device_model}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRepair(repair.id);
              loadCustomerAndRepairs();
              Alert.alert('Deleted', 'Repair record removed.');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete repair.');
            }
          },
        },
      ]
    );
  };

  const handleSaveCustomerProfile = async () => {
    if (!editName.trim() || !editPhone.trim()) {
      Alert.alert('Required', 'Name and Phone Number are required.');
      return;
    }
    try {
      setSavingCustomer(true);
      await updateCustomer(customer.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        purpose: customer.purpose || 'Repair / Service',
      });
      setCustomer((prev) => ({ ...prev, name: editName.trim(), phone: editPhone.trim() }));
      setEditCustomerVisible(false);
      Alert.alert('✅ Updated', 'Customer profile updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update customer.');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleDeleteCustomer = () => {
    Alert.alert(
      'Delete Customer',
      `Delete customer ${customer.name} and all their linked repair orders? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Customer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomer(customer.id);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete customer.');
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = async (text, label) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied to clipboard!`);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          Customer Profile
        </Text>
        <TouchableOpacity
          style={styles.deleteNavBtn}
          onPress={handleDeleteCustomer}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="trash-2" size={19} color={colors.outOfStock} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Customer Identity Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{customer.name?.charAt(0).toUpperCase() || 'C'}</Text>
            </View>
            <View style={styles.heroInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.customerName}>{customer.name}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditName(customer.name);
                    setEditPhone(customer.phone);
                    setEditCustomerVisible(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="edit-2" size={15} color={colors.primary} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
              <Text style={styles.customerPhone}>{customer.phone}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.deviceCountBadge}>
                  <Feather name="smartphone" size={11} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.deviceCountText}>
                    {repairs.length} {repairs.length === 1 ? 'Device' : 'Devices'} Registered
                  </Text>
                </View>
                {((customer.purpose && customer.purpose.toLowerCase().includes('inquiry')) || customer.status === 'Inquiry') && (
                  <View style={styles.inquiryBadge}>
                    <Feather name="help-circle" size={11} color="#B45309" style={{ marginRight: 4 }} />
                    <Text style={styles.inquiryBadgeText}>Inquiry / Quote</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Quick Communication Buttons */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickCallBtn} onPress={handleCall} activeOpacity={0.8}>
              <Feather name="phone-call" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.quickBtnText}>Call Client</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickWaBtn} onPress={handleWhatsAppCustomer} activeOpacity={0.8}>
              <FontAwesome5 name="whatsapp" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.quickBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Aggregate Khata Summary Card */}
        <View style={styles.khataCard}>
          <View style={styles.khataHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="book-open" size={15} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.khataTitle}>Customer Khata & Billing</Text>
            </View>
            {activeCount > 0 && (
              <View style={styles.activeJobsPill}>
                <Text style={styles.activeJobsText}>{activeCount} Active</Text>
              </View>
            )}
          </View>

          <View style={styles.khataGrid}>
            <View style={styles.khataCol}>
              <Text style={styles.khataLabel}>Total Billed</Text>
              <Text style={styles.khataValue}>₹{totalEstimated}</Text>
            </View>
            <View style={styles.khataDivider} />
            <View style={styles.khataCol}>
              <Text style={styles.khataLabel}>Advance Paid</Text>
              <Text style={[styles.khataValue, { color: '#059669' }]}>₹{totalAdvance}</Text>
            </View>
            <View style={styles.khataDivider} />
            <View style={styles.khataCol}>
              <Text style={styles.khataLabel}>Balance Due</Text>
              <Text
                style={[
                  styles.khataValue,
                  { color: totalBalanceDue > 0 ? '#DC2626' : '#059669' },
                ]}
              >
                ₹{totalBalanceDue}
              </Text>
            </View>
          </View>
        </View>

        {/* Devices & Repairs Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Devices & Repair Orders</Text>
            <Text style={styles.sectionSubtitle}>
              Physical hardware submitted for service
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addDeviceBtn}
            onPress={() => setAddDeviceVisible(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addDeviceBtnText}>Add Device</Text>
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {loadingRepairs ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : repairs.length === 0 ? (
          <View style={styles.emptyRepairsCard}>
            <Feather name="inbox" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyRepairsTitle}>No Devices Registered</Text>
            <Text style={styles.emptyRepairsSub}>
              Tap "+ Add Device" above to intake a phone or gadget for this customer.
            </Text>
          </View>
        ) : (
          repairs.map((repair, idx) => {
            const isInquiryItem =
              repair.isInquiry ||
              repair.status === 'Inquiry' ||
              (repair.purpose && repair.purpose.toLowerCase().includes('inquiry'));
            const isDelivered = repair.status === 'Delivered';
            const isReady = repair.status === 'Ready for Delivery';
            const isOverdue =
              repair.delivery_date &&
              repair.delivery_date < todayStr &&
              repair.delivery_date !== '' &&
              !isDelivered &&
              !isInquiryItem;

            const rEst = parseFloat(repair.estimated_cost) || 0;
            const rAdv = parseFloat(repair.advance_paid) || 0;
            const rBal = Math.max(0, rEst - rAdv);

            return (
              <View key={repair.id ? `repair-${repair.id}` : `idx-${idx}`} style={styles.deviceCard}>
                {/* Device Header */}
                <View style={styles.deviceCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                    <View style={styles.deviceIconCircle}>
                      <Feather name="smartphone" size={16} color={colors.primary} />
                    </View>
                    <View style={{ marginLeft: 10, flexShrink: 1 }}>
                      <Text style={styles.deviceModelText} numberOfLines={1}>
                        {repair.device_model}
                      </Text>
                      {repair.purpose && (
                        <Text style={styles.devicePurposeText}>{repair.purpose}</Text>
                      )}
                    </View>
                  </View>

                  {/* Status Pill */}
                  <View
                    style={[
                      styles.deviceStatusPill,
                      isInquiryItem
                        ? styles.pillInquiry
                        : isDelivered
                        ? styles.pillDelivered
                        : isReady
                        ? styles.pillReady
                        : styles.pillInProgress,
                    ]}
                  >
                    <Text
                      style={[
                        styles.deviceStatusText,
                        isInquiryItem
                          ? styles.textInquiry
                          : isDelivered
                          ? styles.textDelivered
                          : isReady
                          ? styles.textReady
                          : styles.textInProgress,
                      ]}
                    >
                      {isInquiryItem
                        ? '💡 Inquiry / Quote'
                        : isDelivered
                        ? '✓ Delivered'
                        : isReady
                        ? '✅ Ready'
                        : '⏳ In Progress'}
                    </Text>
                  </View>
                </View>

                {/* Hardware IMEI Row */}
                {repair.imei ? (
                  <View style={styles.deviceDetailRow}>
                    <Text style={styles.detailLabel}>IMEI:</Text>
                    <Text style={styles.detailValue}>{formatIMEI(repair.imei)}</Text>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(repair.imei, 'IMEI')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginLeft: 6 }}
                    >
                      <Feather name="copy" size={12} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Problem / Fault */}
                {repair.issue ? (
                  <View style={styles.deviceDetailRow}>
                    <Text style={styles.detailLabel}>Fault:</Text>
                    <Text style={[styles.detailValue, { flex: 1 }]}>{repair.issue}</Text>
                  </View>
                ) : null}

                {/* Promised Delivery Date */}
                {repair.delivery_date ? (
                  <View style={styles.deviceDetailRow}>
                    <Text style={styles.detailLabel}>Due Date:</Text>
                    <Text style={[styles.detailValue, isOverdue && { color: '#DC2626', fontWeight: '800' }]}>
                      {repair.delivery_date}
                    </Text>
                    {isOverdue && (
                      <View style={styles.overdueBadge}>
                        <Text style={styles.overdueBadgeText}>OVERDUE</Text>
                      </View>
                    )}
                  </View>
                ) : null}

                {/* Financial Khata for this device */}
                {(rEst > 0 || rAdv > 0) && (
                  <View style={styles.deviceKhataRow}>
                    <Text style={styles.deviceKhataText}>
                      {isInquiryItem ? 'Quotation: ' : 'Est: '}
                      <Text style={{ fontWeight: '700' }}>₹{rEst}</Text>
                      {!isInquiryItem && (
                        <>
                          {' '}| Adv: <Text style={{ fontWeight: '700', color: '#059669' }}>₹{rAdv}</Text> | Due:{' '}
                          <Text style={{ fontWeight: '800', color: rBal > 0 ? '#DC2626' : '#059669' }}>₹{rBal}</Text>
                        </>
                      )}
                    </Text>
                  </View>
                )}

                {/* Action Buttons for this Device */}
                <View style={styles.deviceCardActions}>
                  {isInquiryItem ? (
                    <TouchableOpacity
                      style={styles.convertInquiryBtn}
                      onPress={() => {
                        const devModel =
                          repair.device_model &&
                          repair.device_model !== 'Device Inquiry' &&
                          repair.device_model !== 'Device'
                            ? repair.device_model
                            : customer.device_model || '';
                        const imeiVal = repair.imei || customer.imei || '';
                        const notesVal = repair.issue || repair.notes || customer.notes || '';
                        const estCost = repair.estimated_cost ?? customer.estimated_cost ?? '';
                        const advPaid = repair.advance_paid ?? customer.advance_paid ?? '';
                        const delDate = repair.delivery_date || customer.delivery_date || '';

                        navigation.navigate('AddCustomerScreen', {
                          convertInquiryId: customer.id,
                          customer,
                          initialValues: {
                            convertInquiryId: customer.id,
                            phone: customer.phone || '',
                            name: customer.name || '',
                            device_model: devModel,
                            imei: imeiVal,
                            notes: notesVal,
                            email: customer.email || '',
                            address: customer.address || '',
                            estimated_cost: estCost ? String(estCost) : '',
                            advance_paid: advPaid ? String(advPaid) : '',
                            delivery_date: delDate,
                            purpose: 'Repair / Service',
                          },
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Feather name="arrow-right-circle" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.convertInquiryBtnText}>Convert to Active Repair</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      {/* WhatsApp Job Sheet */}
                      <TouchableOpacity
                        style={styles.deviceWaBtn}
                        onPress={() => handleSendJobSheetWhatsApp(repair)}
                        activeOpacity={0.7}
                      >
                        <FontAwesome5 name="whatsapp" size={13} color="#059669" style={{ marginRight: 5 }} />
                        <Text style={styles.deviceWaBtnText}>Job Sheet</Text>
                      </TouchableOpacity>

                      {/* Status Progression */}
                      {!isDelivered ? (
                        isReady ? (
                          <TouchableOpacity
                            style={styles.deviceHandoverBtn}
                            onPress={() => handleUpdateDeviceStatus(repair, 'Delivered')}
                            activeOpacity={0.7}
                          >
                            <Feather name="check-circle" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                            <Text style={styles.deviceHandoverBtnText}>Deliver & Collect</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.deviceReadyBtn}
                            onPress={() => handleUpdateDeviceStatus(repair, 'Ready for Delivery')}
                            activeOpacity={0.7}
                          >
                            <Feather name="bell" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                            <Text style={styles.deviceReadyBtnText}>Mark Ready</Text>
                          </TouchableOpacity>
                        )
                      ) : (
                        <TouchableOpacity
                          style={styles.deviceReopenBtn}
                          onPress={() => handleUpdateDeviceStatus(repair, 'In Progress')}
                          activeOpacity={0.7}
                        >
                          <Feather name="rotate-ccw" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                          <Text style={styles.deviceReopenBtnText}>Reopen</Text>
                        </TouchableOpacity>
                      )}

                      {/* Delete Device */}
                      {!repair.isLegacyFallback && (
                        <TouchableOpacity
                          style={styles.deviceDeleteBtn}
                          onPress={() => handleDeleteRepair(repair)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Feather name="trash-2" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Device Modal */}
      <AddDeviceModal
        visible={addDeviceVisible}
        onClose={() => setAddDeviceVisible(false)}
        customer={customer}
        onSuccess={loadCustomerAndRepairs}
      />

      {/* Edit Customer Profile Modal */}
      <Modal
        visible={editCustomerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setEditCustomerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editDialog}>
            <Text style={styles.editDialogTitle}>Edit Customer</Text>

            <Text style={styles.editLabel}>Customer Name *</Text>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.editLabel}>Mobile Number *</Text>
            <TextInput
              style={styles.editInput}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.editDialogActions}>
              <TouchableOpacity
                style={styles.editCancelBtn}
                onPress={() => setEditCustomerVisible(false)}
              >
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editSaveBtn}
                onPress={handleSaveCustomerProfile}
                disabled={savingCustomer}
              >
                {savingCustomer ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.editSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.header,
  },
  backBtn: {
    padding: 4,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  deleteNavBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    ...shadows.card,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  heroInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  customerPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  deviceCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  deviceCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  quickCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 38,
    borderRadius: borderRadius.md,
  },
  quickWaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    height: 38,
    borderRadius: borderRadius.md,
  },
  quickBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  khataCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    ...shadows.card,
  },
  khataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  khataTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  activeJobsPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  activeJobsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  khataGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
  },
  khataCol: {
    flex: 1,
    alignItems: 'center',
  },
  khataDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  khataLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  khataValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  addDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    ...shadows.card,
  },
  addDeviceBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyRepairsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyRepairsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyRepairsSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  deviceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    ...shadows.card,
  },
  deviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  deviceModelText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  devicePurposeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  deviceStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  pillInProgress: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  pillInquiry: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  pillReady: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  pillDelivered: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  deviceStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textInProgress: {
    color: '#B45309',
  },
  textInquiry: {
    color: '#B45309',
    fontWeight: '800',
  },
  textReady: {
    color: '#065F46',
  },
  textDelivered: {
    color: '#475569',
  },
  inquiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginLeft: 6,
  },
  inquiryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  convertInquiryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: borderRadius.md,
    ...shadows.card,
  },
  convertInquiryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  deviceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    width: 65,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  overdueBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  deviceKhataRow: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
    marginBottom: 10,
  },
  deviceKhataText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deviceCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 8,
  },
  deviceWaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: borderRadius.sm,
  },
  deviceWaBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  deviceReadyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: borderRadius.sm,
  },
  deviceReadyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deviceHandoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: borderRadius.sm,
  },
  deviceHandoverBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deviceReopenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: borderRadius.sm,
  },
  deviceReopenBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deviceDeleteBtn: {
    marginLeft: 'auto',
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  editDialog: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    ...shadows.floating,
  },
  editDialogTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 14,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  editInput: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  editDialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  editCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
  },
  editCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  editSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
  },
  editSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
