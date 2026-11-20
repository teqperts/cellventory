import { Feather } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ShopProfileModal from './ShopProfileModal';
import { auth } from '../config/firebase';
import { borderRadius, colors, shadows } from '../constants/theme';
import { useShop } from '../context/ShopContext';

export default function BrandedHeader({ showSignOut = true }) {
  const { shopName, setIsProfileModalOpen } = useShop();

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
            <Text style={styles.brandTitle}>CELLVENTORY</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgePrefix}>by </Text>
              <Text style={styles.badgeName}>teqperts</Text>
            </View>
          </View>
        </View>

        {/* Right: Logged-in Shop Badge & Sign Out */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.shopPill}
            onPress={() => setIsProfileModalOpen(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
    height: 64,
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
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    marginRight: 9,
  },
  titleColumn: {
    justifyContent: 'center',
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
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.teqperts,
    letterSpacing: 0.3,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    maxWidth: 140,
  },
  shopPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    maxWidth: 90,
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
  },
});
