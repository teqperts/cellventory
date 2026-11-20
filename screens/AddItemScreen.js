import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
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
import { addItem } from '../database/Helper';

export default function AddItemScreen({ navigation: propNavigation, route }) {
  const hookNavigation = useNavigation();
  const navigation = propNavigation || hookNavigation;

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
    if (route?.params?.initialValues) {
      const init = route.params.initialValues;
      setForm((prev) => ({
        ...prev,
        ...init,
      }));
    }
  }, [route?.params?.initialValues]);

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
      Alert.alert('✅ Saved', 'Item added to inventory successfully!', [
        {
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
        <Text style={styles.headerTitle}>Add New Item</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerBlock}>
          <Text style={styles.heading}>Record Inventory Item</Text>
          <Text style={styles.subheading}>Add a new device, repair part, or accessory</Text>
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
          autoFocus
        />
        <FormInput
          placeholder="Brand (e.g. Apple, Samsung, Xiaomi)"
          value={form.brand}
          onChange={(val) => handleChange('brand', val)}
        />
        <FormInput
          placeholder="Model / Model Number"
          value={form.model}
          onChange={(val) => handleChange('model', val)}
        />
        <View style={styles.imeiRow}>
          <View style={{ flex: 1 }}>
            <FormInput
              placeholder="Device IMEI / Serial (Optional)"
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

      <FormSection title="Pricing & Stock Count">
        <FormInput
          placeholder="Quantity in Stock *"
          value={form.quantity}
          onChange={(val) => handleChange('quantity', val)}
          keyboard="numeric"
        />
        <FormInput
          placeholder="Cost Price (₹, optional)"
          value={form.cost_price}
          onChange={(val) => handleChange('cost_price', val)}
          keyboard="decimal-pad"
        />
        <FormInput
          placeholder="Selling Price (₹, optional)"
          value={form.selling_price}
          onChange={(val) => handleChange('selling_price', val)}
          keyboard="decimal-pad"
        />
      </FormSection>

      <FormSection title="Notes">
        <FormInput
          placeholder="Supplier info, storage bin, or notes (optional)"
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
    paddingBottom: 60,
    backgroundColor: colors.background,
  },
  headerBlock: {
    marginBottom: 16,
    alignItems: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  subheading: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
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
