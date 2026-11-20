import { Feather } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from '../config/firebase';
import { borderRadius, colors, shadows } from '../constants/theme';

export default function KeyAccessScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('⚠️ Missing Credentials', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // Navigation happens automatically via onAuthStateChanged in App.js
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-credential'
          ? 'Invalid email or password.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Login failed. Please check your network and credentials.';
      Alert.alert('❌ Login Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Branding Section */}
          <View style={styles.heroSection}>
            <Image
              source={require('../assets/teqperts-logo.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <Text style={styles.heroTitle}>CELLVENTORY</Text>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgePrefix}>by </Text>
              <Text style={styles.brandBadgeText}>teqperts</Text>
            </View>
            <Text style={styles.heroTagline}>
              Smart Inventory, IMEI Tracking & Repair Ops
            </Text>

            {/* Feature Trust Chips */}
            <View style={styles.trustChipsRow}>
              <View style={styles.trustChip}>
                <Feather name="zap" size={11} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.trustChipText}>100% Offline Ready</Text>
              </View>
              <View style={styles.trustChip}>
                <Feather name="maximize" size={11} color="#2563EB" style={{ marginRight: 4 }} />
                <Text style={styles.trustChipText}>IMEI Barcode Scanner</Text>
              </View>
              <View style={styles.trustChip}>
                <Feather name="credit-card" size={11} color="#D97706" style={{ marginRight: 4 }} />
                <Text style={styles.trustChipText}>Repair Khata</Text>
              </View>
            </View>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderArea}>
              <Text style={styles.cardHeader}>Sign In to Dashboard</Text>
              <Text style={styles.cardSub}>Enter your registered store account</Text>
            </View>

            {/* Email Field */}
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'email' && styles.inputWrapperFocused,
              ]}
            >
              <Feather
                name="mail"
                size={18}
                color={focusedField === 'email' ? colors.primary : colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Shop Email Address"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Password Field */}
            <View
              style={[
                styles.inputWrapper,
                focusedField === 'password' && styles.inputWrapperFocused,
              ]}
            >
              <Feather
                name="lock"
                size={18}
                color={focusedField === 'password' ? colors.primary : colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.buttonText}>Access Dashboard</Text>
                  <Feather
                    name="arrow-right"
                    size={16}
                    color={colors.textInverse}
                    style={{ marginLeft: 8 }}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Branding */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              CELLVENTORY v1.0 • Built with ❤️ by Teqperts
            </Text>
            <Text style={styles.footerSubText}>
              Secure Offline-First Enterprise Edition
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
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
  heroLogo: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.2,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.teqpertsLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginTop: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  brandBadgePrefix: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  brandBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.teqperts,
    letterSpacing: 0.4,
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
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
    marginTop: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...shadows.card,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
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
