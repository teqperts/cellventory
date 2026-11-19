import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import FormInput from '../components/FormInput';
import FormPicker from '../components/FormPicker';
import FormSection from '../components/FormSection';
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
      <Text style={styles.heading}>➕ Add Inventory Item</Text>

      <FormSection title="General Info">
        <FormPicker
          selectedValue={form.category}
          onValueChange={(val) => handleChange('category', val)}
          options={categories}
          placeholder="Select Category"
        />
        <FormInput
          placeholder="Item Name *"
          value={form.name}
          onChange={(val) => handleChange('name', val)}
          autoFocus
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
          value={form.quantity}
          onChange={(val) => handleChange('quantity', val)}
          keyboard="numeric"
        />
        <FormInput
          placeholder="Cost Price (optional)"
          value={form.cost_price}
          onChange={(val) => handleChange('cost_price', val)}
          keyboard="decimal-pad"
        />
        <FormInput
          placeholder="Selling Price (optional)"
          value={form.selling_price}
          onChange={(val) => handleChange('selling_price', val)}
          keyboard="decimal-pad"
        />
      </FormSection>

      <FormSection title="Notes (optional)">
        <FormInput
          placeholder="Additional notes"
          value={form.notes}
          onChange={(val) => handleChange('notes', val)}
          multiline
        />
      </FormSection>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Item'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#305F72',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#305F72',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
