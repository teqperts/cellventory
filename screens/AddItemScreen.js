import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import FormInput from '../components/FormInput';
import FormPicker from '../components/FormPicker';
import FormSection from '../components/FormSection';
import IMEIScannerModal from '../components/IMEIScannerModal';
import { borderRadius, colors, shadows } from '../constants/theme';
import { addItem } from '../database/Helper';

export default function AddItemScreen({
  navigation: propNavigation,
  route,
  isModal = false,
  initialValues,
  onClose,
  onSuccess,
}) {
  const hookNavigation = useNavigation();
  const navigation = propNavigation || hookNavigation;
  const insets = useSafeAreaInsets();

  const initialForm = {
    category: '',
    name: '',
    brand: '',
    model: '',
    part_type: '',
    quantity: '',
    cost_price: '',
    selling_price: '',
    notes: '',
    imei: '',
  };

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    const init = initialValues || route?.params?.initialValues;
    if (init) {
      setForm((prev) => ({
        ...prev,
        ...init,
      }));
    }
  }, [initialValues, route?.params?.initialValues]);

  const categories = ['Mobile', 'Accessory', 'Spare Part', 'Service'];
  const partTypes = ['Battery', 'Display', 'Touchpad', 'Speaker', 'Other'];

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.category || !form.name) {
      Alert.alert('⚠️ Missing Required Fields', 'Please select a Category and enter an Item Name.');
      return;
    }

    const qty = parseInt(form.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('⚠️ Invalid Quantity', 'Quantity must be a positive number greater than 0.');
      return;
    }

    setLoading(true);
    try {
      await addItem(form);
      setForm(initialForm);
      onSuccess?.();
      Alert.alert('✅ Saved', 'Item added to inventory successfully!', [
        isModal
          ? { text: 'Close', onPress: onClose }
          : {
              text: 'View Inventory',
              onPress: () => {
                if (typeof navigation.jumpTo === 'function') {
                  navigation.jumpTo('Inventory');
                } else {
                  navigation.navigate('MainTabs', { screen: 'Inventory' });
                }
              },
            },
        { text: 'Add Another', style: 'cancel' },
      ]);
    } catch (err) {
      console.error('Failed to add item:', err);
      Alert.alert('❌ Error', err.message || 'Failed to save item.');
    } finally {
      setLoading(false);
    }
  };

  const itemForm = (
    <>
      <FormSection title="1. Item Information (Required)">
        <Text style={styles.inputLabel}>Category *</Text>
        <FormPicker
          selectedValue={form.category}
          onValueChange={(val) => handleChange('category', val)}
          options={categories}
          placeholder="Select Category *"
        />
        <Text style={styles.inputLabel}>Item Name *</Text>
        <FormInput
          placeholder="e.g. iPhone 15 Screen"
          value={form.name}
          onChange={(val) => handleChange('name', val)}
          autoFocus={!isModal}
        />
        <Text style={styles.inputLabel}>Brand</Text>
        <FormInput
          placeholder="e.g. Apple, Samsung, Xiaomi"
          value={form.brand}
          onChange={(val) => handleChange('brand', val)}
        />
        <Text style={styles.inputLabel}>Model / Model Number</Text>
        <FormInput
          placeholder="Enter model number"
          value={form.model}
          onChange={(val) => handleChange('model', val)}
        />
        {form.category === 'Spare Part' && (
          <>
            <Text style={styles.inputLabel}>Part Type</Text>
            <FormPicker
              selectedValue={form.part_type}
              onValueChange={(val) => handleChange('part_type', val)}
              options={partTypes}
              placeholder="Select Part Type"
            />
          </>
        )}
        <Text style={styles.inputLabel}>Barcode / IMEI / Serial (Optional)</Text>
        <View style={styles.imeiRow}>
          <View style={{ flex: 1 }}>
            <FormInput
              placeholder="Enter barcode, IMEI, or serial number"
              value={form.imei}
              onChange={(val) => handleChange('imei', val)}
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
      </FormSection>

      <FormSection title="2. Pricing & Stock (Required)">
        <Text style={styles.inputLabel}>Quantity in Stock *</Text>
        <FormInput
          placeholder="Enter quantity"
          value={form.quantity}
          onChange={(val) => handleChange('quantity', val)}
          keyboard="numeric"
        />
        <Text style={styles.inputLabel}>Cost Price (₹, Optional)</Text>
        <FormInput
          placeholder="Enter cost price"
          value={form.cost_price}
          onChange={(val) => handleChange('cost_price', val)}
          keyboard="decimal-pad"
        />
        <Text style={styles.inputLabel}>Selling Price (₹, Optional)</Text>
        <FormInput
          placeholder="Enter selling price"
          value={form.selling_price}
          onChange={(val) => handleChange('selling_price', val)}
          keyboard="decimal-pad"
        />
      </FormSection>

      <FormSection title="3. Notes (Optional)">
        <Text style={styles.inputLabel}>Supplier / Storage / Other Notes</Text>
        <FormInput
          placeholder="Add any useful notes"
          value={form.notes}
          onChange={(val) => handleChange('notes', val)}
          multiline
        />
      </FormSection>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={colors.textInverse} size="small" />
        ) : (
          <Text style={styles.buttonText}>Save Item to Inventory</Text>
        )}
      </TouchableOpacity>
    </>
  );

  if (isModal) {
    return (
      <Modal
        visible
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add New Item</Text>
                <Text style={styles.modalSub}>Add a device, spare part, or accessory</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {itemForm}
            </ScrollView>
          </View>
          <IMEIScannerModal
            visible={scannerVisible}
            onClose={() => setScannerVisible(false)}
            onScan={(scannedImei) => handleChange('imei', scannedImei)}
          />
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Item</Text>
        <View style={{ width: 32 }} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {itemForm}
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
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
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
    paddingBottom: 72,
    backgroundColor: colors.background,
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
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 30,
    ...shadows.card,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  imeiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: borderRadius.md,
    gap: 6,
    marginBottom: 12,
    ...shadows.card,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
