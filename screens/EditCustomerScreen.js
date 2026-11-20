// screens/EditCustomerScreen.js
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FormInput from '../components/FormInput';
import FormPicker from '../components/FormPicker';
import FormSection from '../components/FormSection';
import { borderRadius, colors, shadows } from '../constants/theme';
import { updateCustomer } from '../database/Helper';
import { PURPOSE_OPTIONS } from './AddCustomerScreen';

export default function EditCustomerScreen({ route }) {
  const initialCustomer = route.params?.customer;
  const navigation = useNavigation();

  const [form, setForm] = useState({
    phone: initialCustomer?.phone || '',
    purpose: initialCustomer?.purpose || '',
    name: initialCustomer?.name || '',
    device_model: initialCustomer?.device_model || '',
    notes: initialCustomer?.notes || '',
    email: initialCustomer?.email || '',
    address: initialCustomer?.address || '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdate = async () => {
    if (!form.phone.trim()) {
      Alert.alert('⚠️ Missing Mobile Number', 'Please enter the customer mobile number.');
      return;
    }

    if (!form.purpose) {
      Alert.alert('⚠️ Missing Purpose', 'Please select the purpose of customer visit.');
      return;
    }

    if (!form.name.trim()) {
      Alert.alert('⚠️ Missing Name', 'Please enter the customer name.');
      return;
    }

    setLoading(true);
    try {
      const updated = await updateCustomer(initialCustomer.id, form);
      Alert.alert('✅ Changes Saved', 'Customer profile updated successfully.', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('Customers');
          },
        },
      ]);
    } catch (err) {
      console.error('Update customer error:', err);
      Alert.alert('❌ Error', err.message || 'Failed to update customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Customer</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Contact & Purpose */}
          <FormSection title="1. Contact & Purpose (Required)">
            <Text style={styles.inputLabel}>Mobile Number *</Text>
            <FormInput
              placeholder="e.g. 9876543210"
              value={form.phone}
              onChange={(val) => handleChange('phone', val)}
              keyboard="phone-pad"
            />

            <Text style={styles.inputLabel}>Purpose of Visit *</Text>
            <FormPicker
              selectedValue={form.purpose}
              onValueChange={(val) => handleChange('purpose', val)}
              options={PURPOSE_OPTIONS}
              placeholder="Select Purpose of Visit *"
            />

            <Text style={styles.inputLabel}>Customer Name *</Text>
            <FormInput
              placeholder="Full Name"
              value={form.name}
              onChange={(val) => handleChange('name', val)}
            />
          </FormSection>

          {/* Section 2: Device Context */}
          <FormSection title="2. Device & Service Context (Optional)">
            <Text style={styles.inputLabel}>Device Brand & Model</Text>
            <FormInput
              placeholder="e.g. iPhone 13, Samsung Galaxy S22"
              value={form.device_model}
              onChange={(val) => handleChange('device_model', val)}
            />

            <Text style={styles.inputLabel}>Problem / Service Notes</Text>
            <FormInput
              placeholder="Describe issue, parts needed, or remarks"
              value={form.notes}
              onChange={(val) => handleChange('notes', val)}
              multiline
            />
          </FormSection>

          {/* Section 3: Extra Info */}
          <FormSection title="3. Additional Contact Details (Optional)">
            <Text style={styles.inputLabel}>Email Address</Text>
            <FormInput
              placeholder="customer@example.com"
              value={form.email}
              onChange={(val) => handleChange('email', val)}
              keyboard="email-address"
            />

            <Text style={styles.inputLabel}>Address / Area</Text>
            <FormInput
              placeholder="City, locality, or landmark"
              value={form.address}
              onChange={(val) => handleChange('address', val)}
            />
          </FormSection>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <View style={styles.btnRow}>
                <Feather name="check" size={18} color={colors.textInverse} style={{ marginRight: 8 }} />
                <Text style={styles.submitText}>Save Changes</Text>
              </View>
            )}
          </TouchableOpacity>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.header,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    marginLeft: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 30,
    ...shadows.card,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});
