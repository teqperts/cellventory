import { Feather } from '@expo/vector-icons';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '../config/firebase';
import { getAppUpdateInfo } from '../constants/appVersion';
import { borderRadius } from '../constants/theme';

const CANVAS_BG = '#090E17';
const HERO_CARD_BG = '#0C1423';
const SIGNIN_CARD_BG = '#0F1726';
const CARD_BORDER = 'rgba(148, 163, 184, 0.16)';

const FEATURE_PILLS = [
  {
    icon: 'zap',
    label: '100% Offline Ready',
  },
  {
    icon: 'maximize',
    label: 'IMEI Barcode Scanner',
  },
  {
    icon: 'credit-card',
    label: 'Repair Khata',
  },
];

function AndroidGoogleSignInButton() {
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState('');
  const {
    GoogleOneTapSignIn,
    useGoogleSignInFromButton,
  } = require('react-native-nitro-google-signin');

  useEffect(() => {
    try {
      GoogleOneTapSignIn.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'autoDetect',
      });
      setConfigured(true);
    } catch (configurationError) {
      setError(
        configurationError?.message ||
          'Google sign-in is not configured for this app build.'
      );
    }
  }, [GoogleOneTapSignIn]);

  const handleSignInSuccess = async (data) => {
    setError('');
    setFirebaseLoading(true);
    try {
      if (!data?.idToken) {
        throw new Error(
          'Google did not return an ID token. Check the OAuth client configuration.'
        );
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
    setError(signInError?.message || 'Google sign-in failed. Please try again.');
  };

  const { loading, onPress } = useGoogleSignInFromButton({
    behavior: 'credentialManager',
    onSuccess: handleSignInSuccess,
    onError: handleSignInError,
  });

  const isBusy = loading || firebaseLoading;

  return (
    <>
      {!!error && (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Feather
            name="alert-circle"
            size={15}
            color="#FCA5A5"
            style={{ marginTop: 1 }}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Sign in with Google"
        activeOpacity={0.85}
        disabled={!configured || isBusy}
        onPress={onPress}
        style={[
          styles.googlePillButton,
          (!configured || isBusy) && styles.googlePillButtonDisabled,
        ]}
      >
        {isBusy ? (
          <View style={styles.googleButtonInner}>
            <ActivityIndicator size="small" color="#0F172A" />
            <Text style={styles.googleButtonText}>Signing in...</Text>
          </View>
        ) : (
          <View style={styles.googleButtonInner}>
            <Image
              source={require('../assets/google-g-icon.png')}
              style={styles.googleIcon}
              resizeMode="contain"
            />
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </View>
        )}
      </TouchableOpacity>
    </>
  );
}

export default function KeyAccessScreen() {
  const appInfo = getAppUpdateInfo();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar
        translucent={false}
        backgroundColor={CANVAS_BG}
        barStyle="light-content"
      />

      {/* Subtle Ambient Background Glows */}
      <View pointerEvents="none" style={styles.glowTopRight} />
      <View pointerEvents="none" style={styles.glowMidRight} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Centered Brand Header */}
          <View style={styles.brandHeader}>
            <Image
              source={require('../assets/splash-icon.png')}
              style={styles.emblem}
              resizeMode="contain"
              accessibilityLabel="Cellventory emblem"
            />
            <Text style={styles.brandWordmark}>cellventory</Text>
            <View style={styles.bylineRow}>
              <Text style={styles.bylinePrefix}>by</Text>
              <View style={styles.tpMark}>
                <Text style={styles.tpMarkText}>tp</Text>
              </View>
              <Text style={styles.bylineBrand}>teqperts</Text>
            </View>
          </View>

          {/* Top Hero Value Proposition Card */}
          <View style={styles.heroCard}>
            <View style={styles.eyebrowPill}>
              <Text style={styles.eyebrowStar}>✦</Text>
              <Text style={styles.eyebrowPillText}>
                BUILT FOR INDEPENDENT SHOPS
              </Text>
            </View>

            <Text style={[styles.heroTitle, isCompact && styles.heroTitleCompact]}>
              A better way to run{'\n'}
              <Text style={styles.heroTitleBlue}>your </Text>
              <Text style={styles.heroTitleLightBlue}>shop.</Text>
            </Text>

            <Text style={styles.heroSubtitle}>
              Smart Inventory, IMEI Tracking & Repair Ops
            </Text>

            {/* Feature Pills */}
            <View style={styles.pillsWrap}>
              {FEATURE_PILLS.map((pill) => (
                <View key={pill.label} style={styles.featurePill}>
                  <Feather name={pill.icon} size={13} color="#60A5FA" />
                  <Text style={styles.featurePillText}>{pill.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Bottom Google Sign-In Card */}
          <View style={styles.signInCard}>
            <Text style={styles.signInEyebrow}>GET STARTED</Text>
            <Text style={styles.signInTitle}>Continue with Google</Text>
            <Text style={styles.signInSubtitle}>
              Sign in to submit your shop details and request access.
            </Text>

            <View style={styles.ctaBox}>
              {Platform.OS === 'android' ? (
                <AndroidGoogleSignInButton />
              ) : (
                <View style={styles.platformNotice}>
                  <Feather name="info" size={16} color="#94A3B8" />
                  <Text style={styles.platformNoticeText}>
                    Google sign-in is currently available on Android only.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.accessNoteRow}>
              <Feather name="lock" size={13} color="#94A3B8" />
              <Text style={styles.accessNoteText}>
                Access opens after your request is approved.
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerPrimary}>
              {appInfo.versionLabel} • Updated {appInfo.formattedDate}
            </Text>
            <Text style={styles.footerSecondary}>Offline-first by design</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CANVAS_BG,
  },
  glowTopRight: {
    position: 'absolute',
    top: -60,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(37, 99, 235, 0.14)',
  },
  glowMidRight: {
    position: 'absolute',
    top: 260,
    right: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(14, 165, 233, 0.10)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  emblem: {
    width: 54,
    height: 54,
    marginBottom: 6,
  },
  brandWordmark: {
    color: '#2E7CF6',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 32,
  },
  bylineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  bylinePrefix: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  tpMark: {
    borderWidth: 1,
    borderColor: '#64748B',
    borderRadius: 4,
    paddingHorizontal: 3.5,
    paddingVertical: 0.5,
  },
  tpMarkText: {
    color: '#E2E8F0',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  bylineBrand: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  heroCard: {
    backgroundColor: HERO_CARD_BG,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(30, 58, 138, 0.34)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.32)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginBottom: 14,
  },
  eyebrowStar: {
    color: '#60A5FA',
    fontSize: 11,
  },
  eyebrowPillText: {
    color: '#BFDBFE',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  heroTitle: {
    color: '#F8FAFC',
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 33,
    letterSpacing: -0.6,
  },
  heroTitleCompact: {
    fontSize: 24,
    lineHeight: 30,
  },
  heroTitleBlue: {
    color: '#3B82F6',
  },
  heroTitleLightBlue: {
    color: '#60A5FA',
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 19,
    marginTop: 8,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  featurePillText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  signInCard: {
    backgroundColor: SIGNIN_CARD_BG,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
    marginTop: 14,
  },
  signInEyebrow: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  signInTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 4,
  },
  signInSubtitle: {
    color: '#94A3B8',
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 5,
  },
  ctaBox: {
    marginTop: 18,
    width: '100%',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  googlePillButton: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  googlePillButtonDisabled: {
    opacity: 0.72,
  },
  googleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    color: '#0F172A',
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  platformNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(30, 41, 59, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: borderRadius.md,
    padding: 13,
  },
  platformNoticeText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    marginTop: 18,
    marginBottom: 14,
  },
  accessNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  accessNoteText: {
    color: '#94A3B8',
    fontSize: 12.5,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 18,
    paddingBottom: 4,
    gap: 3,
  },
  footerPrimary: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  footerSecondary: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '500',
  },
});
