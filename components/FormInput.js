import { StyleSheet, TextInput } from 'react-native';

export default function FormInput({
  placeholder,
  value,
  onChange,
  keyboard = 'default',
  multiline = false,
  autoFocus = false,
}) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.multiline]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboard}
      multiline={multiline}
      autoFocus={autoFocus}
      placeholderTextColor="#888"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#E3EAF2',
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    color: '#1B3C57',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
