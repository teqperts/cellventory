import { Feather } from '@expo/vector-icons';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '../config/firebase';
import { getAppUpdateInfo } from '../constants/appVersion';
import { borderRadius, colors, shadows } from '../constants/theme';

const HERO_BG = '#141821';

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
      {!!error && (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Feather name="alert-circle" size={15} color={colors.outOfStock} style={{ marginTop: 1 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
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

const CAPABILITIES = [
  {
    icon: 'zap',
    color: '#059669',
    bg: '#ECFDF5',
    title: '100% Offline-Ready Counter',
    subtitle: 'Bill repairs & track stock even without internet',
  },
  {
    icon: 'maximize',
    color: '#0078D7',
    bg: '#EBF5FE',
    title: 'Instant IMEI & Barcode Scan',
    subtitle: 'Scan devices in seconds with Luhn verification',
  },
  {
    icon: 'cloud',
    color: '#D97706',
    bg: '#FEF3C7',
    title: 'Daily Cloud Backup & Khata',
    subtitle: 'Automatic store snapshots & repair payment ledger',
  },
];

export default function KeyAccessScreen() {
  const appInfo = getAppUpdateInfo();
  const isPreview = appInfo.stage === 'Preview';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar translucent={false} backgroundColor={HERO_BG} barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Seamless Dark Brand Canvas matching splash screen */}
        <View style={styles.heroCanvas}>
          <View style={styles.topRow}>
            <View style={styles.securePill}>
              <Feather name="shield" size={12} color="#34D399" />
              <Text style={styles.securePillText}>Encrypted & Secure</Text>
            </View>

            {appInfo.stage ? (
              <View style={[styles.stagePill, isPreview && styles.stagePillPreview]}>
                <Text style={[styles.stagePillText, isPreview && styles.stagePillTextPreview]}>
                  {appInfo.stage.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.brandCenter}>
            <View style={styles.emblemFrame}>
              <Image
                source={require('../assets/splash-icon.png')}
                style={styles.emblem}
                resizeMode="contain"
                accessibilityLabel="Cellventory emblem"
              />
            </View>
            <Text style={styles.brandWordmark}>cellventory</Text>
            <Text style={styles.brandByline}>BY TEQPERTS</Text>
            <Text style={styles.heroTagline}>
              Smart Inventory · IMEI Tracking · Repair Ops
            </Text>
          </View>
        </View>

        {/* Overlapping White Sign-In Sheet */}
        <View style={styles.sheet}>
          <View style={styles.sheetInner}>
            <Text style={styles.sectionEyebrow}>SHOP ACCESS</Text>
            <Text style={styles.cardTitle}>Sign in to your store</Text>
            <Text style={styles.cardDescription}>
              Use your Google account to access your counter or submit a new shop request.
            </Text>

            <View style={styles.ctaBox}>
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
            </View>

            {/* Compact Capability Highlights */}
            <View style={styles.capabilitiesList}>
              {CAPABILITIES.map((item) => (
                <View key={item.title} style={styles.capabilityRow}>
                  <View style={[styles.capabilityIcon, { backgroundColor: item.bg }]}>
                    <Feather name={item.icon} size={15} color={item.color} />
                  </View>
                  <View style={styles.capabilityTextCol}>
                    <Text style={styles.capabilityTitle}>{item.title}</Text>
                    <Text style={styles.capabilitySub}>{item.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.reviewNote}>
              <Feather name="clock" size={14} color={colors.textMuted} />
              <Text style={styles.reviewNoteText}>
                New shop accounts open once your request is approved.
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {appInfo.versionLabel} · Updated {appInfo.formattedDate}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: HERO_BG,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.surface,
  },
  heroCanvas: {
    backgroundColor: HERO_BG,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 42,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  securePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.28)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  securePillText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '700',
  },
  stagePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stagePillPreview: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(96, 165, 250, 0.4)',
  },
  stagePillText: {
    color: '#FDE68A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  stagePillTextPreview: {
    color: '#93C5FD',
  },
  brandCenter: {
    alignItems: 'center',
  },
  emblemFrame: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emblem: {
    width: 54,
    height: 54,
  },
  brandWordmark: {
    color: '#38BDF8',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  brandByline: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 2,
  },
  heroTagline: {
    color: '#CBD5E1',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -22,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 18,
    ...shadows.floating,
  },
  sheetInner: {
    flex: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  sectionEyebrow: {
    color: colors.teqperts,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 4,
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 6,
  },
  ctaBox: {
    marginTop: 20,
    marginBottom: 20,
  },
  googleButton: {
    alignSelf: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.outOfStockBg,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
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
  capabilitiesList: {
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  capabilityIcon: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capabilityTextCol: {
    flex: 1,
  },
  capabilityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  capabilitySub: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  reviewNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 20,
  },
  reviewNoteText: {
    color: colors.textSecondary,
    fontSize: 11.5,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
