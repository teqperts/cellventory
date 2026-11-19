import { useNavigation } from '@react-navigation/native';
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

import FormInput from '../components/FormInput';
import FormPicker from '../components/FormPicker';
import FormSection from '../components/FormSection';
import { borderRadius, colors, shadows } from '../constants/theme';
import { addItem } from '../database/Helper';

export default function AddItemScreen({ navigation: propNavigation }) {
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
  };

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

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
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerBlock}>
        <Text style={styles.heading}>Add Inventory Item</Text>
        <Text style={styles.subheading}>Record a new device, part, or accessory</Text>
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
  );
}

const styles = StyleSheet.create({
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
});
