// screens/CustomerDetailsScreen.js
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
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
import { deleteCustomer } from '../database/Helper';

export default function CustomerDetailsScreen({ route }) {
  const initialCustomer = route.params?.customer;
  const [customer, setCustomer] = useState(initialCustomer);
  const navigation = useNavigation();

  if (!customer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No customer record selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

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
});
