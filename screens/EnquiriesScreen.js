import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import QuickCustomerEntryModal from '../components/QuickCustomerEntryModal';
import { borderRadius, colors, shadows } from '../constants/theme';
import { getAllCustomers } from '../database/Helper';
import { isUnconvertedEnquiry } from '../utils/enquiries';

export default function EnquiriesScreen() {
  const navigation = useNavigation();
  const [enquiries, setEnquiries] = useState([]);
  const [search, setSearch] = useState('');
  const [purchaseTarget, setPurchaseTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEnquiries = useCallback(async () => {
    try {
      const customers = await getAllCustomers();
      setEnquiries((customers || []).filter(isUnconvertedEnquiry));
    } catch (error) {
      console.error('Failed to load enquiries:', error);
      Alert.alert('Error', 'Failed to load enquiries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEnquiries();
    }, [loadEnquiries])
  );

  const filteredEnquiries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return enquiries;

    return enquiries.filter((enquiry) =>
      [
        enquiry.name,
        enquiry.phone,
        enquiry.device_model,
        enquiry.imei,
        enquiry.notes,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    );
  }, [enquiries, search]);

  const handleConvertToRepair = (enquiry) => {
    navigation.navigate('AddCustomerScreen', {
      convertInquiryId: enquiry.id,
      customer: enquiry,
      initialValues: {
        convertInquiryId: enquiry.id,
        phone: enquiry.phone || '',
        name: enquiry.name || '',
        device_model: enquiry.device_model || '',
        imei: enquiry.imei || '',
        notes: enquiry.notes || '',
        email: enquiry.email || '',
        address: enquiry.address || '',
        estimated_cost: enquiry.estimated_cost ? String(enquiry.estimated_cost) : '',
        advance_paid: enquiry.advance_paid ? String(enquiry.advance_paid) : '',
        delivery_date: enquiry.delivery_date || '',
        purpose: 'Repair',
      },
    });
  };

  const renderEnquiry = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardMain}
        onPress={() => navigation.navigate('CustomerDetailsScreen', { customer: item })}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Feather name="help-circle" size={17} color="#B45309" />
          </View>
          <View style={styles.contact}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name || 'Walk-in Enquiry'}
            </Text>
            <Text style={styles.phone} numberOfLines={1}>
              {item.phone || 'No phone number'}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Enquiry</Text>
          </View>
        </View>
        {item.device_model ? (
          <Text style={styles.device} numberOfLines={1}>
            {item.device_model}
          </Text>
        ) : null}
        {item.notes ? (
          <Text style={styles.notes} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}
        {Number(item.estimated_cost) > 0 ? (
          <Text style={styles.quote}>Quoted: ₹{item.estimated_cost}</Text>
        ) : null}
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.repairButton}
          onPress={() => handleConvertToRepair(item)}
          activeOpacity={0.8}
        >
          <Feather name="tool" size={13} color="#FFFFFF" />
          <Text style={styles.actionText}>Convert to Repair</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={() => setPurchaseTarget(item)}
          activeOpacity={0.8}
        >
          <Feather name="shopping-bag" size={13} color="#FFFFFF" />
          <Text style={styles.actionText}>Record Purchase</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>Enquiries</Text>
          <Text style={styles.subtitle}>Convert to a repair or record a purchase.</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{enquiries.length}</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, phone, device, or notes..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredEnquiries}
          keyExtractor={(item) => `enquiry-${item.id}`}
          renderItem={renderEnquiry}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadEnquiries();
              }}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="check-circle" size={42} color={colors.inStock} />
              <Text style={styles.emptyTitle}>
                {search ? 'No matching enquiries' : 'No unconverted enquiries'}
              </Text>
              <Text style={styles.emptyText}>
                {search
                  ? 'Try another search.'
                  : 'New enquiries will stay here until they become a repair or purchase.'}
              </Text>
            </View>
          }
        />
      )}

      <QuickCustomerEntryModal
        visible={Boolean(purchaseTarget)}
        initialAction="Purchase"
        initialCustomer={purchaseTarget}
        sourceInquiryId={purchaseTarget?.id}
        onClose={() => setPurchaseTarget(null)}
        onSuccess={() => {
          setPurchaseTarget(null);
          loadEnquiries();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: '#FEF3C7',
  },
  countText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 46,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    flexGrow: 1,
  },
  card: {
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardMain: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: '#FEF3C7',
    marginRight: 10,
  },
  contact: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  phone: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '700',
  },
  device: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  notes: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  quote: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 10,
  },
  repairButton: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  purchaseButton: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: borderRadius.md,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
    textAlign: 'center',
  },
});
