import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { formatTokenNumber, getAllCustomers, getAllRepairs } from '../database/Helper';
import { formatIMEI } from '../utils/imei';
import { buildRepairJobs, filterRepairJobs } from '../utils/repairJobs';

const JOB_FILTERS = [
  { id: 'all', label: 'All Jobs' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'ready', label: 'Ready' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'due', label: 'Balance Due' },
];

export default function JobsScreen() {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [customers, repairs] = await Promise.all([getAllCustomers(), getAllRepairs()]);
      setJobs(buildRepairJobs(customers || [], repairs || []));
    } catch (error) {
      console.error('Failed to load repair jobs:', error);
      Alert.alert('Error', 'Failed to load repair jobs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  const matchingJobs = useMemo(
    () => filterRepairJobs(jobs, { search, statusFilter: activeFilter, showAll: true }),
    [jobs, search, activeFilter]
  );
  const visibleJobs = useMemo(
    () => (showAllJobs ? matchingJobs : matchingJobs.slice(0, 10)),
    [matchingJobs, showAllJobs]
  );

  const handleScanCode = (scannedCode) => {
    setScannerVisible(false);
    if (scannedCode) setSearch(scannedCode.trim());
  };

  const openJobDetails = (job) => {
    navigation.navigate('CustomerDetailsScreen', {
      customer: job.customer,
      repairId: job.id,
      isLegacyFallback: job.isLegacyFallback,
    });
  };

  const renderJob = ({ item }) => {
    const statusStyle = item.isOverdue
      ? styles.statusOverdue
      : item.isDelivered
      ? styles.statusDelivered
      : item.isReady
      ? styles.statusReady
      : styles.statusInProgress;

    return (
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={0.75}
        onPress={() => openJobDetails(item)}
        accessibilityLabel={`Open repair job ${item.device_model || item.id}`}
      >
        <View style={styles.jobHeader}>
          <View style={styles.jobHeading}>
            <View style={styles.jobIcon}>
              <Feather name="tool" size={16} color={colors.primary} />
            </View>
            <View style={styles.jobTitleWrap}>
              <Text style={styles.deviceName} numberOfLines={1}>
                {item.device_model || 'Repair job'}
              </Text>
              <Text style={styles.tokenNumber}>{formatTokenNumber(item.id)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, statusStyle]}>
            <Text style={styles.statusText}>
              {item.isOverdue ? 'Overdue' : item.status}
            </Text>
          </View>
        </View>

        {item.issue ? (
          <Text style={styles.issueText} numberOfLines={2}>
            {item.issue}
          </Text>
        ) : null}

        <View style={styles.metadataRow}>
          {item.delivery_date ? (
            <View style={styles.metadataItem}>
              <Feather
                name="calendar"
                size={12}
                color={item.isOverdue ? colors.outOfStock : colors.textMuted}
              />
              <Text style={[styles.metadataText, item.isOverdue && styles.overdueText]}>
                {item.isOverdue ? `Overdue ${item.delivery_date}` : `Due ${item.delivery_date}`}
              </Text>
            </View>
          ) : null}
          {item.imei ? (
            <View style={styles.metadataItem}>
              <Feather name="hash" size={12} color={colors.textMuted} />
              <Text style={styles.metadataText}>{formatIMEI(item.imei)}</Text>
            </View>
          ) : null}
        </View>

        {item.estimated_cost > 0 || item.advance_paid > 0 ? (
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Job balance</Text>
            <Text style={[styles.balanceValue, item.balanceDue > 0 && styles.balanceDue]}>
              ₹{item.balanceDue}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const getFilterCount = (filterId) =>
    filterRepairJobs(jobs, { statusFilter: filterId, showAll: true }).length;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search device, issue, IMEI, token..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setScannerVisible(true)}
          accessibilityLabel="Scan repair job IMEI"
        >
          <Feather name="camera" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.rangeRow}>
        <Text style={styles.resultCount}>
          {showAllJobs
            ? `${matchingJobs.length} repair job(s)`
            : `Latest ${Math.min(10, matchingJobs.length)} of ${matchingJobs.length}`}
        </Text>
        {matchingJobs.length > 10 && (
          <TouchableOpacity
            style={styles.rangeButton}
            onPress={() => setShowAllJobs((current) => !current)}
            accessibilityRole="button"
          >
            <Feather name={showAllJobs ? 'clock' : 'list'} size={13} color={colors.primary} />
            <Text style={styles.rangeButtonText}>{showAllJobs ? 'Latest 10' : 'Show All'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
      >
        {JOB_FILTERS.map((filter) => {
          const selected = activeFilter === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              style={[styles.filterChip, selected && styles.filterChipSelected]}
              onPress={() => setActiveFilter(filter.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                {filter.label}
              </Text>
              <View style={[styles.filterCount, selected && styles.filterCountSelected]}>
                <Text style={[styles.filterCountText, selected && styles.filterCountTextSelected]}>
                  {getFilterCount(filter.id)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visibleJobs}
          keyExtractor={(item) => item.jobKey}
          renderItem={renderJob}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="tool" size={42} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No repair jobs found</Text>
              <Text style={styles.emptyText}>
                {search || activeFilter !== 'all'
                  ? 'Try another search or filter.'
                  : 'Repair jobs will appear here when they are created.'}
              </Text>
            </View>
          }
        />
      )}

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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
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
  scanButton: {
    padding: 6,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  filterList: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: colors.textInverse,
  },
  filterCount: {
    minWidth: 19,
    height: 19,
    marginLeft: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  filterCountSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterCountText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  filterCountTextSelected: {
    color: colors.textInverse,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    flexGrow: 1,
  },
  jobCard: {
    marginBottom: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  jobHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.teqpertsLight,
    marginRight: 10,
  },
  jobTitleWrap: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  tokenNumber: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
  },
  statusInProgress: {
    backgroundColor: colors.lowStockBg,
  },
  statusReady: {
    backgroundColor: colors.inStockBg,
  },
  statusDelivered: {
    backgroundColor: colors.surfaceSubtle,
  },
  statusOverdue: {
    backgroundColor: colors.outOfStockBg,
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  issueText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginTop: 11,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metadataText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  overdueText: {
    color: colors.outOfStock,
    fontWeight: '700',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 11,
    paddingTop: 9,
  },
  balanceLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  balanceValue: {
    color: colors.inStock,
    fontSize: 13,
    fontWeight: '800',
  },
  balanceDue: {
    color: colors.outOfStock,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyText: {
    marginTop: 5,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
