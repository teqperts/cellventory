import { Picker } from '@react-native-picker/picker';
import { StyleSheet, View } from 'react-native';

import { borderRadius, colors } from '../constants/theme';

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
        dropdownIconColor={colors.textSecondary}
      >
        <Picker.Item label={placeholder} value="" color={colors.textMuted} />
        {options.map((opt) => (
          <Picker.Item key={opt} label={opt} value={opt} color={colors.textPrimary} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: {
    height: 50,
    color: colors.textPrimary,
  },
});
