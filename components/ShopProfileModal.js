import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { auth } from '../config/firebase';
import { borderRadius, colors, shadows } from '../constants/theme';
import { useShop } from '../context/ShopContext';
import {
  createDatabaseSnapshot,
  downloadLatestBackup,
  getLocalBackupMeta,
  restoreDatabaseSnapshot,
  uploadBackupToCloud,
} from '../services/BackupService';

export default function ShopProfileModal() {
  const { shopName, userEmail, isProfileModalOpen, setIsProfileModalOpen } = useShop();
  const [backupMeta, setBackupMeta] = useState(null);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (isProfileModalOpen) {
      getLocalBackupMeta().then(setBackupMeta).catch(() => {});
    }
  }, [isProfileModalOpen]);

  const handleBackupNow = async () => {
    setBackingUp(true);
    try {
      const snapshot = await createDatabaseSnapshot();
      const meta = await uploadBackupToCloud(snapshot);
      setBackupMeta(meta);
      Alert.alert(
        '☁️ Backup Successful',
        `Secured to cloud:\n• ${snapshot.stats.items_count} items\n• ${snapshot.stats.customers_count} customers\n• ${snapshot.stats.repairs_count} repairs\n• ${snapshot.stats.sales_count} sales`
      );
    } catch (err) {
      Alert.alert('❌ Backup Error', err.message || 'Failed to upload backup to cloud.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreFromCloud = () => {
    Alert.alert(
      '📥 Restore from Cloud',
      'Restoring will replace the current local database with the latest cloud backup. Make sure you want to restore this store snapshot.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Now',
          style: 'destructive',
          onPress: async () => {
            setRestoring(true);
            try {
              const snapshot = await downloadLatestBackup();
              const result = await restoreDatabaseSnapshot(snapshot);
              Alert.alert(
                '✅ Restore Complete',
                `Successfully restored:\n• ${result.restored_items} items\n• ${result.restored_customers} customers\n• ${result.restored_repairs} repairs\n• ${result.restored_sales} sales`
              );
              setIsProfileModalOpen(false);
            } catch (err) {
              Alert.alert('❌ Restore Error', err.message || 'Failed to download or restore backup.');
            } finally {
              setRestoring(false);
            }
          },
        },
      ]
    );
  };

  const handleCopyOfflineBackup = async () => {
    try {
      const snapshot = await createDatabaseSnapshot();
      await Clipboard.setStringAsync(JSON.stringify(snapshot, null, 2));
      Alert.alert(
        '📋 Copied to Clipboard',
        'Complete offline JSON backup copied. You can paste it in Notes, email, or send it to yourself on WhatsApp.'
      );
    } catch (err) {
      Alert.alert('❌ Error', 'Could not copy backup snapshot.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Cellventory?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            setIsProfileModalOpen(false);
            signOut(auth).catch((err) => console.error('Sign out error:', err));
          },
        },
      ]
    );
  };

  const formatBackupDate = (isoStr) => {
    if (!isoStr) return 'Not yet backed up';
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <Modal
      visible={isProfileModalOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setIsProfileModalOpen(false)}
    >
      <TouchableWithoutFeedback onPress={() => setIsProfileModalOpen(false)}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.titleArea}>
                  <Text style={styles.modalTitle}>Store Account & Backup</Text>
                  <Text style={styles.modalSubtitle}>Cellventory by teqperts</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsProfileModalOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Close"
                >
                  <Feather name="x" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
              >
                {/* Verified Store Banner */}
                <View style={styles.storeCard}>
                  <View style={styles.storeIconWrapper}>
                    <Feather name="shopping-bag" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.storeDetails}>
                    <View style={styles.verifiedRow}>
                      <Text style={styles.storeLabel}>REGISTERED STORE</Text>
                      <View style={styles.verifiedBadge}>
                        <Feather name="check" size={10} color="#059669" style={{ marginRight: 3 }} />
                        <Text style={styles.verifiedBadgeText}>Verified</Text>
                      </View>
                    </View>
                    <Text style={styles.storeNameText} numberOfLines={2}>
                      {shopName || 'Cellventory Store'}
                    </Text>
                  </View>
                </View>

                {/* Credentials / Account Info Box */}
                <View style={styles.accountBox}>
                  <Feather name="user-check" size={16} color={colors.primary} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountLabel}>Signed In As:</Text>
                    <Text style={styles.accountEmail} numberOfLines={1}>
                      {userEmail || 'Active Store Account'}
                    </Text>
                  </View>
                </View>

                {/* Cloud Backup & Safety Card */}
                <View style={styles.backupCard}>
                  <View style={styles.backupHeaderRow}>
                    <View style={styles.backupHeaderLeft}>
                      <Feather name="cloud" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                      <Text style={styles.backupTitle}>Cloud Backup & Safety</Text>
                    </View>
                    <View style={styles.activePill}>
                      <View style={styles.greenDot} />
                      <Text style={styles.activePillText}>Auto-Daily Active</Text>
                    </View>
                  </View>

                  <Text style={styles.backupStatusText}>
                    Last Cloud Backup:{' '}
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                      {formatBackupDate(backupMeta?.timestamp)}
                    </Text>
                  </Text>
                  {backupMeta?.stats && (
                    <Text style={styles.backupStatsDetail}>
                      {backupMeta.stats.items_count} items • {backupMeta.stats.customers_count} customers •{' '}
                      {backupMeta.stats.repairs_count} repairs • {backupMeta.stats.sales_count} sales
                    </Text>
                  )}

                  {/* Backup Action Buttons */}
                  <View style={styles.backupActionsRow}>
                    <TouchableOpacity
                      style={[styles.backupBtn, backingUp && styles.btnDisabled]}
                      onPress={handleBackupNow}
                      disabled={backingUp || restoring}
                      activeOpacity={0.8}
                    >
                      {backingUp ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Feather name="upload-cloud" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                          <Text style={styles.backupBtnText}>Back Up Now</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.restoreBtn, restoring && styles.btnDisabled]}
                      onPress={handleRestoreFromCloud}
                      disabled={backingUp || restoring}
                      activeOpacity={0.8}
                    >
                      {restoring ? (
                        <ActivityIndicator size="small" color="#0369A1" />
                      ) : (
                        <>
                          <Feather name="download-cloud" size={14} color="#0369A1" style={{ marginRight: 5 }} />
                          <Text style={styles.restoreBtnText}>Restore</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Copy JSON Offline Option */}
                  <TouchableOpacity
                    style={styles.copyJsonRow}
                    onPress={handleCopyOfflineBackup}
                    activeOpacity={0.7}
                  >
                    <Feather name="copy" size={12} color={colors.textMuted} style={{ marginRight: 5 }} />
                    <Text style={styles.copyJsonText}>Copy Offline JSON Backup (WhatsApp / Drive)</Text>
                  </TouchableOpacity>
                </View>

                {/* Informational Security Notice */}
                <View style={styles.securityNotice}>
                  <Feather
                    name="shield"
                    size={14}
                    color={colors.textSecondary}
                    style={{ marginRight: 8, marginTop: 1 }}
                  />
                  <Text style={styles.securityNoticeText}>
                    Store name & credentials are centrally governed by Firebase. All fast retail & repair
                    operations remain 100% offline-ready.
                  </Text>
                </View>

                {/* Sign Out Action Button */}
                <TouchableOpacity
                  style={styles.signOutBtn}
                  onPress={handleSignOut}
                  activeOpacity={0.8}
                >
                  <Feather name="log-out" size={16} color={colors.outOfStock} style={{ marginRight: 8 }} />
                  <Text style={styles.signOutText}>Sign Out of Store</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.floating,
  },
  scrollArea: {
    maxHeight: 480,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleArea: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 12,
  },
  storeIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  storeDetails: {
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  storeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 99,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  storeNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  accountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: 10,
    borderRadius: borderRadius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  accountEmail: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  backupCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 12,
  },
  backupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0369A1',
  },
  backupStatusText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  backupStatsDetail: {
    fontSize: 11,
    color: '#0284C7',
    marginBottom: 10,
    fontWeight: '500',
  },
  backupActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    height: 38,
    borderRadius: borderRadius.sm,
    ...shadows.card,
  },
  backupBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  restoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    height: 38,
    borderRadius: borderRadius.sm,
  },
  restoreBtnText: {
    color: '#0369A1',
    fontSize: 13,
    fontWeight: '700',
  },
  copyJsonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  copyJsonText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 14,
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
    fontWeight: '500',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  signOutText: {
    color: colors.outOfStock,
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
