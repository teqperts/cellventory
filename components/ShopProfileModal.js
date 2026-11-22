import { Feather } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { auth } from '../config/firebase';
import { borderRadius, colors, shadows } from '../constants/theme';
import { useShop } from '../context/ShopContext';

export default function ShopProfileModal() {
  const { shopName, userEmail, isProfileModalOpen, setIsProfileModalOpen } = useShop();

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
                  <Text style={styles.modalTitle}>Store Account</Text>
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

              {/* Verified Store Banner */}
              <View style={styles.storeCard}>
                <View style={styles.storeIconWrapper}>
                  <Feather name="shopping-bag" size={24} color={colors.primary} />
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
                <Feather name="user-check" size={18} color={colors.primary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountLabel}>Signed In As:</Text>
                  <Text style={styles.accountEmail} numberOfLines={1}>
                    {userEmail || 'Active Store Account'}
                  </Text>
                </View>
              </View>

              {/* Firebase Managed Informational Notice */}
              <View style={styles.securityNotice}>
                <Feather name="shield" size={15} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={styles.securityNoticeText}>
                  Store name is managed centrally via your Firebase credentials. Contact administrator to update store identity.
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
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.floating,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
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
    padding: 14,
    marginBottom: 14,
  },
  storeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  accountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  accountEmail: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 18,
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    fontWeight: '500',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
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
});
