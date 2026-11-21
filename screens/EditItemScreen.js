import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { updateItem } from '../database/Helper';

export default function EditItemScreen({ route, navigation }) {
  const { item } = route.params || {};
  const [form, setForm] = useState(item || {});
  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const categories = ['Mobile', 'Accessory', 'Spare Part', 'Service'];
  const partTypes = ['Battery', 'Display', 'Touchpad', 'Speaker', 'Other'];

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdate = async () => {
    if (!form.category || !form.name) {
      Alert.alert('⚠️ Missing Fields', 'Category and Item Name are required.');
      return;
    }

    const qty = parseInt(form.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('⚠️ Invalid Quantity', 'Quantity must be a positive number greater than 0.');
      return;
    }

    setLoading(true);
    try {
      await updateItem(form.id, form);
      Alert.alert('✅ Updated', 'Item was updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('❌ Error', error.message || 'Failed to update item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color={colors.primary} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerBlock}>
          <Text style={styles.heading}>Edit Item</Text>
          <Text style={styles.subheading}>{form.name || 'Update details'}</Text>
        </View>

        <FormSection title="General Information">
          <FormPicker
            selectedValue={form.category}
            onValueChange={(val) => handleChange('category', val)}
            options={categories}
            placeholder="Select Category *"
          />
          <FormInput
            placeholder="Item Name *"
            value={form.name}
            onChange={(val) => handleChange('name', val)}
          />
          <FormInput
            placeholder="Brand"
            value={form.brand}
            onChange={(val) => handleChange('brand', val)}
          />
          <FormInput
            placeholder="Model"
            value={form.model}
            onChange={(val) => handleChange('model', val)}
          />
          <View style={styles.imeiRow}>
            <View style={{ flex: 1 }}>
              <FormInput
                placeholder="Barcode / IMEI / Serial (Optional)"
                value={form.imei || ''}
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

        {form.category === 'Spare Part' && (
          <FormSection title="Part Details">
            <FormPicker
              selectedValue={form.part_type}
              onValueChange={(val) => handleChange('part_type', val)}
              options={partTypes}
              placeholder="Select Part Type"
            />
          </FormSection>
        )}

        <FormSection title="Pricing & Quantity">
          <FormInput
            placeholder="Quantity *"
            value={form.quantity != null ? form.quantity.toString() : ''}
            onChange={(val) => handleChange('quantity', val)}
            keyboard="numeric"
          />
          <FormInput
            placeholder="Cost Price (₹, optional)"
            value={form.cost_price != null ? form.cost_price.toString() : ''}
            onChange={(val) => handleChange('cost_price', val)}
            keyboard="decimal-pad"
          />
          <FormInput
            placeholder="Selling Price (₹, optional)"
            value={form.selling_price != null ? form.selling_price.toString() : ''}
            onChange={(val) => handleChange('selling_price', val)}
            keyboard="decimal-pad"
          />
        </FormSection>

        <FormSection title="Notes">
          <FormInput
            placeholder="Additional notes"
            value={form.notes || ''}
            onChange={(val) => handleChange('notes', val)}
            multiline
          />
        </FormSection>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleUpdate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

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
  scrollContainer: {
    padding: 16,
    paddingBottom: 60,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  headerBlock: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  subheading: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  imeiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: borderRadius.md,
    gap: 6,
    marginBottom: 12,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  button: {
    backgroundColor: colors.accent,
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
});
