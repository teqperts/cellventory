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
            source={require('../assets/header-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Cellventory by teqperts"
          />
          {appInfo.stage ? (
            <View style={[styles.betaPill, isPreview && styles.previewPill]}>
              <Text style={[styles.betaPillText, isPreview && styles.previewPillText]}>
                {appInfo.stage.toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Right: Consolidated Shop Dropdown Pill (Switch Shop, Settings, Sign Out) */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={[styles.shopPill, showSignOut && styles.shopPillCompact]}
            onPress={() => setIsProfileModalOpen(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Store Profile, Settings & Sign Out"
          >
            <Feather name="shopping-bag" size={13} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={styles.shopPillText} numberOfLines={1} ellipsizeMode="tail">
              {shopName}
            </Text>
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
    minHeight: 62,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.header,
  },
  brandRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  logo: {
    width: 122,
    height: 44,
  },
  betaPill: {
    marginLeft: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    flexShrink: 0,
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
    maxWidth: 164,
  },
  shopPillCompact: {
    maxWidth: 124,
  },
  shopPillText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
