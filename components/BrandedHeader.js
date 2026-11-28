import { Feather } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ShopProfileModal from './ShopProfileModal';
import { auth } from '../config/firebase';
import { getAppUpdateInfo } from '../constants/appVersion';
import { borderRadius, colors, shadows } from '../constants/theme';
import { useShop } from '../context/ShopContext';

export default function BrandedHeader({ showSignOut = false }) {
  const { shopName, setIsProfileModalOpen } = useShop();
  const appInfo = getAppUpdateInfo();
  const isPreview = appInfo.stage === 'Preview';

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Cellventory?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOut(auth).catch((err) => console.error('Sign out error:', err)),
        },
      ]
    );
  };

  return (
    <>
      <View style={styles.headerContainer}>
        {/* Left: Logo & Branding */}
        <View style={styles.brandRow}>
          <Image
            source={require('../assets/teqperts-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.titleColumn}>
            <View style={styles.brandTitleRow}>
              <Text style={styles.brandTitle}>CELLVENTORY</Text>
              {appInfo.stage ? (
                <View style={[styles.betaPill, isPreview && styles.previewPill]}>
                  <Text style={[styles.betaPillText, isPreview && styles.previewPillText]}>
                    {appInfo.stage.toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgePrefix}>by </Text>
              <Text style={styles.badgeName}>teqperts</Text>
            </View>
            <Text style={styles.versionMetaText} numberOfLines={1}>
              {appInfo.versionLabel} • {appInfo.formattedDate}
            </Text>
          </View>
        </View>

        {/* Right: Consolidated Shop Dropdown Pill (Switch Shop, Settings, Sign Out) */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.shopPill}
            onPress={() => setIsProfileModalOpen(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Store Profile, Settings & Sign Out"
          >
            <Feather name="shopping-bag" size={13} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={styles.shopPillText} numberOfLines={1}>{shopName}</Text>
            <Feather name="chevron-down" size={12} color={colors.textMuted} style={{ marginLeft: 3 }} />
          </TouchableOpacity>

          {showSignOut && (
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleSignOut}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Sign Out"
            >
              <Feather name="log-out" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Embedded Shop Profile & Settings Modal */}
      <ShopProfileModal />
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 70,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.header,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    marginRight: 9,
  },
  titleColumn: {
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -1,
  },
  badgePrefix: {
    fontSize: 10.5,
    color: colors.textMuted,
    fontWeight: '500',
  },
  badgeName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.teqperts,
    letterSpacing: 0.3,
  },
  versionMetaText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 1,
  },
  betaPill: {
    marginLeft: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  betaPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  previewPill: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  previewPillText: {
    color: '#1D4ED8',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  shopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 160,
  },
  shopPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    maxWidth: 110,
  },
  signOutBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 8,
  },
});
