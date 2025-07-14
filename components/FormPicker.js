import { Picker } from '@react-native-picker/picker';
import { StyleSheet, View } from 'react-native';

export default function FormPicker({
  selectedValue,
  onValueChange,
  options = [],
  placeholder = 'Select',
}) {
  return (
    <View style={styles.wrapper}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={styles.picker}
      >
        <Picker.Item label={placeholder} value="" />
        {options.map((opt) => (
          <Picker.Item key={opt} label={opt} value={opt} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#E3EAF2',
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#1B3C57',
  },
});
