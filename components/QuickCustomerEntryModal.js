// components/QuickCustomerEntryModal.js
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import IMEIScannerModal from './IMEIScannerModal';
import { borderRadius, colors, shadows } from '../constants/theme';
import {
  addCustomer,
  findOrCreateCustomer,
  getCustomerByIMEI,
  recordSale,
  searchCustomersByPhonePrefix,
  searchItems,
  validateEntryIdentifier,
} from '../database/Helper';
import { cleanIMEI, formatIMEI, validateIMEI } from '../utils/imei';

export const ACTION_TYPES = [
  { id: 'Enquiry', label: 'Enquiry', icon: 'help-circle', color: '#D97706', bg: '#FEF3C7', border: '#F59E0B' },
  { id: 'Repair', label: 'Repair', icon: 'tool', color: colors.primary, bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'Purchase', label: 'Purchase', icon: 'shopping-bag', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
];

export default function QuickCustomerEntryModal({ visible, onClose, onSuccess, initialAction = 'Enquiry' }) {
  const [actionType, setActionType] = useState(initialAction);

  // Step 1: Identifiers
  const [phone, setPhone] = useState('');
  const [imei, setImei] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState(null);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Step 2 Fields
  // Enquiry
  const [enquiryDevice, setEnquiryDevice] = useState('');
  const [enquiryNotes, setEnquiryNotes] = useState('');
  const [enquiryQuote, setEnquiryQuote] = useState('');

  // Repair
  const [repairDevice, setRepairDevice] = useState('');
  const [repairIssue, setRepairIssue] = useState('');
  const [repairDeliveryDate, setRepairDeliveryDate] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [repairAdvance, setRepairAdvance] = useState('');

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
      setPhone('');
      setImei('');
      setCustomerName('');
      setMatchedCustomer(null);
      setEnquiryDevice('');
      setEnquiryNotes('');
      setEnquiryQuote('');
      setRepairDevice('');
      setRepairIssue('');
      setRepairDeliveryDate('');
      setRepairCost('');
      setRepairAdvance('');
      setItemQuery('');
      setItemResults([]);
      setSelectedItem(null);
      setSaleQty('1');
      setSalePrice('');
      setPaymentMode('Cash');
      setErrorMessage('');
    }
  }, [visible, initialAction]);

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
          if (!customerName) setCustomerName(exact.name || '');
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
          if (!customerName) setCustomerName(deviceOwner.name || '');
          if (!phone && deviceOwner.phone) setPhone(deviceOwner.phone);
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

  // Validation
  const validateForm = () => {
    const idCheck = validateEntryIdentifier({ phone, imei });
    if (!idCheck.valid) {
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
      const cleanImeiDigits = cleanIMEI(imei);
      const finalName = customerName.trim() || matchedCustomer?.name || (actionType === 'Enquiry' ? 'Walk-in Customer' : 'Customer');

      if (actionType === 'Enquiry') {
        const dev = enquiryDevice.trim() || repairDevice.trim() || matchedCustomer?.device_model || '';
        const created = await addCustomer({
          phone: cleanPhoneDigits,
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
          name: finalName,
          purpose: 'Repair',
          status: 'In Progress',
          device_model: dev,
          imei: cleanImeiDigits,
          notes: repairIssue.trim(),
          delivery_date: repairDeliveryDate.trim(),
          estimated_cost: repairCost ? String(repairCost) : '0',
          advance_paid: repairAdvance ? String(repairAdvance) : '0',
        });
        Alert.alert('✅ Repair Created', `Active repair job sheet registered for ${finalName}.`);
        onClose();
        if (onSuccess) onSuccess(created);
      } else if (actionType === 'Purchase') {
        // Option A: Stock-out / Sale
        const itemName = selectedItem ? selectedItem.name : itemQuery.trim();
        const priceNum = parseFloat(salePrice) || 0;
        const qtyNum = parseInt(saleQty, 10) || 1;

        const saleRes = await recordSale({
          item_id: selectedItem?.id || null,
          item_name: itemName,
          category: selectedItem?.category || 'Accessory',
          quantity: qtyNum,
          cost_price: selectedItem?.cost_price || 0,
          sold_price: priceNum,
          payment_mode: paymentMode,
          customer_name: finalName,
          customer_phone: cleanPhoneDigits,
        });

        // Also ensure customer directory has record of visit
        if (cleanPhoneDigits) {
          await findOrCreateCustomer({
            name: finalName,
            phone: cleanPhoneDigits,
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>⚡ New Customer Entry</Text>
              <Text style={styles.modalSub}>Fast entry under 15 seconds</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} keyboardShouldPersistTaps="handled">
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

              {/* Customer Name */}
              <Text style={styles.fieldLabel}>Customer Name (Optional)</Text>
              <View style={styles.inputWrap}>
                <Feather name="user" size={15} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Walk-in Customer / Ramesh"
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholderTextColor={colors.textMuted}
                />
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
    padding: 16,
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
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    height: 42,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginBottom: 8,
  },
  matchText: {
    fontSize: 12,
    color: '#065F46',
  },
  actionTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  actionTabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  actionFormWrap: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  plainInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  multilineInput: {
    height: 60,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  searchResultsBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    marginTop: 4,
    marginBottom: 6,
    ...shadows.card,
  },
  searchResultRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    height: 42,
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  paymentChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  paymentChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
  },
  paymentChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 2,
  },
  paymentChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  paymentChipTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: borderRadius.sm,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    height: 46,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
