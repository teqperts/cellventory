import { Feather } from '@expo/vector-icons';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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
  const { width } = useWindowDimensions();
  const buttonSize = width >= 360 ? 'wide' : 'standard';
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
        accessibilityLabel="Continue with Google"
        colorScheme="light"
        contentAlignment="center"
        disabled={!configured}
        loading={firebaseLoading ? true : undefined}
        onSignInError={handleSignInError}
        onSignInSuccess={handleSignInSuccess}
        size={buttonSize}
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
        <View style={styles.screen}>
          <View style={styles.topBar}>
            <View style={styles.brandLockup}>
              <View style={styles.logoFrame}>
                <Image
                  source={require('../assets/splash-icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityLabel="Cellventory logo"
                />
              </View>
              <View>
                <Text style={styles.brandTitle}>Cellventory</Text>
                <Text style={styles.brandCaption}>SHOP MANAGEMENT</Text>
              </View>
            </View>
            <View style={styles.securePill}>
              <Feather name="shield" size={12} color={colors.inStock} />
              <Text style={styles.securePillText}>Secure</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroKicker}>
              <View style={styles.heroKickerDot} />
              <Text style={styles.heroKickerText}>BUILT FOR INDEPENDENT SHOPS</Text>
            </View>
            <Text style={styles.heroTitle}>A better way to run your shop.</Text>
            <Text style={styles.heroTagline}>
              Smart Inventory, IMEI Tracking & Repair Ops
            </Text>
            <View style={styles.featureChips}>
              <View style={styles.featureChip}>
                <Feather name="zap" size={13} color="#A7F3D0" />
                <Text style={styles.featureChipText}>100% Offline Ready</Text>
              </View>
              <View style={styles.featureChip}>
                <Feather name="maximize" size={13} color="#BFDBFE" />
                <Text style={styles.featureChipText}>IMEI Barcode Scanner</Text>
              </View>
              <View style={styles.featureChip}>
                <Feather name="credit-card" size={13} color="#FDE68A" />
                <Text style={styles.featureChipText}>Repair Khata</Text>
              </View>
            </View>
          </View>

          <View style={styles.signInCard}>
            <Text style={styles.sectionEyebrow}>GET STARTED</Text>
            <Text style={styles.cardTitle}>Continue with Google</Text>
            <Text style={styles.cardDescription}>
              Sign in to submit your shop details and request access.
            </Text>

            {Platform.OS === 'android' ? (
              <AndroidGoogleSignInButton />
            ) : (
              <View style={styles.platformNotice}>
                <Feather name="info" size={16} color={colors.textSecondary} />
                <Text style={styles.platformNoticeText}>
                  Google sign-in is currently available on Android only.
                </Text>
              </View>
            )}

            <View style={styles.reviewNote}>
              <Feather name="clock" size={15} color={colors.textMuted} />
              <Text style={styles.reviewNoteText}>
                Access opens after your request is approved.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {appInfo.versionLabel} · Updated {appInfo.formattedDate}
            </Text>
            <Text style={styles.footerSubText}>Offline-first by design</Text>
          </View>
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
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  screen: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoFrame: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logo: {
    width: 38,
    height: 38,
  },
  brandTitle: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandCaption: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.15,
    marginTop: 1,
  },
  securePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.inStockBg,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  securePillText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: 24,
    overflow: 'hidden',
  },
  heroKicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroKickerDot: {
    width: 7,
    height: 7,
    borderRadius: borderRadius.full,
    backgroundColor: '#34D399',
    marginRight: 8,
  },
  heroKickerText: {
    color: '#B9D2E5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: colors.textInverse,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 36,
    maxWidth: 330,
  },
  heroTagline: {
    color: '#D5E4F0',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  featureChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 22,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  featureChipText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '600',
  },
  signInCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 22,
    ...shadows.floating,
  },
  sectionEyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '800',
    marginTop: 6,
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 16,
  },
  googleButton: {
    alignSelf: 'center',
    marginTop: 2,
  },
  error: {
    color: colors.outOfStock,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  platformNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: 13,
  },
  platformNoticeText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  reviewNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 18,
    paddingTop: 14,
  },
  reviewNoteText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 2,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  footerSubText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
  },
});
