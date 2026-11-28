import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, colors, shadows } from '../constants/theme';

const STATUS_CONTENT = {
  pending: {
    icon: 'clock',
    title: 'Access requested',
    description: 'Your shop access request is pending approval. Check your status here for updates.',
  },
  rejected: {
    icon: 'x-circle',
    title: 'Request not approved',
    description: 'Your request was not approved. Contact the app administrator for help.',
  },
  error: {
    icon: 'wifi-off',
    title: 'Could not verify access',
    description: 'Connect to the internet and try checking your access status again.',
  },
};

export default function RegistrationStatusScreen({
  email,
  status = 'pending',
  errorMessage,
  onRefresh,
  onSignOut,
}) {
  const [refreshing, setRefreshing] = useState(false);
  const content = STATUS_CONTENT[status] || STATUS_CONTENT.pending;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Feather name={content.icon} size={23} color={colors.primary} />
          </View>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.description}>{errorMessage || content.description}</Text>
          {!!email && <Text style={styles.email}>{email}</Text>}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={refreshing}
            onPress={handleRefresh}
            style={[styles.primaryButton, refreshing && styles.disabledButton]}
          >
            {refreshing ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Check access status</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={onSignOut} style={styles.textButton}>
            <Text style={styles.textButtonText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 24,
    ...shadows.floating,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.teqpertsLight,
    borderRadius: borderRadius.full,
    height: 52,
    justifyContent: 'center',
    marginBottom: 14,
    width: 52,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  email: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 50,
    justifyContent: 'center',
    marginTop: 22,
    width: '100%',
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
  textButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
