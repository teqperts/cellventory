import { Feather } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { auth } from '../config/firebase';
import { borderRadius, colors, shadows } from '../constants/theme';
import { useShop } from '../context/ShopContext';

export default function ShopProfileModal() {
  const { shopName, userEmail, updateShopName, isProfileModalOpen, setIsProfileModalOpen } =
    useShop();

  const [inputName, setInputName] = useState(shopName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setInputName(shopName);
  }, [shopName, isProfileModalOpen]);

  const handleSave = async () => {
    if (!inputName.trim()) {
      Alert.alert('⚠️ Invalid Name', 'Shop name cannot be blank.');
      return;
    }

    setSaving(true);
    try {
      await updateShopName(inputName.trim());
      Alert.alert('✅ Saved', 'Shop name updated successfully!');
      setIsProfileModalOpen(false);
    } catch (err) {
      console.error('Update shop name error:', err);
      Alert.alert('❌ Error', err.message || 'Failed to update shop name.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Cellventory?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            setIsProfileModalOpen(false);
            signOut(auth).catch((err) => console.error('Sign out error:', err));
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={isProfileModalOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setIsProfileModalOpen(false)}
    >
      <TouchableWithoutFeedback onPress={() => setIsProfileModalOpen(false)}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalCard}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.titleArea}>
                  <Text style={styles.modalTitle}>Shop Profile</Text>
                  <Text style={styles.modalSubtitle}>Cellventory by teqperts</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsProfileModalOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Account Info Box */}
              <View style={styles.accountBox}>
                <Feather name="user-check" size={18} color={colors.primary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountLabel}>Signed in as:</Text>
                  <Text style={styles.accountEmail} numberOfLines={1}>{userEmail || 'Active User'}</Text>
                </View>
              </View>

              {/* Edit Shop Name Field */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Shop / Store Name</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="shopping-bag" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.input}
                    value={inputName}
                    onChangeText={setInputName}
                    placeholder="Enter your store name..."
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    maxLength={40}
                  />
                </View>
                <Text style={styles.hintText}>
                  This name is displayed across the header and home dashboard.
                </Text>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.btnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={styles.saveBtnText}>Save Shop Name</Text>
                )}
              </TouchableOpacity>

              {/* Sign Out Button */}
              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
                activeOpacity={0.8}
              >
                <Feather name="log-out" size={16} color={colors.outOfStock} style={{ marginRight: 6 }} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.floating,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleArea: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  accountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  accountEmail: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...shadows.card,
  },
  saveBtnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutText: {
    color: colors.outOfStock,
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
