// screens/AddCustomerScreen.js
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
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
import {
  addCustomer,
  convertCustomerPurpose,
  convertInquiryToRepair,
  getCustomerByIMEI,
  getCustomerByPhone,
  searchCustomersByPhonePrefix,
  updateCustomer,
} from '../database/Helper';
import { cleanIMEI, validateIMEI, formatIMEI } from '../utils/imei';

export const PURPOSE_OPTIONS = [
  'Repair / Service',
  'Purchase / Accessory',
  'Inquiry / Quotation',
  'Device Trade-In / Sale',
  'Warranty / Follow-Up',
  'Other',
];

export default function AddCustomerScreen({ route }) {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    phone: '',
    purpose: '',
    name: '',
    device_model: '',
    imei: '',
    notes: '',
    email: '',
    address: '',
    status: 'In Progress',
    delivery_date: '',
    estimated_cost: '',
    advance_paid: '',
  });

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inquiryConversionTarget, setInquiryConversionTarget] = useState(null);
  const [convertedMode, setConvertedMode] = useState(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [matchedDeviceOwner, setMatchedDeviceOwner] = useState(null);

  const isInquiry = Boolean(form.purpose && form.purpose.toLowerCase().includes('inquiry'));

  const checkExistingIMEI = async (val) => {
    const clean = cleanIMEI(val);
    if (clean.length >= 6) {
      try {
        const existingCustomer = await getCustomerByIMEI(clean);
        if (existingCustomer) {
          setMatchedDeviceOwner(existingCustomer);
          const isPriorInq =
            (existingCustomer.purpose && existingCustomer.purpose.toLowerCase().includes('inquiry')) ||
            existingCustomer.status === 'Inquiry';
          if (isPriorInq) {
            setInquiryConversionTarget(existingCustomer);
          }
        } else {
          setMatchedDeviceOwner(null);
        }
      } catch (e) {
        setMatchedDeviceOwner(null);
      }
    } else {
      setMatchedDeviceOwner(null);
    }
  };

  useEffect(() => {
    const params = route?.params || {};
    const init = params.initialValues || {};
    const cust = params.customer || {};

    const convertInquiryId =
      params.convertInquiryId ||
      init.convertInquiryId ||
      cust.convertInquiryId ||
      (cust.id && ((cust.purpose && cust.purpose.toLowerCase().includes('inquiry')) || cust.status === 'Inquiry') ? cust.id : null);

    const hasAnyInitial =
      Boolean(params.initialValues) ||
      Boolean(params.customer) ||
      Boolean(params.convertInquiryId) ||
      Boolean(params.phone) ||
      Boolean(params.imei);

    if (hasAnyInitial) {
      const targetPhone = init.phone ?? cust.phone ?? params.phone;
      const targetName = init.name ?? cust.name ?? params.name;
      const rawModel = init.device_model ?? cust.device_model ?? cust.displayDevice ?? params.device_model;
      const targetModel = (rawModel && rawModel !== 'Device Inquiry' && rawModel !== 'Device') ? rawModel : '';
      const targetImei = init.imei ?? cust.imei ?? cust.displayImei ?? params.imei;
      const targetNotes = init.notes ?? cust.notes ?? cust.issue ?? cust.displayIssue ?? params.notes;
      const targetEmail = init.email ?? cust.email ?? params.email;
      const targetAddress = init.address ?? cust.address ?? params.address;
      const targetCost = init.estimated_cost ?? cust.estimated_cost ?? cust.totalEstimated ?? params.estimated_cost;
      const targetAdvance = init.advance_paid ?? cust.advance_paid ?? cust.totalAdvance ?? params.advance_paid;
      const targetDeliveryDate = init.delivery_date ?? cust.delivery_date ?? cust.displayDueDate ?? params.delivery_date;
      const targetPurpose = init.purpose ?? (convertInquiryId ? 'Repair / Service' : (cust.purpose ?? params.purpose));

      setForm((prev) => ({
        ...prev,
        phone: targetPhone !== undefined && targetPhone !== null ? String(targetPhone) : prev.phone,
        purpose: targetPurpose !== undefined ? targetPurpose : (convertInquiryId ? 'Repair / Service' : prev.purpose),
        name: targetName !== undefined ? targetName : prev.name,
        device_model: targetModel || prev.device_model,
        imei: targetImei !== undefined ? targetImei : prev.imei,
        notes: targetNotes !== undefined ? targetNotes : prev.notes,
        email: targetEmail !== undefined ? targetEmail : prev.email,
        address: targetAddress !== undefined ? targetAddress : prev.address,
        estimated_cost: targetCost != null && targetCost !== '' ? String(targetCost) : prev.estimated_cost,
        advance_paid: targetAdvance != null && targetAdvance !== '' ? String(targetAdvance) : prev.advance_paid,
        delivery_date: targetDeliveryDate !== undefined ? targetDeliveryDate : prev.delivery_date,
        status: convertInquiryId ? 'In Progress' : prev.status,
      }));

      if (convertInquiryId) {
        setInquiryConversionTarget({
          id: convertInquiryId,
          name: targetName || cust.name || 'Walk-in Customer',
          phone: targetPhone || cust.phone || '',
          device_model: targetModel || cust.device_model || '',
          imei: targetImei || cust.imei || '',
          notes: targetNotes || cust.notes || '',
          purpose: 'Inquiry / Quotation',
          estimated_cost: targetCost != null && targetCost !== '' ? String(targetCost) : (cust.estimated_cost ? String(cust.estimated_cost) : ''),
          advance_paid: targetAdvance != null && targetAdvance !== '' ? String(targetAdvance) : (cust.advance_paid ? String(cust.advance_paid) : ''),
          email: targetEmail || cust.email || '',
          address: targetAddress || cust.address || '',
          delivery_date: targetDeliveryDate || cust.delivery_date || '',
        });
        setConvertedMode('Repair / Service');
      } else if (targetImei) {
        checkExistingIMEI(targetImei);
      }
    }
  }, [route?.params]);

  const estimatedNum = parseFloat(form.estimated_cost) || 0;
  const advanceNum = parseFloat(form.advance_paid) || 0;
  const balanceDue = Math.max(0, estimatedNum - advanceNum);

  const imeiValidation = form.imei ? validateIMEI(form.imei) : { valid: false };

  const getDeliveryDatePreset = (daysFromToday) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getPurposeColor = (purpose) => {
    if (!purpose) return { bg: '#F1F5F9', text: '#475569' };
    if (purpose.includes('Repair')) return { bg: '#EFF6FF', text: '#1D4ED8' };
    if (purpose.includes('Purchase')) return { bg: '#ECFDF5', text: '#047857' };
    if (purpose.includes('Inquiry')) return { bg: '#FEF3C7', text: '#B45309' };
    if (purpose.includes('Trade-In') || purpose.includes('Sale')) return { bg: '#FAF5FF', text: '#7E22CE' };
    if (purpose.includes('Warranty')) return { bg: '#FEF2F2', text: '#B91C1C' };
    return { bg: '#F3F4F6', text: '#374151' };
  };

  const handlePhoneChange = async (val) => {
    setForm((prev) => ({ ...prev, phone: val }));
    const cleanDigits = val.replace(/[^0-9]/g, '');

    if (cleanDigits.length >= 2) {
      try {
        const matches = await searchCustomersByPhonePrefix(cleanDigits, 5);
        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);

        // Check if exact match and is in Inquiry category
        const exact = matches.find((m) => m.phone === cleanDigits);
        if (exact && exact.purpose && exact.purpose.toLowerCase().includes('inquiry')) {
          setInquiryConversionTarget(exact);
        } else if (!exact) {
          setInquiryConversionTarget(null);
        }
      } catch (e) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setInquiryConversionTarget(null);
    }
  };

  const selectSuggestion = (customer) => {
    const isCustomerInquiry = Boolean(
      (customer.purpose && customer.purpose.toLowerCase().includes('inquiry')) ||
      customer.status === 'Inquiry'
    );

    setForm((prev) => ({
      ...prev,
      phone: customer.phone,
      name: customer.name,
      purpose: customer.purpose,
      device_model: customer.device_model || prev.device_model,
      imei: customer.imei || prev.imei,
      email: customer.email || prev.email,
      address: customer.address || prev.address,
      notes: customer.notes || prev.notes,
      estimated_cost: customer.estimated_cost != null && customer.estimated_cost !== '' ? String(customer.estimated_cost) : prev.estimated_cost,
      advance_paid: customer.advance_paid != null && customer.advance_paid !== '' ? String(customer.advance_paid) : prev.advance_paid,
      delivery_date: customer.delivery_date || prev.delivery_date,
    }));

    setShowSuggestions(false);

    // If customer is an inquiry, trigger conversion prompt!
    if (isCustomerInquiry) {
      setInquiryConversionTarget(customer);
    } else {
      setInquiryConversionTarget(null);
    }
  };

  const handleConvert = (newPurpose) => {
    setForm((prev) => ({
      ...prev,
      purpose: newPurpose,
      name: inquiryConversionTarget?.name || prev.name || 'Walk-in Customer',
      phone: inquiryConversionTarget?.phone || prev.phone || '',
      device_model: inquiryConversionTarget?.device_model || prev.device_model || '',
      imei: inquiryConversionTarget?.imei || prev.imei || '',
      notes: inquiryConversionTarget?.notes || prev.notes || '',
      email: inquiryConversionTarget?.email || prev.email || '',
      address: inquiryConversionTarget?.address || prev.address || '',
      delivery_date: inquiryConversionTarget?.delivery_date || prev.delivery_date || '',
      estimated_cost:
        inquiryConversionTarget?.estimated_cost != null && inquiryConversionTarget.estimated_cost !== ''
          ? String(inquiryConversionTarget.estimated_cost)
          : prev.estimated_cost,
      advance_paid:
        inquiryConversionTarget?.advance_paid != null && inquiryConversionTarget.advance_paid !== ''
          ? String(inquiryConversionTarget.advance_paid)
          : prev.advance_paid,
    }));
    setConvertedMode(newPurpose);
    Alert.alert(
      '🔄 Purpose Converted',
      `Inquiry converted to "${newPurpose}" with all previous data populated. Review details and tap "Save as ${newPurpose}" to save.`
    );
  };

  const handleIMEIChange = (val) => {
    const cleaned = cleanIMEI(val);
    handleChange('imei', cleaned);
    checkExistingIMEI(cleaned);
  };

  const autofillDeviceOwner = () => {
    if (!matchedDeviceOwner) return;
    setForm((prev) => ({
      ...prev,
      phone: matchedDeviceOwner.phone || prev.phone,
      name: matchedDeviceOwner.name || prev.name,
      device_model: matchedDeviceOwner.device_model || prev.device_model,
      email: matchedDeviceOwner.email || prev.email,
      address: matchedDeviceOwner.address || prev.address,
    }));
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.purpose) {
      Alert.alert('⚠️ Missing Purpose', 'Please select the purpose of customer visit.');
      return;
    }

    if (!isInquiry && !inquiryConversionTarget) {
      if (!form.phone.trim()) {
        Alert.alert('⚠️ Missing Mobile Number', 'Please enter the customer mobile number.');
        return;
      }

      if (!form.name.trim()) {
        Alert.alert('⚠️ Missing Name', 'Please enter the customer name.');
        return;
      }
    }

    setLoading(true);
    try {
      if (inquiryConversionTarget) {
        // Update the existing inquiry customer record and create/sync the repair ticket!
        const finalForm = {
          ...form,
          name: form.name.trim() || inquiryConversionTarget.name || 'Walk-in Customer',
          phone: form.phone.trim() || inquiryConversionTarget.phone || '',
          purpose: form.purpose || 'Repair / Service',
          status: form.status === 'Inquiry' ? 'In Progress' : (form.status || 'In Progress'),
        };
        await convertInquiryToRepair(inquiryConversionTarget.id, finalForm);
        Alert.alert(
          '✅ Inquiry Changed to Repair',
          `Successfully converted inquiry to active repair for ${finalForm.name}.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        const finalForm = {
          ...form,
          name: form.name.trim() || (isInquiry ? 'Walk-in Customer' : ''),
          status: isInquiry ? 'Inquiry' : form.status,
        };
        await addCustomer(finalForm);
        Alert.alert(
          isInquiry ? '✅ Inquiry Logged' : '✅ Customer Saved',
          isInquiry
            ? 'Inquiry recorded successfully. You can convert it to a repair when the customer returns!'
            : 'Customer record was successfully added.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err) {
      console.error('Add/convert customer error:', err);
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
          {/* Section 1: Mobile & Purpose */}
          <FormSection
            title={isInquiry ? '1. Fast Inquiry Contact (Optional)' : '1. Contact & Purpose (Required)'}
          >
            {isInquiry && (
              <View style={styles.inquiryBanner}>
                <Feather name="zap" size={18} color="#B45309" style={{ marginRight: 8, marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inquiryBannerTitle}>⚡ Fast Inquiry Mode Active</Text>
                  <Text style={styles.inquiryBannerText}>
                    Mobile number and customer name are optional. Capture inquiry notes and quote to remember. Entering a number will still find existing customers.
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.inputLabel}>
              {isInquiry ? 'Mobile Number (Optional for Inquiry)' : 'Mobile Number *'}
            </Text>
            <FormInput
              placeholder={
                isInquiry
                  ? 'e.g. 9876543210 (optional - auto-fills if entered)'
                  : 'e.g. 9876543210 (type to search existing)'
              }
              value={form.phone}
              onChange={handlePhoneChange}
              keyboard="phone-pad"
              autoFocus
            />

            {/* Real-time Phone Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                <View style={styles.suggestionsHeader}>
                  <Feather name="search" size={13} color={colors.primary} />
                  <Text style={styles.suggestionsHeaderText}>
                    Existing Customers Found ({suggestions.length}):
                  </Text>
                </View>
                {suggestions.map((cust) => {
                  const badgeStyle = getPurposeColor(cust.purpose);
                  return (
                    <TouchableOpacity
                      key={cust.id}
                      style={styles.suggestionItem}
                      activeOpacity={0.7}
                      onPress={() => selectSuggestion(cust)}
                    >
                      <View style={styles.suggestionAvatar}>
                        <Text style={styles.suggestionAvatarText}>
                          {getInitials(cust.name)}
                        </Text>
                      </View>
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionName} numberOfLines={1}>
                          {cust.name}
                        </Text>
                        <Text style={styles.suggestionSub}>
                          {cust.phone} {cust.device_model ? `• ${cust.device_model}` : ''}
                        </Text>
                      </View>
                      <View style={[styles.suggestionBadge, { backgroundColor: badgeStyle.bg }]}>
                        <Text style={[styles.suggestionBadgeText, { color: badgeStyle.text }]}>
                          {cust.purpose}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Smart Inquiry Conversion Card */}
            {inquiryConversionTarget && (
              <View style={styles.conversionCard}>
                <View style={styles.conversionHeader}>
                  <Feather name="help-circle" size={18} color="#D97706" />
                  <Text style={styles.conversionTitle}>
                    {convertedMode
                      ? `Converting Inquiry to ${convertedMode}`
                      : 'Existing Inquiry Detected'}
                  </Text>
                </View>
                <Text style={styles.conversionDesc}>
                  <Text style={{ fontWeight: '700' }}>{inquiryConversionTarget.name}</Text>{' '}
                  {convertedMode
                    ? `inquiry details are pre-filled below for ${inquiryConversionTarget.device_model || 'device'}. Review and adjust details as needed.`
                    : `previously visited for an Inquiry${
                        inquiryConversionTarget.device_model
                          ? ` on ${inquiryConversionTarget.device_model}`
                          : ''
                      }${
                        inquiryConversionTarget.notes
                          ? ` ("${inquiryConversionTarget.notes}")`
                          : ''
                      }.`}
                </Text>
                {!convertedMode && (
                  <>
                    <Text style={styles.conversionPrompt}>
                      Do you want to change this inquiry into a Repair or a Purchase?
                    </Text>

                    <View style={styles.conversionBtnRow}>
                      <TouchableOpacity
                        style={[
                          styles.conversionActionBtn,
                          styles.btnConvertRepair,
                          convertedMode === 'Repair / Service' && styles.btnActive,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => handleConvert('Repair / Service')}
                      >
                        <Feather name="tool" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.conversionBtnText}>Change to Repair</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.conversionActionBtn,
                          styles.btnConvertPurchase,
                          convertedMode === 'Purchase / Accessory' && styles.btnActive,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => handleConvert('Purchase / Accessory')}
                      >
                        <Feather name="shopping-bag" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.conversionBtnText}>Change to Purchase</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}

            <Text style={styles.inputLabel}>Purpose of Visit *</Text>
            <FormPicker
              selectedValue={form.purpose}
              onValueChange={(val) => handleChange('purpose', val)}
              options={PURPOSE_OPTIONS}
              placeholder="Select Purpose of Visit *"
            />

            <Text style={styles.inputLabel}>
              {isInquiry ? 'Customer Name (Optional)' : 'Customer Name *'}
            </Text>
            <FormInput
              placeholder={isInquiry ? 'Optional (defaults to Walk-in Customer)' : 'Full Name (e.g. Rahul Sharma)'}
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
                  onChange={(val) => handleIMEIChange(val)}
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

            {/* Recognized Device Owner Banner */}
            {matchedDeviceOwner && (
              <View style={styles.deviceMatchCard}>
                <View style={styles.deviceMatchHeader}>
                  <Feather name="check-circle" size={15} color="#059669" />
                  <Text style={styles.deviceMatchTitle}>Device Recognized in System</Text>
                </View>
                <Text style={styles.deviceMatchDesc}>
                  Previously registered to <Text style={{ fontWeight: '700' }}>{matchedDeviceOwner.name}</Text> ({matchedDeviceOwner.phone})
                  {matchedDeviceOwner.device_model ? ` • ${matchedDeviceOwner.device_model}` : ''}
                  {`\nLast Visit: ${matchedDeviceOwner.purpose}`}
                </Text>
                <TouchableOpacity
                  style={styles.autofillBtn}
                  onPress={autofillDeviceOwner}
                  activeOpacity={0.8}
                >
                  <Feather name="user-check" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.autofillBtnText}>Autofill Customer Details</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.inputLabel}>
              {isInquiry ? 'Notes to Remember * (Inquiry Query & Remarks)' : 'Problem / Service Notes'}
            </Text>
            <FormInput
              placeholder={
                isInquiry
                  ? 'What did the customer inquire about? (e.g. Screen replacement quote, battery change query, remarks)'
                  : 'Describe issue, parts needed, or customer remarks'
              }
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
                <Text style={styles.inputLabel}>
                  {isInquiry ? 'Quotation Estimate (Optional)' : 'Estimated Cost & Advance'}
                </Text>
                <View
                  style={[
                    styles.billingBadge,
                    isInquiry && { backgroundColor: '#FEF3C7' },
                  ]}
                >
                  <Text
                    style={[
                      styles.billingBadgeText,
                      isInquiry && { color: '#B45309' },
                    ]}
                  >
                    {isInquiry ? 'Quotation' : 'Payment Khata'}
                  </Text>
                </View>
              </View>

              {isInquiry ? (
                <View style={{ marginTop: 4 }}>
                  <Text style={styles.paymentFieldLabel}>Quoted Amount (₹)</Text>
                  <FormInput
                    placeholder="e.g. 1500 (quote given to customer)"
                    value={form.estimated_cost}
                    onChange={(val) => handleChange('estimated_cost', val)}
                    keyboard="numeric"
                  />
                </View>
              ) : (
                <>
                  <View style={styles.paymentInputsRow}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={styles.paymentFieldLabel}>Total Amount (₹)</Text>
                      <FormInput
                        placeholder="e.g. 2500"
                        value={form.estimated_cost}
                        onChange={(val) => handleChange('estimated_cost', val)}
                        keyboard="numeric"
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={styles.paymentFieldLabel}>Advance Paid (₹)</Text>
                      <FormInput
                        placeholder="e.g. 500"
                        value={form.advance_paid}
                        onChange={(val) => handleChange('advance_paid', val)}
                        keyboard="numeric"
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
                </>
              )}
            </View>
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
                <Text style={styles.submitText}>
                  {inquiryConversionTarget && convertedMode
                    ? `Save as ${convertedMode}`
                    : isInquiry
                    ? 'Save Inquiry Record'
                    : 'Save Customer Record'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <IMEIScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(scannedImei) => handleIMEIChange(scannedImei)}
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
  suggestionsBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 14,
    overflow: 'hidden',
    ...shadows.card,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  suggestionsHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  suggestionAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  suggestionSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  suggestionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginLeft: 6,
  },
  suggestionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  conversionCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 14,
  },
  conversionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  conversionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
    marginLeft: 6,
  },
  conversionDesc: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: 8,
  },
  conversionPrompt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 10,
  },
  conversionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  conversionActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    ...shadows.button,
  },
  btnConvertRepair: {
    backgroundColor: colors.primary,
  },
  btnConvertPurchase: {
    backgroundColor: '#16A34A',
  },
  btnActive: {
    borderWidth: 2,
    borderColor: '#000000',
  },
  conversionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
  deviceMatchCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    padding: 12,
    marginTop: -4,
    marginBottom: 12,
  },
  deviceMatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  deviceMatchTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  deviceMatchDesc: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
    marginBottom: 8,
  },
  autofillBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    ...shadows.button,
  },
  autofillBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
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
  inquiryBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 16,
  },
  inquiryBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  inquiryBannerText: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
  },
});
