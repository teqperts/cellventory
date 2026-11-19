import { Feather } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { auth } from '../config/firebase';
import { borderRadius, colors, shadows } from '../constants/theme';

export default function BrandedHeader({ showSignOut = true }) {
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
    <View style={styles.headerContainer}>
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

      {showSignOut && (
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Sign Out"
        >
          <Feather name="log-out" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
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
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    marginRight: 10,
  },
  titleColumn: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
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
  signOutBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
