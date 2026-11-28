import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { borderRadius, colors } from '../constants/theme';

export default function FormInput({
  placeholder,
  value,
  onChange,
  keyboard = 'default',
  multiline = false,
  autoFocus = false,
  editable = true,
  onFocus: onFocusProp,
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TextInput
      style={[
        styles.input,
        multiline && styles.multiline,
        isFocused && styles.inputFocused,
        !editable && { opacity: 0.6 },
      ]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboard}
      multiline={multiline}
      autoFocus={autoFocus}
      editable={editable}
      placeholderTextColor={colors.textMuted}
      onFocus={(e) => {
        setIsFocused(true);
        if (onFocusProp) onFocusProp(e);
      }}
      onBlur={() => setIsFocused(false)}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    fontSize: 15,
    marginBottom: 12,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocused: {
    borderColor: colors.borderFocus,
    backgroundColor: colors.surface,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
