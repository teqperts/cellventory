import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import FormInput from '../components/FormInput';
import FormPicker from '../components/FormPicker';
import FormSection from '../components/FormSection';
import { getDatabase } from '../database/Helper';

export default function AddItemScreen({ navigation }) {
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
  const [db, setDb] = useState(null);

  const categories = ['Mobile', 'Accessory', 'Spare Part', 'Service'];
  const partTypes = ['Battery', 'Display', 'Touchpad', 'Speaker', 'Other'];

  useEffect(() => {
    getDatabase().then(setDb);
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const {
      category,
      name,
      brand,
      model,
      part_type,
      quantity,
      cost_price,
      selling_price,
      notes,
    } = form;

    if (!category || !name || !quantity) {
      Alert.alert('⚠️ Required fields missing', 'Please fill category, name, and quantity.');
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('⚠️ Invalid quantity', 'Please enter a valid number.');
      return;
    }

    const added_on = new Date().toISOString();

    try {
      await db.runAsync(
        `INSERT INTO items (
          category, name, brand, model, part_type,
          quantity, cost_price, selling_price,
          added_on, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          category,
          name,
          brand,
          model,
          part_type,
          parseInt(quantity),
          parseFloat(cost_price),
          parseFloat(selling_price),
          added_on,
          notes,
        ]
      );

      Alert.alert('✅ Item saved successfully');
      setForm(initialForm);
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert('❌ Failed to save item');
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
          placeholder="Item Name"
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
          placeholder="Quantity"
          value={form.quantity}
          onChange={(val) => handleChange('quantity', val)}
          keyboard="numeric"
        />
        <FormInput
          placeholder="Cost Price"
          value={form.cost_price}
          onChange={(val) => handleChange('cost_price', val)}
          keyboard="decimal-pad"
        />
        <FormInput
          placeholder="Selling Price"
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

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Save Item</Text>
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
    fontWeight: '600',
    color: '#305F72',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4C9AFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
