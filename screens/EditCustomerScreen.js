// screens/EditCustomerScreen.js
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRef, useState } from 'react';
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
import IMEIScannerModal from '../components/IMEIScannerModal';
import { borderRadius, colors, shadows } from '../constants/theme';
import { updateCustomer } from '../database/Helper';
import { cleanIMEI, validateIMEI, formatIMEI } from '../utils/imei';
import { PURPOSE_OPTIONS } from './AddCustomerScreen';

export default function EditCustomerScreen({ route }) {
  const initialCustomer = route.params?.customer;
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 180);
  };

  const initialPurpose = initialCustomer?.purpose ? (
    initialCustomer.purpose.toLowerCase().includes('repair') ? 'Repair' :
    (initialCustomer.purpose.toLowerCase().includes('inquiry') || initialCustomer.purpose.toLowerCase().includes('enquiry')) ? 'Enquiry' :
    initialCustomer.purpose.toLowerCase().includes('purchase') ? 'Purchase' : initialCustomer.purpose
  ) : '';

  const [form, setForm] = useState({
    phone: initialCustomer?.phone || '',
    alt_phone: initialCustomer?.alt_phone || '',
    purpose: initialPurpose,
    name: initialCustomer?.name || '',
    device_model: initialCustomer?.device_model || '',
    imei: initialCustomer?.imei || '',
    notes: initialCustomer?.notes || '',
    email: initialCustomer?.email || '',
    address: initialCustomer?.address || '',
    status: initialCustomer?.status || 'In Progress',
    delivery_date: initialCustomer?.delivery_date || '',
    estimated_cost: initialCustomer?.estimated_cost ? String(initialCustomer.estimated_cost) : '',
    advance_paid: initialCustomer?.advance_paid ? String(initialCustomer.advance_paid) : '',
  });

  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const estimatedNum = parseFloat(form.estimated_cost) || 0;
  const advanceNum = parseFloat(form.advance_paid) || 0;
  const balanceDue = Math.max(0, estimatedNum - advanceNum);

  const getDeliveryDatePreset = (daysFromToday) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const imeiValidation = form.imei ? validateIMEI(form.imei) : { valid: false };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdate = async () => {
    const isAnInquiry = Boolean(
      (form.purpose && (form.purpose.toLowerCase().includes('inquiry') || form.purpose.toLowerCase().includes('enquiry'))) ||
      form.status === 'Inquiry' ||
      form.status === 'Enquiry'
    );

    if (!isAnInquiry && !form.phone.trim() && !form.imei.trim()) {
      Alert.alert('⚠️ Missing Identifier', 'Please enter either the customer mobile number or device IMEI.');
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
            navigation.navigate('Jobs');
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
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

            <Text style={styles.inputLabel}>Alternative Contact Number (Optional)</Text>
            <FormInput
              placeholder="e.g. 9876500000 (Family / Work)"
              value={form.alt_phone}
              onChange={(val) => handleChange('alt_phone', val)}
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

            <Text style={styles.inputLabel}>Current Status</Text>
            <View style={styles.statusChipsRow}>
              {['In Progress', 'Ready for Delivery', 'Delivered'].map((st) => {
                const isSelected = form.status === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.statusChip, isSelected && styles.statusChipActive]}
                    activeOpacity={0.8}
                    onPress={() => handleChange('status', st)}
                  >
                    <Text style={[styles.statusChipText, isSelected && styles.statusChipTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FormSection>

          {/* Section 2: Device Context */}
          <FormSection title="2. Device & Service Context (Optional)">
            <Text style={styles.inputLabel}>Device Brand & Model</Text>
            <FormInput
              placeholder="e.g. iPhone 13, Samsung Galaxy S22"
              value={form.device_model}
              onChange={(val) => handleChange('device_model', val)}
            />

            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Device IMEI Number</Text>
              {form.purpose && form.purpose.includes('Repair') ? (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>Recommended for Repairs</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.imeiInputRow}>
              <View style={styles.imeiInputWrap}>
                <FormInput
                  placeholder="15-digit IMEI (dial *#06#)"
                  value={form.imei}
                  onChange={(val) => handleChange('imei', cleanIMEI(val))}
                  keyboard="numeric"
                />
              </View>
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => setScannerVisible(true)}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={16} color="#FFFFFF" />
                <Text style={styles.scanBtnText}>Scan</Text>
              </TouchableOpacity>
            </View>

            {/* Live IMEI Validation Feedback */}
            {form.imei.length > 0 && (
              <View
                style={[
                  styles.imeiStatusBadge,
                  imeiValidation.valid ? styles.imeiStatusValid : styles.imeiStatusInvalid,
                ]}
              >
                <Feather
                  name={imeiValidation.valid ? 'check-circle' : 'alert-circle'}
                  size={14}
                  color={imeiValidation.valid ? '#059669' : '#D97706'}
                />
                <Text
                  style={[
                    styles.imeiStatusText,
                    imeiValidation.valid ? styles.imeiStatusTextValid : styles.imeiStatusTextInvalid,
                  ]}
                >
                  {imeiValidation.valid
                    ? `Valid IMEI: ${formatIMEI(form.imei)} (Luhn Verified)`
                    : imeiValidation.reason}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Problem / Service Notes</Text>
            <FormInput
              placeholder="Describe issue, parts needed, or remarks"
              value={form.notes}
              onChange={(val) => handleChange('notes', val)}
              multiline
            />

            {form.purpose && form.purpose.includes('Repair') && (
              <View style={styles.deliveryDateSection}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Promised Delivery Date</Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>Delivery Tracker</Text>
                  </View>
                </View>

                {/* Quick Date Chips */}
                <View style={styles.dateChipsRow}>
                  {[
                    { label: 'Today', days: 0 },
                    { label: 'Tomorrow', days: 1 },
                    { label: 'In 2 Days', days: 2 },
                    { label: 'In 3 Days', days: 3 },
                  ].map((preset) => {
                    const presetDate = getDeliveryDatePreset(preset.days);
                    const isSelected = form.delivery_date === presetDate;
                    return (
                      <TouchableOpacity
                        key={preset.label}
                        style={[
                          styles.dateChip,
                          isSelected && styles.dateChipActive,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => handleChange('delivery_date', presetDate)}
                      >
                        <Text
                          style={[
                            styles.dateChipText,
                            isSelected && styles.dateChipTextActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <FormInput
                  placeholder="YYYY-MM-DD (e.g. 2026-11-21)"
                  value={form.delivery_date}
                  onChange={(val) => handleChange('delivery_date', val)}
                />
              </View>
            )}

            {/* Payment & Estimate Estimation (Khata) */}
            <View style={styles.paymentSection}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Estimated Cost & Advance</Text>
                <View style={styles.billingBadge}>
                  <Text style={styles.billingBadgeText}>Payment Khata</Text>
                </View>
              </View>

              <View style={styles.paymentInputsRow}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.paymentFieldLabel}>Total Amount (₹)</Text>
                  <FormInput
                    placeholder="e.g. 2500"
                    value={form.estimated_cost}
                    onChange={(val) => handleChange('estimated_cost', val)}
                    keyboard="numeric"
                    onFocus={scrollToBottom}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.paymentFieldLabel}>Advance Paid (₹)</Text>
                  <FormInput
                    placeholder="e.g. 500"
                    value={form.advance_paid}
                    onChange={(val) => handleChange('advance_paid', val)}
                    keyboard="numeric"
                    onFocus={scrollToBottom}
                  />
                </View>
              </View>

              {(estimatedNum > 0 || advanceNum > 0) && (
                <View style={styles.balanceSummaryCard}>
                  <View style={styles.balanceSummaryRow}>
                    <Text style={styles.balanceSummaryLabel}>Balance Due on Delivery:</Text>
                    <Text
                      style={[
                        styles.balanceSummaryAmount,
                        balanceDue > 0 ? styles.balanceDueOrange : styles.balanceDueGreen,
                      ]}
                    >
                      ₹{balanceDue}
                    </Text>
                  </View>
                </View>
              )}
            </View>
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

      <IMEIScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(scannedImei) => handleChange('imei', scannedImei)}
      />
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recommendedBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  imeiInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  imeiInputWrap: {
    flex: 1,
  },
  scanBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: borderRadius.md,
    height: 48,
    gap: 6,
    ...shadows.card,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  imeiStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginTop: -4,
    marginBottom: 12,
    gap: 6,
  },
  imeiStatusValid: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  imeiStatusInvalid: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  imeiStatusText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  imeiStatusTextValid: {
    color: '#065F46',
  },
  imeiStatusTextInvalid: {
    color: '#92400E',
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statusChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  deliveryDateSection: {
    marginTop: 6,
    marginBottom: 6,
  },
  dateChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dateChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dateChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  paymentSection: {
    marginTop: 10,
    marginBottom: 6,
  },
  paymentInputsRow: {
    flexDirection: 'row',
  },
  paymentFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  billingBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  billingBadgeText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: '700',
  },
  balanceSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  balanceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceSummaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  balanceSummaryAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  balanceDueOrange: {
    color: '#EA580C',
  },
  balanceDueGreen: {
    color: '#16A34A',
  },
});
