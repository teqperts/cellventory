// components/AddDeviceModal.js
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useState } from 'react';
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
import { addRepair } from '../database/Helper';
import { cleanIMEI, formatIMEI, validateIMEI } from '../utils/imei';

export default function AddDeviceModal({ visible, onClose, customer, onSuccess }) {
  const [deviceModel, setDeviceModel] = useState('');
  const [imei, setImei] = useState('');
  const [issue, setIssue] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const parsedCost = parseFloat(estimatedCost) || 0;
  const parsedAdvance = parseFloat(advancePaid) || 0;
  const balanceDue = Math.max(0, parsedCost - parsedAdvance);

  const setRelativeDelivery = (daysOffset) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setDeliveryDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSave = async () => {
    if (!deviceModel.trim()) {
      Alert.alert('Required Field', 'Please enter the device model (e.g. iPhone 13, Samsung S22).');
      return;
    }

    try {
      setLoading(true);
      await addRepair({
        customer_id: customer.id,
        device_model: deviceModel.trim(),
        imei: imei.trim(),
        issue: issue.trim(),
        delivery_date: deliveryDate.trim(),
        estimated_cost: parsedCost,
        advance_paid: parsedAdvance,
      });

      // Reset fields
      setDeviceModel('');
      setImei('');
      setIssue('');
      setDeliveryDate('');
      setEstimatedCost('');
      setAdvancePaid('');

      if (onSuccess) onSuccess();
      onClose();
      Alert.alert('✅ Device Added', `New repair for ${deviceModel} has been recorded.`);
    } catch (err) {
      console.error('Failed to add device repair:', err);
      Alert.alert('Error', err.message || 'Failed to add device repair.');
    } finally {
      setLoading(false);
    }
  };

  const cleanedImei = cleanIMEI(imei);
  const isImeiValid = cleanedImei.length === 15 ? validateIMEI(cleanedImei) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>+ Add Device to Repair</Text>
              <Text style={styles.sheetSubtitle}>
                Client: {customer?.name} ({customer?.phone})
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            {/* Device Model */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Device Model *</Text>
              <View style={styles.inputWrap}>
                <Feather name="smartphone" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. iPhone 14 Pro, Samsung Galaxy S23"
                  placeholderTextColor={colors.textMuted}
                  value={deviceModel}
                  onChangeText={setDeviceModel}
                />
              </View>
            </View>

            {/* IMEI & Scanner */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Device IMEI / Serial (Optional)</Text>
                {cleanedImei.length === 15 && (
                  <Text style={[styles.luhnBadge, isImeiValid ? styles.luhnValid : styles.luhnInvalid]}>
                    {isImeiValid ? '✓ Valid IMEI' : '⚠ Invalid Checksum'}
                  </Text>
                )}
              </View>
              <View style={styles.imeiInputWrap}>
                <TextInput
                  style={styles.imeiInput}
                  placeholder="15-digit IMEI number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={18}
                  value={imei}
                  onChangeText={(val) => setImei(cleanIMEI(val))}
                />
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => setScannerVisible(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="maximize" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.scanBtnText}>Scan</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Problem / Fault Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fault / Repair Issue</Text>
              <View style={[styles.inputWrap, { height: 70, alignItems: 'flex-start', paddingTop: 8 }]}>
                <TextInput
                  style={[styles.input, { textAlignVertical: 'top' }]}
                  placeholder="e.g. Screen broken, battery drain, touch not responding..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={issue}
                  onChangeText={setIssue}
                />
              </View>
            </View>

            {/* Delivery Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Promised Delivery Date</Text>
              <View style={styles.dateChipsRow}>
                <TouchableOpacity style={styles.dateChip} onPress={() => setRelativeDelivery(0)}>
                  <Text style={styles.dateChipText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateChip} onPress={() => setRelativeDelivery(1)}>
                  <Text style={styles.dateChipText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateChip} onPress={() => setRelativeDelivery(2)}>
                  <Text style={styles.dateChipText}>+2 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateChip} onPress={() => setRelativeDelivery(3)}>
                  <Text style={styles.dateChipText}>+3 Days</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrap}>
                <Feather name="calendar" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={deliveryDate}
                  onChangeText={setDeliveryDate}
                />
              </View>
            </View>

            {/* Financial Costing & Khata */}
            <View style={styles.financialsRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Est. Cost (₹)</Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={estimatedCost}
                    onChangeText={setEstimatedCost}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Advance Paid (₹)</Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={advancePaid}
                    onChangeText={setAdvancePaid}
                  />
                </View>
              </View>
            </View>

            {parsedCost > 0 && (
              <View style={styles.balanceDueBanner}>
                <Feather name="info" size={14} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={styles.balanceDueText}>
                  Balance Due on Delivery: <Text style={{ fontWeight: '800' }}>₹{balanceDue}</Text>
                </Text>
              </View>
            )}

            {/* Submit Action */}
            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.saveBtnRow}>
                  <Feather name="check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Save Device Repair</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>

        {/* Integrated IMEI Barcode Scanner Modal */}
        <IMEIScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScanned={(code) => {
            setImei(cleanIMEI(code));
            setScannerVisible(false);
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 18,
    ...shadows.floating,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    marginTop: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  imeiInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imeiInput: {
    flex: 1,
    height: 46,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.textPrimary,
    marginRight: 8,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: borderRadius.md,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  luhnBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  luhnValid: {
    color: '#065F46',
    backgroundColor: '#D1FAE5',
  },
  luhnInvalid: {
    color: '#991B1B',
    backgroundColor: '#FEE2E2',
  },
  dateChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  dateChip: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  financialsRow: {
    flexDirection: 'row',
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    marginRight: 6,
  },
  balanceDueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  balanceDueText: {
    fontSize: 12,
    color: '#92400E',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...shadows.card,
  },
  saveBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
