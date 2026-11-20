// screens/AddCustomerScreen.js
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
import { addCustomer, getCustomerByPhone } from '../database/Helper';

export const PURPOSE_OPTIONS = [
  'Repair / Service',
  'Purchase / Accessory',
  'Inquiry / Quotation',
  'Device Trade-In / Sale',
  'Warranty / Follow-Up',
  'Other',
];

export default function AddCustomerScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    phone: '',
    purpose: '',
    name: '',
    device_model: '',
    notes: '',
    email: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const [returningCustomer, setReturningCustomer] = useState(null);

  const handlePhoneChange = async (val) => {
    setForm((prev) => ({ ...prev, phone: val }));

    // Check if phone matches an existing customer when 10+ digits entered
    const cleanDigits = val.replace(/[^0-9]/g, '');
    if (cleanDigits.length >= 10) {
      try {
        const existing = await getCustomerByPhone(cleanDigits);
        if (existing) {
          setReturningCustomer(existing);
        } else {
          setReturningCustomer(null);
        }
      } catch (e) {
        setReturningCustomer(null);
      }
    } else {
      setReturningCustomer(null);
    }
  };

  const loadReturningCustomer = () => {
    if (returningCustomer) {
      setForm((prev) => ({
        ...prev,
        name: returningCustomer.name,
        device_model: returningCustomer.device_model || prev.device_model,
        email: returningCustomer.email || prev.email,
        address: returningCustomer.address || prev.address,
      }));
    }
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
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
      await addCustomer(form);
      Alert.alert('✅ Customer Saved', 'Customer record was successfully added.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.error('Add customer error:', err);
      Alert.alert('❌ Error', err.message || 'Failed to save customer.');
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
        <Text style={styles.headerTitle}>Add New Customer</Text>
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
          {/* Returning Customer Notice */}
          {returningCustomer && (
            <TouchableOpacity
              style={styles.returningCard}
              activeOpacity={0.8}
              onPress={loadReturningCustomer}
            >
              <Feather name="info" size={18} color={colors.primary} />
              <View style={styles.returningInfo}>
                <Text style={styles.returningTitle}>Returning Customer Detected</Text>
                <Text style={styles.returningSub}>
                  {returningCustomer.name} • Tap to autofill name & details
                </Text>
              </View>
              <Feather name="download" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* Section 1: Mobile & Purpose (Mandatory) */}
          <FormSection title="1. Contact & Purpose (Required)">
            <Text style={styles.inputLabel}>Mobile Number *</Text>
            <FormInput
              placeholder="e.g. 9876543210"
              value={form.phone}
              onChange={handlePhoneChange}
              keyboard="phone-pad"
              autoFocus
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
              placeholder="Full Name (e.g. Rahul Sharma)"
              value={form.name}
              onChange={(val) => handleChange('name', val)}
            />
          </FormSection>

          {/* Section 2: Device & Issue Context */}
          <FormSection title="2. Device & Service Context (Optional)">
            <Text style={styles.inputLabel}>Device Brand & Model</Text>
            <FormInput
              placeholder="e.g. iPhone 13, Samsung Galaxy S22"
              value={form.device_model}
              onChange={(val) => handleChange('device_model', val)}
            />

            <Text style={styles.inputLabel}>Problem / Service Notes</Text>
            <FormInput
              placeholder="Describe issue, parts needed, or customer remarks"
              value={form.notes}
              onChange={(val) => handleChange('notes', val)}
              multiline
            />
          </FormSection>

          {/* Section 3: Extra Contact Details */}
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
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <View style={styles.btnRow}>
                <Feather name="check" size={18} color={colors.textInverse} style={{ marginRight: 8 }} />
                <Text style={styles.submitText}>Save Customer Record</Text>
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
  returningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  returningInfo: {
    flex: 1,
    marginLeft: 10,
  },
  returningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  returningSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
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
