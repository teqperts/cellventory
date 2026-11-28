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
import { useAppUpdate } from '../context/AppUpdateContext';
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
  const { checkingForUpdate, checkForAppUpdates } = useAppUpdate();
  const [backupMeta, setBackupMeta] = useState(null);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const closeModal = () => setIsProfileModalOpen(false);

  const handleCheckForUpdates = () => {
    checkForAppUpdates({ manual: true });
  };

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

  const handleSwitchShop = () => {
    Alert.alert(
      'Switch Shop',
      'To switch to another store account, sign out of your current session and sign in with the new store credentials.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch Shop (Sign Out)',
          style: 'default',
          onPress: () => {
            setIsProfileModalOpen(false);
            signOut(auth).catch((err) => console.error('Sign out error:', err));
          },
        },
      ]
    );
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

  const statItems = backupMeta?.stats
    ? [
        { label: 'Items', value: backupMeta.stats.items_count },
        { label: 'Customers', value: backupMeta.stats.customers_count },
        { label: 'Repairs', value: backupMeta.stats.repairs_count },
        { label: 'Sales', value: backupMeta.stats.sales_count },
      ]
    : null;

  return (
    <Modal
      visible={isProfileModalOpen}
      transparent
      animationType="fade"
      onRequestClose={closeModal}
    >
      <TouchableWithoutFeedback onPress={closeModal}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.titleArea}>
                  <Text style={styles.modalTitle}>Store & Settings</Text>
                  <Text style={styles.modalSubtitle}>Cellventory by teqperts</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={closeModal}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Close"
                >
                  <Feather name="x" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
              >
                {/* Unified Store Identity Hero Card */}
                <View style={styles.storeHeroCard}>
                  <View style={styles.storeTopRow}>
                    <View style={styles.storeIconWrapper}>
                      <Feather name="shopping-bag" size={20} color="#059669" />
                    </View>
                    <View style={styles.storeIdentityCol}>
                      <View style={styles.storeTitleRow}>
                        <Text style={styles.storeNameText} numberOfLines={2}>
                          {shopName || 'Cellventory Store'}
                        </Text>
                        <View style={styles.verifiedBadge}>
                          <Feather name="check-circle" size={10} color="#059669" style={{ marginRight: 3 }} />
                          <Text style={styles.verifiedBadgeText}>Verified</Text>
                        </View>
                      </View>
                      <View style={styles.accountInlineRow}>
                        <Feather name="user" size={12} color={colors.textMuted} style={{ marginRight: 5 }} />
                        <Text style={styles.accountEmail} numberOfLines={1}>
                          {userEmail || 'Active Store Account'}
                        </Text>
                      </View>
                    </View>
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
                      <Text style={styles.activePillText}>Auto-Daily</Text>
                    </View>
                  </View>

                  <View style={styles.lastSyncRow}>
                    <Text style={styles.backupStatusLabel}>Last Backup</Text>
                    <Text style={styles.backupStatusValue}>
                      {formatBackupDate(backupMeta?.timestamp)}
                    </Text>
                  </View>

                  {statItems && (
                    <View style={styles.statsStrip}>
                      {statItems.map((stat) => (
                        <View key={stat.label} style={styles.statBox}>
                          <Text style={styles.statValue}>{stat.value ?? 0}</Text>
                          <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                      ))}
                    </View>
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
                          <Feather name="upload-cloud" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
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
                          <Feather name="download-cloud" size={14} color="#0369A1" style={{ marginRight: 6 }} />
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
                    <Feather name="copy" size={12} color="#0369A1" style={{ marginRight: 5 }} />
                    <Text style={styles.copyJsonText}>Copy Offline JSON Backup (WhatsApp / Drive)</Text>
                  </TouchableOpacity>
                </View>

                {/* Grouped Account & App Settings Card */}
                <Text style={styles.sectionLabel}>ACCOUNT & APP</Text>
                <View style={styles.settingsGroupCard}>
                  {/* Check for App Updates */}
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={handleCheckForUpdates}
                    disabled={checkingForUpdate}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingIconBox, styles.updateIconBox]}>
                      <Feather name="refresh-cw" size={15} color="#2563EB" />
                    </View>
                    <View style={styles.settingTextCol}>
                      <Text style={styles.settingTitle}>Check for App Updates</Text>
                      <Text style={styles.settingSub}>Verify if a newer release is available</Text>
                    </View>
                    {checkingForUpdate ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Feather name="chevron-right" size={16} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  <View style={styles.rowDivider} />

                  {/* Switch Shop Account */}
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={handleSwitchShop}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingIconBox, styles.switchIconBox]}>
                      <Feather name="repeat" size={15} color={colors.primary} />
                    </View>
                    <View style={styles.settingTextCol}>
                      <Text style={styles.settingTitle}>Switch Shop Account</Text>
                      <Text style={styles.settingSub}>Sign in with another store login</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.textMuted} />
                  </TouchableOpacity>

                  <View style={styles.rowDivider} />

                  {/* Sign Out of Store */}
                  <TouchableOpacity
                    style={styles.settingRow}
                    onPress={handleSignOut}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingIconBox, styles.signOutIconBox]}>
                      <Feather name="log-out" size={15} color={colors.outOfStock} />
                    </View>
                    <View style={styles.settingTextCol}>
                      <Text style={styles.signOutTitle}>Sign Out of Store</Text>
                      <Text style={styles.settingSub}>End current store session</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.outOfStock} />
                  </TouchableOpacity>
                </View>

                {/* Compact Offline Assurance Footnote */}
                <View style={styles.footnoteRow}>
                  <Feather name="shield" size={12} color={colors.textMuted} style={{ marginRight: 5 }} />
                  <Text style={styles.footnoteText}>
                    100% offline-ready counter ops • Cloud-verified session
                  </Text>
                </View>
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
    borderRadius: borderRadius.xl,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.floating,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
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
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeHeroCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 12,
  },
  storeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  storeIdentityCol: {
    flex: 1,
    minWidth: 0,
  },
  storeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  storeNameText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  accountInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  accountEmail: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  backupCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 14,
  },
  backupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    paddingHorizontal: 7,
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
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  lastSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backupStatusLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  backupStatusValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statsStrip: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    borderRadius: borderRadius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
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
    backgroundColor: '#FFFFFF',
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
    paddingTop: 2,
  },
  copyJsonText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.7,
    marginBottom: 6,
    marginLeft: 2,
  },
  settingsGroupCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  settingIconBox: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  updateIconBox: {
    backgroundColor: '#EFF6FF',
  },
  switchIconBox: {
    backgroundColor: colors.surfaceSubtle,
  },
  signOutIconBox: {
    backgroundColor: '#FEF2F2',
  },
  settingTextCol: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  settingTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  signOutTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.outOfStock,
  },
  settingSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 57,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  footnoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  footnoteText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
