// components/QuickCustomerEntryModal.js
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import IMEIScannerModal from './IMEIScannerModal';
import { borderRadius, colors, shadows } from '../constants/theme';
import { useShop } from '../context/ShopContext';
import {
  addCustomer,
  findOrCreateCustomer,
  formatTokenNumber,
  getCustomerByIMEI,
  recordSale,
  searchCustomersByPhonePrefix,
  searchItems,
  validateEntryIdentifier,
} from '../database/Helper';
import { cleanIMEI, formatIMEI, validateIMEI } from '../utils/imei';
import { isUnconvertedEnquiry } from '../utils/enquiries';

export const ACTION_TYPES = [
  { id: 'Enquiry', label: 'Enquiry', icon: 'help-circle', color: '#D97706', bg: '#FEF3C7', border: '#F59E0B' },
  { id: 'Repair', label: 'Repair', icon: 'tool', color: colors.primary, bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'Purchase', label: 'Purchase', icon: 'shopping-bag', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
];

export function buildJobSheetWhatsAppMessage({
  shopName,
  tokenNumber,
  customerName,
  phone,
  altPhone,
  deviceModel,
  imei,
  issue,
  passcode,
  passcodeDisabled,
  simReturned,
  sdReturned,
  deliveryDate,
  estimatedCost,
  advancePaid,
  status = 'In Progress',
}) {
  const est = parseFloat(estimatedCost) || 0;
  const adv = parseFloat(advancePaid) || 0;
  const bal = Math.max(0, est - adv);

  const lines = [
    `📱 *REPAIR ESTIMATE & JOB SHEET*`,
    `🏪 *${shopName || 'Cellventory'}*`,
    tokenNumber ? `🎟️ *Token No:* #${tokenNumber}` : null,
    `--------------------------------`,
    `👤 *Customer:* ${customerName || 'Walk-in Customer'}`,
    phone ? `📞 *Phone:* ${phone}` : null,
    altPhone ? `📱 *Alt Contact:* ${altPhone}` : null,
    `📱 *Device:* ${deviceModel || 'Device'}`,
    imei ? `🔢 *IMEI:* ${formatIMEI(imei)}` : null,
    `🔐 *Device Passcode:* ${passcodeDisabled ? 'Disabled / None' : (passcode || 'Not Provided')}`,
    `📦 *Intake Checklist:*`,
    `• SIM Card: ${simReturned ? 'Returned to Customer' : 'Retained with Shop'}`,
    `• Memory Card: ${sdReturned ? 'Returned to Customer' : 'None / Not Present'}`,
    issue ? `📝 *Reported Issue:* ${issue}` : null,
    deliveryDate ? `📅 *Promised Date:* ${deliveryDate}` : null,
    `--------------------------------`,
    est > 0 ? `💰 *Est. Amount:* ₹${est}` : null,
    adv > 0 ? `💵 *Advance Paid:* ₹${adv}` : null,
    bal > 0
      ? `⚠️ *Balance Due on Pickup:* ₹${bal}`
      : est > 0
      ? `✅ *Balance:* Fully Paid`
      : null,
    `🔄 *Status:* ${status}`,
    `--------------------------------`,
    `Thank you for trusting ${shopName || 'our shop'}! 🙏`,
  ].filter(Boolean);

  return lines.join('\n');
}

export default function QuickCustomerEntryModal({
  visible,
  onClose,
  onSuccess,
  initialAction = 'Enquiry',
  initialImei = '',
  initialCustomer = null,
  sourceInquiryId = null,
}) {
  let shopContext = {};
  try {
    shopContext = useShop() || {};
  } catch (e) {
    shopContext = {};
  }
  const shopName = shopContext.shopName || 'Cellventory';
  const insets = useSafeAreaInsets();
  const bottomSafePad = Math.max((insets?.bottom || 0) + 12, Platform.OS === 'android' ? 56 : 24);
  const scrollRef = useRef(null);
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 180);
  };

  const [actionType, setActionType] = useState(initialAction);

  // Step 1: Identifiers (Rule 1 & Rule 5: Phone or IMEI required, Customer Name removed, Alt Phone added)
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [imei, setImei] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState(null);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Step 2 Fields
  // Enquiry
  const [enquiryDevice, setEnquiryDevice] = useState('');
  const [enquiryNotes, setEnquiryNotes] = useState('');
  const [enquiryQuote, setEnquiryQuote] = useState('');

  // Repair (Rule 2: Passcode & Disable Checkbox; Rule 3: SIM & SD Returned Checkboxes)
  const [repairDevice, setRepairDevice] = useState('');
  const [repairIssue, setRepairIssue] = useState('');
  const [repairDeliveryDate, setRepairDeliveryDate] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [repairAdvance, setRepairAdvance] = useState('');
  const [passcode, setPasscode] = useState('');
  const [passcodeDisabled, setPasscodeDisabled] = useState(false);
  const [simReturned, setSimReturned] = useState(true);
  const [sdReturned, setSdReturned] = useState(false);

  // Purchase (Option A: Stock-out / Sale)
  const [itemQuery, setItemQuery] = useState('');
  const [itemResults, setItemResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saleQty, setSaleQty] = useState('1');
  const [salePrice, setSalePrice] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setActionType(initialAction || 'Enquiry');
      setPhone(initialCustomer?.phone || '');
      setAltPhone(initialCustomer?.alt_phone || '');
      const cleanedInitImei = cleanIMEI(initialCustomer?.imei || initialImei || '');
      setImei(cleanedInitImei);
      setMatchedCustomer(initialCustomer);
      setEnquiryDevice('');
      setEnquiryNotes('');
      setEnquiryQuote('');
      setRepairDevice('');
      setRepairIssue('');
      setRepairDeliveryDate('');
      setRepairCost('');
      setRepairAdvance('');
      setPasscode('');
      setPasscodeDisabled(false);
      setSimReturned(true);
      setSdReturned(false);
      setItemQuery('');
      setItemResults([]);
      setSelectedItem(null);
      setSaleQty('1');
      setSalePrice('');
      setPaymentMode('Cash');
      setErrorMessage('');

      if (cleanedInitImei && !initialCustomer) {
        handleImeiChange(cleanedInitImei);
      }
    }
  }, [visible, initialAction, initialImei, initialCustomer]);

  // Live phone lookup
  const handlePhoneChange = async (val) => {
    setPhone(val);
    setErrorMessage('');
    const cleanDigits = val.replace(/[^0-9]/g, '');
    if (cleanDigits.length >= 3) {
      try {
        const matches = await searchCustomersByPhonePrefix(cleanDigits, 3);
        const exact = matches.find((m) => m.phone === cleanDigits) || matches[0];
        if (exact) {
          setMatchedCustomer(exact);
          if (exact.alt_phone && !altPhone) setAltPhone(exact.alt_phone);
          if (!enquiryDevice && exact.device_model) setEnquiryDevice(exact.device_model);
          if (!repairDevice && exact.device_model) setRepairDevice(exact.device_model);
        } else {
          setMatchedCustomer(null);
        }
      } catch (e) {
        setMatchedCustomer(null);
      }
    } else {
      setMatchedCustomer(null);
    }
  };

  // Live IMEI lookup
  const handleImeiChange = async (val) => {
    const cleaned = cleanIMEI(val);
    setImei(cleaned);
    setErrorMessage('');
    if (cleaned.length >= 6) {
      try {
        const deviceOwner = await getCustomerByIMEI(cleaned);
        if (deviceOwner) {
          setMatchedCustomer(deviceOwner);
          if (!phone && deviceOwner.phone) setPhone(deviceOwner.phone);
          if (!altPhone && deviceOwner.alt_phone) setAltPhone(deviceOwner.alt_phone);
          if (!enquiryDevice && deviceOwner.device_model) setEnquiryDevice(deviceOwner.device_model);
          if (!repairDevice && deviceOwner.device_model) setRepairDevice(deviceOwner.device_model);
        }
      } catch (e) {}
    }
  };

  const handleBarcodeScanned = (scannedCode) => {
    const cleaned = cleanIMEI(scannedCode);
    setScannerVisible(false);
    handleImeiChange(cleaned);
  };

  // Quick delivery date preset
  const setDeliveryPreset = (daysFromToday) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setRepairDeliveryDate(`${year}-${month}-${day}`);
  };

  // Search inventory for Purchase
  const handleItemSearch = async (text) => {
    setItemQuery(text);
    if (!text.trim()) {
      setItemResults([]);
      return;
    }
    try {
      const results = await searchItems(text.trim());
      setItemResults(results.slice(0, 5));
    } catch (e) {
      setItemResults([]);
    }
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setItemQuery(item.name);
    setSalePrice(item.selling_price != null ? String(item.selling_price) : '');
    setItemResults([]);
  };

  // Validation (Rule 1: Either phone or IMEI is mandatory)
  const validateForm = () => {
    const idCheck = validateEntryIdentifier({ phone, imei });
    if (!idCheck.valid && !(actionType === 'Purchase' && sourceInquiryId)) {
      setErrorMessage(idCheck.error);
      return false;
    }

    if (actionType === 'Enquiry') {
      if (!enquiryNotes.trim()) {
        setErrorMessage('Please enter the customer enquiry notes or query.');
        return false;
      }
    } else if (actionType === 'Repair') {
      const dev = repairDevice || enquiryDevice || matchedCustomer?.device_model;
      if (!dev || !dev.trim()) {
        setErrorMessage('Device model is required for a Repair job.');
        return false;
      }
      if (!repairIssue.trim()) {
        setErrorMessage('Please describe the repair issue or problem.');
        return false;
      }
    } else if (actionType === 'Purchase') {
      const itemName = selectedItem ? selectedItem.name : itemQuery.trim();
      if (!itemName) {
        setErrorMessage('Please select or enter the item being purchased.');
        return false;
      }
      const priceNum = parseFloat(salePrice);
      if (isNaN(priceNum) || priceNum < 0) {
        setErrorMessage('Please enter a valid selling price.');
        return false;
      }
    }

    setErrorMessage('');
    return true;
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      const cleanPhoneDigits = phone.replace(/[^0-9]/g, '');
      const cleanAltPhoneDigits = altPhone.replace(/[^0-9]/g, '');
      const cleanImeiDigits = cleanIMEI(imei);
      const finalName = matchedCustomer?.name || 'Walk-in Customer';

      if (actionType === 'Enquiry') {
        const dev = enquiryDevice.trim() || repairDevice.trim() || matchedCustomer?.device_model || '';
        const created = await addCustomer({
          phone: cleanPhoneDigits,
          alt_phone: cleanAltPhoneDigits,
          name: finalName,
          purpose: 'Enquiry',
          status: 'Enquiry',
          device_model: dev,
          imei: cleanImeiDigits,
          notes: enquiryNotes.trim(),
          estimated_cost: enquiryQuote ? String(enquiryQuote) : '0',
        });
        Alert.alert('✅ Enquiry Logged', `Enquiry successfully recorded for ${finalName}.`);
        onClose();
        if (onSuccess) onSuccess(created);
      } else if (actionType === 'Repair') {
        const dev = repairDevice.trim() || enquiryDevice.trim() || matchedCustomer?.device_model || 'Device';
        const created = await addCustomer({
          phone: cleanPhoneDigits,
          alt_phone: cleanAltPhoneDigits,
          name: finalName,
          purpose: 'Repair',
          status: 'In Progress',
          device_model: dev,
          imei: cleanImeiDigits,
          notes: repairIssue.trim(),
          delivery_date: repairDeliveryDate.trim(),
          estimated_cost: repairCost ? String(repairCost) : '0',
          advance_paid: repairAdvance ? String(repairAdvance) : '0',
          passcode: passcodeDisabled ? '' : passcode.trim(),
          passcode_disabled: passcodeDisabled ? 1 : 0,
          sim_returned: simReturned ? 1 : 0,
          sd_returned: sdReturned ? 1 : 0,
        });

        const tokenNum = formatTokenNumber(created.repair_id || created.id);
        const rawContact = cleanPhoneDigits || cleanAltPhoneDigits;
        const contactTarget = rawContact && rawContact.length === 10 ? '91' + rawContact : rawContact;

        if (contactTarget) {
          Alert.alert(
            `✅ Repair Created (#${tokenNum})`,
            `Job registered with Token #${tokenNum} for ${finalName}.\n\nWould you like to send the 1-Tap Job Sheet via WhatsApp?`,
            [
              {
                text: 'Done',
                style: 'cancel',
                onPress: () => {
                  onClose();
                  if (onSuccess) onSuccess(created);
                },
              },
              {
                text: '📲 Send WhatsApp',
                style: 'default',
                onPress: () => {
                  const jobMsg = buildJobSheetWhatsAppMessage({
                    shopName,
                    tokenNumber: tokenNum,
                    customerName: finalName,
                    phone: cleanPhoneDigits,
                    altPhone: cleanAltPhoneDigits,
                    deviceModel: dev,
                    imei: cleanImeiDigits,
                    issue: repairIssue.trim(),
                    passcode: passcodeDisabled ? '' : passcode.trim(),
                    passcodeDisabled,
                    simReturned,
                    sdReturned,
                    deliveryDate: repairDeliveryDate.trim(),
                    estimatedCost: repairCost,
                    advancePaid: repairAdvance,
                    status: 'In Progress',
                  });

                  Linking.openURL(`https://wa.me/${contactTarget}?text=${encodeURIComponent(jobMsg)}`).catch(() => {
                    Alert.alert('Unable to open WhatsApp', 'Please ensure WhatsApp is installed.');
                  });
                  onClose();
                  if (onSuccess) onSuccess(created);
                },
              },
            ]
          );
        } else {
          Alert.alert('✅ Repair Created', `Token #${tokenNum} registered for ${finalName}.`);
          onClose();
          if (onSuccess) onSuccess(created);
        }
      } else if (actionType === 'Purchase') {
        const itemName = selectedItem ? selectedItem.name : itemQuery.trim();
        const priceNum = parseFloat(salePrice) || 0;
        const qtyNum = parseInt(saleQty, 10) || 1;
        let saleCustomer = sourceInquiryId ? initialCustomer : matchedCustomer;
        if (!saleCustomer && cleanPhoneDigits) {
          const matches = await searchCustomersByPhonePrefix(cleanPhoneDigits, 3);
          saleCustomer =
            matches.find((customer) => customer.phone === cleanPhoneDigits) || matches[0] || null;
        }
        const inquiryIdForSale =
          sourceInquiryId || (isUnconvertedEnquiry(saleCustomer) ? saleCustomer.id : null);

        const saleRes = await recordSale({
          item_id: selectedItem?.id || null,
          item_name: itemName,
          category: selectedItem?.category || 'Accessory',
          quantity: qtyNum,
          cost_price: selectedItem?.cost_price || 0,
          sold_price: priceNum,
          payment_mode: paymentMode,
          customer_name: saleCustomer?.name || finalName,
          customer_phone: cleanPhoneDigits || saleCustomer?.phone || '',
          customer_id: sourceInquiryId || saleCustomer?.id || null,
          convert_inquiry_id: inquiryIdForSale,
        });

        if (cleanPhoneDigits && !saleCustomer && !sourceInquiryId) {
          await findOrCreateCustomer({
            name: finalName,
            phone: cleanPhoneDigits,
            alt_phone: cleanAltPhoneDigits,
            purpose: 'Purchase',
          });
        }

        Alert.alert(
          '✅ Sale Recorded',
          `Sold ${qtyNum}x ${itemName} for ₹${priceNum * qtyNum} (${paymentMode}). Inventory updated.`
        );
        onClose();
        if (onSuccess) onSuccess(saleRes);
      }
    } catch (err) {
      console.error('Quick Entry Error:', err);
      Alert.alert('Error', err.message || 'Failed to complete entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { paddingBottom: bottomSafePad }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {sourceInquiryId ? 'Convert Enquiry to Purchase' : '⚡ New Customer Entry'}
              </Text>
              <Text style={styles.modalSub}>
                {sourceInquiryId ? 'Record the sale to complete this conversion' : 'Fast intake under 10 seconds'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step 1: Customer / Device Identifier */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Feather name="user-check" size={14} color={colors.primary} />
                <Text style={styles.sectionTitle}>1. Customer / Device Identifier (Either Required)</Text>
              </View>

              {matchedCustomer && (
                <View style={styles.matchBadge}>
                  <Feather name="check-circle" size={13} color="#059669" style={{ marginRight: 5 }} />
                  <Text style={styles.matchText}>
                    Known: <Text style={{ fontWeight: '800' }}>{matchedCustomer.name}</Text>
                    {matchedCustomer.device_model ? ` • ${matchedCustomer.device_model}` : ''}
                  </Text>
                </View>
              )}

              {/* Mobile Input */}
              <Text style={styles.fieldLabel}>Mobile Number (10 Digits)</Text>
              <View style={styles.inputWrap}>
                <Feather name="phone" size={15} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 9876543210 (required if no IMEI)"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Alternative Contact Number (Rule 5) */}
              <Text style={styles.fieldLabel}>Alternative Contact Number (Optional)</Text>
              <View style={styles.inputWrap}>
                <Feather name="phone-call" size={15} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 9876500000 (Family/Work)"
                  value={altPhone}
                  onChangeText={setAltPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* IMEI Input with Camera Scan */}
              <Text style={styles.fieldLabel}>IMEI / Serial Number</Text>
              <View style={styles.inputWrap}>
                <Feather name="hash" size={15} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="e.g. 862900030123457 (required if no phone)"
                  value={formatIMEI(imei)}
                  onChangeText={handleImeiChange}
                  keyboardType="numeric"
                  maxLength={18}
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => setScannerVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                  <Text style={styles.scanBtnText}>Scan</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Step 2: Strictly 3 Action Types */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Feather name="layers" size={14} color={colors.primary} />
                <Text style={styles.sectionTitle}>2. Select Action Type</Text>
              </View>

              {/* 3-Way Selector */}
              <View style={styles.actionTabRow}>
                {ACTION_TYPES.map((action) => {
                  const isSelected = actionType === action.id;
                  return (
                    <TouchableOpacity
                      key={action.id}
                      style={[
                        styles.actionTab,
                        isSelected && { backgroundColor: action.bg, borderColor: action.border, borderWidth: 2 },
                      ]}
                      onPress={() => {
                        setActionType(action.id);
                        setErrorMessage('');
                      }}
                      activeOpacity={0.8}
                    >
                      <Feather
                        name={action.icon}
                        size={15}
                        color={isSelected ? action.color : colors.textMuted}
                        style={{ marginBottom: 4 }}
                      />
                      <Text
                        style={[
                          styles.actionTabLabel,
                          isSelected && { color: action.color, fontWeight: '800' },
                        ]}
                      >
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action-Specific Form Fields */}
              {actionType === 'Enquiry' && (
                <View style={styles.actionFormWrap}>
                  <Text style={styles.fieldLabel}>Device Model (Optional)</Text>
                  <TextInput
                    style={styles.plainInput}
                    placeholder="e.g. iPhone 13 / Samsung A52"
                    value={enquiryDevice}
                    onChangeText={setEnquiryDevice}
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={styles.fieldLabel}>Enquiry Query & Notes *</Text>
                  <TextInput
                    style={[styles.plainInput, styles.multilineInput]}
                    placeholder="What is the customer inquiring about? (e.g. Screen replacement quote)"
                    value={enquiryNotes}
                    onChangeText={setEnquiryNotes}
                    multiline
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={styles.fieldLabel}>Quoted Amount (₹) (Optional)</Text>
                  <TextInput
                    style={styles.plainInput}
                    placeholder="e.g. 1500 (estimate given)"
                    value={enquiryQuote}
                    onChangeText={setEnquiryQuote}
                    keyboardType="numeric"
                    onFocus={scrollToBottom}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}

              {actionType === 'Repair' && (
                <View style={styles.actionFormWrap}>
                  <Text style={styles.fieldLabel}>Device Model *</Text>
                  <TextInput
                    style={styles.plainInput}
                    placeholder="e.g. iPhone 13 Pro"
                    value={repairDevice}
                    onChangeText={setRepairDevice}
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={styles.fieldLabel}>Issue / Problem Description *</Text>
                  <TextInput
                    style={[styles.plainInput, styles.multilineInput]}
                    placeholder="Describe problem (e.g. Screen cracked, touch not working)"
                    value={repairIssue}
                    onChangeText={setRepairIssue}
                    multiline
                    placeholderTextColor={colors.textMuted}
                  />

                  {/* Device Passcode / Pattern & Checkbox (Rule 2) */}
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.fieldLabel}>Device Passcode / PIN / Pattern</Text>
                    <TextInput
                      style={[styles.plainInput, passcodeDisabled && styles.disabledInput]}
                      placeholder={passcodeDisabled ? 'Passcode Disabled / None' : 'e.g. 1234 or Pattern description'}
                      value={passcode}
                      onChangeText={setPasscode}
                      editable={!passcodeDisabled}
                      placeholderTextColor={colors.textMuted}
                    />
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => {
                        const nextDisabled = !passcodeDisabled;
                        setPasscodeDisabled(nextDisabled);
                        if (nextDisabled) setPasscode('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={passcodeDisabled ? 'check-square' : 'square'}
                        size={17}
                        color={passcodeDisabled ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.checkboxLabel, passcodeDisabled && { color: colors.primary, fontWeight: '700' }]}>
                        No Passcode / Passcode Disabled
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* SIM Card & Memory Card Returned Checklist (Rule 3) */}
                  <View style={styles.checklistSection}>
                    <Text style={styles.checklistHeader}>Intake Checklist (Dispute Prevention)</Text>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setSimReturned(!simReturned)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={simReturned ? 'check-square' : 'square'}
                        size={17}
                        color={simReturned ? '#059669' : colors.textMuted}
                      />
                      <Text style={[styles.checkboxLabel, simReturned && { color: '#059669', fontWeight: '700' }]}>
                        SIM Card Returned to Customer
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setSdReturned(!sdReturned)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={sdReturned ? 'check-square' : 'square'}
                        size={17}
                        color={sdReturned ? '#059669' : colors.textMuted}
                      />
                      <Text style={[styles.checkboxLabel, sdReturned && { color: '#059669', fontWeight: '700' }]}>
                        Memory / SD Card Returned to Customer
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.fieldLabel}>Promised Delivery Date</Text>
                  <View style={styles.dateChipsRow}>
                    {[
                      { label: 'Today', days: 0 },
                      { label: 'Tomorrow', days: 1 },
                      { label: 'In 2 Days', days: 2 },
                      { label: 'In 3 Days', days: 3 },
                    ].map((d) => (
                      <TouchableOpacity
                        key={d.label}
                        style={styles.dateChip}
                        onPress={() => setDeliveryPreset(d.days)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.dateChipText}>{d.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.plainInput}
                    placeholder="YYYY-MM-DD (e.g. 2026-11-23)"
                    value={repairDeliveryDate}
                    onChangeText={setRepairDeliveryDate}
                    placeholderTextColor={colors.textMuted}
                  />

                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={styles.fieldLabel}>Total Estimate (₹)</Text>
                      <TextInput
                        style={styles.plainInput}
                        placeholder="e.g. 2500"
                        value={repairCost}
                        onChangeText={setRepairCost}
                        keyboardType="numeric"
                        onFocus={scrollToBottom}
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={styles.fieldLabel}>Advance Paid (₹)</Text>
                      <TextInput
                        style={styles.plainInput}
                        placeholder="e.g. 500"
                        value={repairAdvance}
                        onChangeText={setRepairAdvance}
                        keyboardType="numeric"
                        onFocus={scrollToBottom}
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                </View>
              )}

              {actionType === 'Purchase' && (
                <View style={styles.actionFormWrap}>
                  <Text style={styles.fieldLabel}>Search Stock or Enter Item *</Text>
                  <TextInput
                    style={styles.plainInput}
                    placeholder="e.g. Screen Guard / Charger / Earphones"
                    value={itemQuery}
                    onChangeText={handleItemSearch}
                    placeholderTextColor={colors.textMuted}
                  />

                  {/* Search Results Dropdown */}
                  {itemResults.length > 0 && (
                    <View style={styles.searchResultsBox}>
                      {itemResults.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.searchResultRow}
                          onPress={() => handleSelectItem(item)}
                        >
                          <Text style={styles.searchResultName}>{item.name}</Text>
                          <Text style={styles.searchResultMeta}>
                            Stock: {item.quantity} • ₹{item.selling_price}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={styles.fieldLabel}>Quantity</Text>
                      <View style={styles.qtyStepper}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => setSaleQty(String(Math.max(1, (parseInt(saleQty, 10) || 1) - 1)))}
                        >
                          <Feather name="minus" size={14} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{saleQty}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => setSaleQty(String((parseInt(saleQty, 10) || 1) + 1))}
                        >
                          <Feather name="plus" size={14} color={colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={styles.fieldLabel}>Selling Price (₹) *</Text>
                      <TextInput
                        style={styles.plainInput}
                        placeholder="e.g. 299"
                        value={salePrice}
                        onChangeText={setSalePrice}
                        keyboardType="numeric"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>Payment Mode</Text>
                  <View style={styles.paymentChipsRow}>
                    {['Cash', 'UPI', 'Card'].map((pm) => (
                      <TouchableOpacity
                        key={pm}
                        style={[
                          styles.paymentChip,
                          paymentMode === pm && styles.paymentChipActive,
                        ]}
                        onPress={() => setPaymentMode(pm)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.paymentChipText,
                            paymentMode === pm && styles.paymentChipTextActive,
                          ]}
                        >
                          {pm}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                actionType === 'Enquiry' && { backgroundColor: '#D97706' },
                actionType === 'Purchase' && { backgroundColor: '#059669' },
                loading && { opacity: 0.6 },
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.submitRow}>
                  <Feather name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitText}>
                    {actionType === 'Enquiry'
                      ? 'Save Enquiry'
                      : actionType === 'Repair'
                      ? 'Create Repair Job'
                      : 'Record Purchase & Sale'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>

        {/* Camera Barcode/IMEI Scanner Modal */}
        <IMEIScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScan={handleBarcodeScanned}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    ...shadows.header,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.full,
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollBodyContent: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: colors.textPrimary,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginLeft: 6,
    gap: 4,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  matchText: {
    fontSize: 12,
    color: '#065F46',
  },
  actionTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionTab: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionTabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  actionFormWrap: {
    marginTop: 4,
  },
  plainInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    color: colors.textPrimary,
  },
  disabledInput: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.textMuted,
  },
  multilineInput: {
    height: 70,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  checkboxLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  checklistSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checklistHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rowInputs: {
    flexDirection: 'row',
    marginTop: 4,
  },
  searchResultsBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    marginTop: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  searchResultRow: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  searchResultMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    height: 42,
  },
  qtyBtn: {
    width: 36,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paymentChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  paymentChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  paymentChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  paymentChipTextActive: {
    color: '#FFFFFF',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
