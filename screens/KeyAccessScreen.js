import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { auth } from '../config/firebase';

export default function KeyAccessScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('⚠️ Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // Navigation happens automatically via onAuthStateChanged in App.js
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-credential'
          ? 'Invalid email or password.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Try again later.'
          : 'Login failed. Please try again.';
      Alert.alert('❌ Login Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🔑 Welcome to Cellventory</Text>
      <Text style={styles.subheading}>Sign in to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={[styles.input, { marginTop: 12 }]}
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#1C1C1E' },
  heading: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 10, textAlign: 'center' },
  subheading: { fontSize: 16, color: '#A0A0A6', marginBottom: 20, textAlign: 'center' },
  input: {
    backgroundColor: '#2C2C2E', color: '#FFFFFF', padding: 12,
    borderRadius: 8, borderColor: '#3A3A3C', borderWidth: 1,
  },
  button: { backgroundColor: '#305F72', padding: 14, borderRadius: 8, marginTop: 20 },
  buttonText: { color: '#FFF', fontWeight: '600', textAlign: 'center', fontSize: 16 },
});
