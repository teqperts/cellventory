import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { verifyKey } from '../utils/License';

export default function KeyAccessScreen({ navigation }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const isValid = await verifyKey(key);
    if (isValid) {
      navigation.replace('MainTabs');
    } else {
      setError('Invalid key. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🔑 Welcome to Cellventory</Text>
      <Text style={styles.subheading}>Please enter your access key</Text>
      <TextInput
        style={styles.input}
        placeholder="Access key"
        value={key}
        onChangeText={setKey}
        autoCapitalize="none"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Unlock Access</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#1C1C1E' },
  heading: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 10, textAlign: 'center' },
  subheading: { fontSize: 16, color: '#A0A0A6', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#2C2C2E', color: '#FFFFFF', padding: 12, borderRadius: 8, borderColor: '#3A3A3C', borderWidth: 1 },
  error: { color: '#FF4C4C', textAlign: 'center', marginTop: 10 },
  button: { backgroundColor: '#305F72', padding: 12, borderRadius: 8, marginTop: 20 },
  buttonText: { color: '#FFF', fontWeight: '600', textAlign: 'center' },
});
