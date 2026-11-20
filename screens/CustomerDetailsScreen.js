// screens/CustomerDetailsScreen.js
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, colors, shadows } from '../constants/theme';
import { convertCustomerPurpose, deleteCustomer, getDeviceHistoryByIMEI } from '../database/Helper';
import { formatIMEI } from '../utils/imei';

export default function CustomerDetailsScreen({ route }) {
  const initialCustomer = route.params?.customer;
  const [customer, setCustomer] = useState(initialCustomer);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    if (customer?.imei) {
      getDeviceHistoryByIMEI(customer.imei)
        .then((history) => setDeviceHistory(history || []))
        .catch(() => setDeviceHistory([]));
    }
  }, [customer?.imei]);

  if (!customer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No customer record selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleConvertInquiry = async (newPurpose) => {
    Alert.alert(
      '🔄 Convert Inquiry',
      `Convert this inquiry to "${newPurpose}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert Now',
          onPress: async () => {
            try {
              const updated = await convertCustomerPurpose(customer.id, newPurpose);
              setCustomer(updated);
              Alert.alert('✅ Inquiry Converted', `Customer visit updated to ${newPurpose}.`);
            } catch (err) {
              console.error('Convert inquiry error:', err);
              Alert.alert('❌ Error', 'Failed to convert inquiry.');
            }
          },
        },
      ]
    );
  };

  // Generate initials for avatar (e.g. "Rahul Kumar" -> "RK")
  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Clean phone number for WhatsApp wa.me link
  const getCleanPhone = (raw) => {
    if (!raw) return '';
    return raw.replace(/[^0-9]/g, '');
  };

  const handleCall = () => {
    if (!customer.phone) return;
    Linking.openURL(`tel:${customer.phone}`).catch((err) => {
      Alert.alert('Unable to Dial', 'Could not open phone dialer on this device.');
    });
  };

  const handleWhatsApp = () => {
    const clean = getCleanPhone(customer.phone);
    if (!clean) return;
    const msg = encodeURIComponent(
      `Hello ${customer.name}, greeting from our store regarding your ${customer.purpose || 'visit'}!`
    );
    Linking.openURL(`https://wa.me/${clean}?text=${msg}`).catch((err) => {
      Alert.alert('Unable to open WhatsApp', 'Make sure WhatsApp is installed on this device.');
    });
  };

  const handleCopyIMEI = async () => {
    if (!customer.imei) return;
    await Clipboard.setStringAsync(customer.imei);
    Alert.alert('📋 Copied', `IMEI (${customer.imei}) copied to clipboard.`);
  };

  const handleEmail = () => {
    if (!customer.email) return;
    Linking.openURL(`mailto:${customer.email}`).catch((err) => {
      Alert.alert('Unable to Send Email', 'Could not open mail client.');
    });
  };

  const handleDelete = () => {
    Alert.alert(
      '🗑️ Delete Customer',
      `Are you sure you want to delete ${customer.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomer(customer.id);
              Alert.alert('✅ Deleted', 'Customer record deleted successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('❌ Error', 'Failed to delete customer.');
            }
          },
        },
      ]
    );
  };

  const getPurposeColor = (purpose) => {
    if (!purpose) return { bg: '#F1F5F9', text: '#475569' };
    if (purpose.includes('Repair')) return { bg: '#EFF6FF', text: '#1D4ED8' };
    if (purpose.includes('Purchase')) return { bg: '#ECFDF5', text: '#047857' };
    if (purpose.includes('Inquiry')) return { bg: '#FEF3C7', text: '#B45309' };
    if (purpose.includes('Trade-In') || purpose.includes('Sale')) return { bg: '#FAF5FF', text: '#7E22CE' };
    if (purpose.includes('Warranty')) return { bg: '#FEF2F2', text: '#B91C1C' };
    return { bg: '#F3F4F6', text: '#374151' };
  };

  const purposeStyle = getPurposeColor(customer.purpose);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Profile</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => navigation.navigate('EditCustomerScreen', { customer })}
          >
            <Feather name="edit-2" size={19} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIconBtn} onPress={handleDelete}>
            <Feather name="trash-2" size={19} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(customer.name)}</Text>
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerPhone}>{customer.phone}</Text>

          <View style={[styles.purposeBadge, { backgroundColor: purposeStyle.bg }]}>
            <Text style={[styles.purposeBadgeText, { color: purposeStyle.text }]}>
              {customer.purpose}
            </Text>
          </View>

          {/* Quick Communication Bar */}
          <View style={styles.quickBar}>
            <TouchableOpacity style={styles.quickBtnCall} activeOpacity={0.8} onPress={handleCall}>
              <Ionicons name="call" size={18} color="#FFFFFF" />
              <Text style={styles.quickBtnText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickBtnWhatsApp} activeOpacity={0.8} onPress={handleWhatsApp}>
              <FontAwesome5 name="whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.quickBtnText}>WhatsApp</Text>
            </TouchableOpacity>

            {customer.email ? (
              <TouchableOpacity style={styles.quickBtnEmail} activeOpacity={0.8} onPress={handleEmail}>
                <Feather name="mail" size={18} color="#FFFFFF" />
                <Text style={styles.quickBtnText}>Email</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Inquiry Conversion Banner */}
        {customer.purpose && customer.purpose.toLowerCase().includes('inquiry') && (
          <View style={styles.inquiryCard}>
            <View style={styles.inquiryHeader}>
              <Feather name="help-circle" size={18} color="#D97706" />
              <Text style={styles.inquiryTitle}>Active Customer Inquiry</Text>
            </View>
            <Text style={styles.inquiryText}>
              Did this customer decide to proceed with the job or purchase? Convert this inquiry in 1 tap:
            </Text>
            <View style={styles.inquiryBtnRow}>
              <TouchableOpacity
                style={styles.convertBtnRepair}
                activeOpacity={0.8}
                onPress={() => handleConvertInquiry('Repair / Service')}
              >
                <Feather name="tool" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.convertBtnText}>Convert to Repair</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.convertBtnPurchase}
                activeOpacity={0.8}
                onPress={() => handleConvertInquiry('Purchase / Accessory')}
              >
                <Feather name="shopping-bag" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.convertBtnText}>Convert to Purchase</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionHeader}>Service & Contact Details</Text>

          {customer.device_model ? (
            <DetailRow
              icon={<Feather name="smartphone" size={18} color={colors.primary} />}
              label="Device Brand / Model"
              value={customer.device_model}
            />
          ) : null}

          {customer.imei ? (
            <View style={styles.imeiDetailRow}>
              <View style={styles.rowIcon}>
                <Feather name="hash" size={18} color={colors.accent} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Device IMEI</Text>
                <Text style={styles.imeiNumberText}>{formatIMEI(customer.imei)}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={handleCopyIMEI}
                activeOpacity={0.7}
              >
                <Feather name="copy" size={14} color={colors.primary} />
                <Text style={styles.copyBtnText}>Copy</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <DetailRow
            icon={<Feather name="phone" size={18} color={colors.primary} />}
            label="Mobile Number"
            value={customer.phone}
          />

          <DetailRow
            icon={<Feather name="tag" size={18} color={colors.primary} />}
            label="Purpose of Visit"
            value={customer.purpose}
          />

          {customer.email ? (
            <DetailRow
              icon={<Feather name="mail" size={18} color={colors.primary} />}
              label="Email Address"
              value={customer.email}
            />
          ) : null}

          {customer.address ? (
            <DetailRow
              icon={<Feather name="map-pin" size={18} color={colors.primary} />}
              label="Address / Area"
              value={customer.address}
            />
          ) : null}

          {customer.notes ? (
            <DetailRow
              icon={<Feather name="file-text" size={18} color={colors.primary} />}
              label="Notes & Remarks"
              value={customer.notes}
            />
          ) : null}

          {customer.created_at ? (
            <DetailRow
              icon={<Feather name="calendar" size={18} color={colors.textSecondary} />}
              label="Customer Registered"
              value={new Date(customer.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            />
          ) : null}
        </View>

        {/* Device Service History */}
        {customer.imei ? (
          <View style={styles.historyCard}>
            <View style={styles.historyCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="clock" size={16} color={colors.primary} />
                <Text style={styles.sectionHeader}>Device Service History</Text>
              </View>
              <View style={styles.historyCountPill}>
                <Text style={styles.historyCountText}>
                  {deviceHistory.length} visit{deviceHistory.length > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.logNewVisitBtn}
              onPress={() => {
                navigation.navigate('AddCustomerScreen', {
                  initialValues: {
                    phone: customer.phone,
                    name: customer.name,
                    device_model: customer.device_model,
                    imei: customer.imei,
                    email: customer.email,
                    address: customer.address,
                    purpose: 'Repair / Service',
                  },
                });
              }}
              activeOpacity={0.8}
            >
              <Feather name="plus-circle" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.logNewVisitBtnText}>Log New Visit for this Device</Text>
            </TouchableOpacity>

            {deviceHistory.map((visit, index) => {
              const isCurrent = visit.id === customer.id;
              const dateStr = visit.created_at
                ? new Date(visit.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Prior visit';

              return (
                <View
                  key={visit.id || index}
                  style={[styles.historyRow, isCurrent && styles.historyRowCurrent]}
                >
                  <View style={[styles.historyDot, isCurrent && styles.historyDotCurrent]} />
                  <View style={styles.historyContent}>
                    <View style={styles.historyTopRow}>
                      <Text style={[styles.historyPurpose, isCurrent && styles.historyPurposeCurrent]}>
                        {visit.purpose}
                        {isCurrent ? ' (Viewing)' : ''}
                      </Text>
                      <Text style={styles.historyDate}>{dateStr}</Text>
                    </View>
                    {visit.notes ? (
                      <Text style={styles.historyNotes} numberOfLines={2}>
                        {visit.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.header,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtn: {
    padding: 6,
    marginLeft: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  purposeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    marginBottom: 16,
  },
  purposeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  quickBtnCall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.full,
    ...shadows.button,
  },
  quickBtnWhatsApp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.full,
    ...shadows.button,
  },
  quickBtnEmail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textSecondary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.full,
  },
  quickBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  inquiryCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    ...shadows.card,
  },
  inquiryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  inquiryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B45309',
    marginLeft: 6,
  },
  inquiryText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: 12,
  },
  inquiryBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  convertBtnRepair: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    ...shadows.button,
  },
  convertBtnPurchase: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    ...shadows.button,
  },
  convertBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  imeiDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  imeiNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyCountPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  historyCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  logNewVisitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    marginBottom: 14,
    ...shadows.button,
  },
  logNewVisitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyRowCurrent: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    marginTop: 6,
    marginRight: 10,
  },
  historyDotCurrent: {
    backgroundColor: '#10B981',
  },
  historyContent: {
    flex: 1,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyPurpose: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyPurposeCurrent: {
    color: '#059669',
  },
  historyDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  historyNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
});
