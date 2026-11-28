import { Feather } from '@expo/vector-icons';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '../config/firebase';
import { getAppUpdateInfo } from '../constants/appVersion';
import { borderRadius, colors, shadows } from '../constants/theme';

function AndroidGoogleSignInButton() {
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState('');
  const {
    GoogleOneTapSignIn,
    GoogleSignInButton: BrandedGoogleSignInButton,
  } = require('react-native-nitro-google-signin');

  useEffect(() => {
    try {
      GoogleOneTapSignIn.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'autoDetect',
      });
      setConfigured(true);
    } catch (configurationError) {
      setError(configurationError?.message || 'Google sign-in is not configured for this app build.');
    }
  }, [GoogleOneTapSignIn]);

  const handleSignInSuccess = async (data) => {
    setError('');
    setFirebaseLoading(true);
    try {
      if (!data?.idToken) {
        throw new Error('Google did not return an ID token. Check the OAuth client configuration.');
      }
      await signInWithCredential(auth, GoogleAuthProvider.credential(data.idToken));
    } catch (signInError) {
      setError(
        signInError?.code === 'auth/network-request-failed'
          ? 'Unable to reach Google or Firebase. Check your internet connection and try again.'
          : signInError?.message || 'Google sign-in failed. Please try again.'
      );
    } finally {
      setFirebaseLoading(false);
    }
  };

  const handleSignInError = (signInError) => {
    setError(
      signInError?.message || 'Google sign-in failed. Please try again.'
    );
  };

  return (
    <>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <BrandedGoogleSignInButton
        accessibilityLabel="Sign in with Google"
        disabled={!configured}
        loading={firebaseLoading ? true : undefined}
        onSignInError={handleSignInError}
        onSignInSuccess={handleSignInSuccess}
        size="standard"
        style={styles.googleButton}
      />
    </>
  );
}

export default function KeyAccessScreen() {
  const appInfo = getAppUpdateInfo();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <View style={styles.brandTitleRow}>
            <Image
              source={require('../assets/splash-icon.png')}
              style={styles.heroLogo}
              resizeMode="contain"
              accessibilityLabel="Cellventory logo"
            />
            <Text style={styles.heroTitle}>Cellventory</Text>
          </View>
          <Text style={styles.heroTagline}>
            Smart Inventory, IMEI Tracking & Repair Ops
          </Text>
          <View style={styles.trustChipsRow}>
            <View style={styles.trustChip}>
              <Feather name="zap" size={11} color="#059669" style={styles.chipIcon} />
              <Text style={styles.trustChipText}>100% Offline Ready</Text>
            </View>
            <View style={styles.trustChip}>
              <Feather name="maximize" size={11} color="#2563EB" style={styles.chipIcon} />
              <Text style={styles.trustChipText}>IMEI Barcode Scanner</Text>
            </View>
            <View style={styles.trustChip}>
              <Feather name="credit-card" size={11} color="#D97706" style={styles.chipIcon} />
              <Text style={styles.trustChipText}>Repair Khata</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderArea}>
            <Text style={styles.cardHeader}>Welcome to Cellventory</Text>
            <Text style={styles.cardSub}>Sign in securely with your Google account</Text>
          </View>

          {Platform.OS === 'android' ? (
            <AndroidGoogleSignInButton />
          ) : (
            <Text accessibilityRole="alert" style={styles.setupMessage}>
              Google sign-in is currently available on Android only.
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Cellventory {appInfo.versionLabel} • Updated {appInfo.formattedDate}
          </Text>
          <Text style={styles.footerSubText}>
            Offline-First Enterprise Edition
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 26,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroLogo: {
    width: 42,
    height: 42,
    marginRight: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  heroTagline: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  trustChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  chipIcon: {
    marginRight: 4,
  },
  trustChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.floating,
  },
  cardHeaderArea: {
    marginBottom: 18,
    alignItems: 'center',
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  googleButton: {
    alignSelf: 'center',
    marginTop: 6,
  },
  error: {
    color: colors.outOfStock,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  setupMessage: {
    color: colors.outOfStock,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  footerSubText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
