import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import FormInput from '../components/FormInput';
import FormPicker from '../components/FormPicker';
import FormSection from '../components/FormSection';
import { updateItem } from '../database/Helper';

export default function EditItemScreen({ route, navigation }) {
  const { item } = route.params || {};
  const [form, setForm] = useState(item || {});
  const [loading, setLoading] = useState(false);

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
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>✏️ Edit Item</Text>

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
          value={form.quantity != null ? form.quantity.toString() : ''}
          onChange={(val) => handleChange('quantity', val)}
          keyboard="numeric"
        />
        <FormInput
          placeholder="Cost Price (optional)"
          value={form.cost_price != null ? form.cost_price.toString() : ''}
          onChange={(val) => handleChange('cost_price', val)}
          keyboard="decimal-pad"
        />
        <FormInput
          placeholder="Selling Price (optional)"
          value={form.selling_price != null ? form.selling_price.toString() : ''}
          onChange={(val) => handleChange('selling_price', val)}
          keyboard="decimal-pad"
        />
      </FormSection>

      <FormSection title="Notes (optional)">
        <FormInput
          placeholder="Additional notes"
          value={form.notes || ''}
          onChange={(val) => handleChange('notes', val)}
          multiline
        />
      </FormSection>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleUpdate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Updating...' : 'Update Item'}</Text>
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
    backgroundColor: '#4CAF50',
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
