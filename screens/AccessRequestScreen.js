import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
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

import { borderRadius, colors, shadows } from '../constants/theme';
import { createRegistrationRequest } from '../services/RegistrationService';

export default function AccessRequestScreen({ user, onSubmitted, onSignOut }) {
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await createRegistrationRequest(user, { shopName, ownerName, phone });
      await onSubmitted();
    } catch (requestError) {
      setError(requestError?.message || 'Unable to send your access request. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Feather name="clipboard" size={22} color={colors.primary} />
            </View>
            <Text style={styles.title}>Request shop access</Text>
            <Text style={styles.subtitle}>
              Your Google account is signed in. Send your shop details for administrator approval.
            </Text>

            <Text style={styles.label}>Google account</Text>
            <View style={[styles.input, styles.readOnlyInput]}>
              <Text numberOfLines={1} style={styles.email}>{user?.email || 'Verified Google account'}</Text>
            </View>

            <Text style={styles.label}>Shop name</Text>
            <TextInput
              accessibilityLabel="Shop name"
              autoCapitalize="words"
              maxLength={120}
              onChangeText={setShopName}
              placeholder="Your shop name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={shopName}
            />

            <Text style={styles.label}>Owner name</Text>
            <TextInput
              accessibilityLabel="Owner name"
              autoCapitalize="words"
              maxLength={120}
              onChangeText={setOwnerName}
              placeholder="Your full name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={ownerName}
            />

            <Text style={styles.label}>Phone number (optional)</Text>
            <TextInput
              accessibilityLabel="Phone number (optional)"
              keyboardType="phone-pad"
              maxLength={32}
              onChangeText={setPhone}
              placeholder="Contact number"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={phone}
            />

            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

            <TouchableOpacity
              accessibilityRole="button"
              disabled={submitting}
              onPress={handleSubmit}
              style={[styles.primaryButton, submitting && styles.disabledButton]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Send access request</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>
              Access is enabled only after a manual review. Each approved account is limited to one device.
            </Text>
            <TouchableOpacity accessibilityRole="button" onPress={onSignOut} style={styles.textButton}>
              <Text style={styles.textButtonText}>Sign out</Text>
            </TouchableOpacity>
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
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 22,
    ...shadows.floating,
  },
  iconCircle: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.teqpertsLight,
    borderRadius: borderRadius.full,
    height: 48,
    justifyContent: 'center',
    marginBottom: 12,
    width: 48,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 14,
    height: 48,
    marginBottom: 14,
    paddingHorizontal: 13,
  },
  readOnlyInput: {
    justifyContent: 'center',
  },
  email: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  error: {
    color: colors.outOfStock,
    fontSize: 13,
    marginBottom: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 50,
    justifyContent: 'center',
    marginTop: 4,
    ...shadows.card,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  note: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
  textButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
