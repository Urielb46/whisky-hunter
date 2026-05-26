/**
 * Login screen — email/password sign-in via Better Auth.
 * Redirects to (tabs) on success; shows validation errors inline.
 */
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';

const BASE_URL: string =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'http://localhost:3000';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSignIn() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? 'Sign-in failed. Please try again.');
        return;
      }

      // Authenticated — navigate to tabs (replace so back button doesn't return here)
      router.replace('/(tabs)');
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>🥃</Text>
        <Text style={styles.title}>WhiskyHunter</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={() => void handleSignIn()}
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={() => void handleSignIn()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.guestBtn}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.guestText}>Continue as guest</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          By signing in you confirm you are of legal drinking age in your country.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1, backgroundColor: '#0d0d1a' },
  container:  { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  logo:       { fontSize: 48, marginBottom: 8 },
  title:      { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  subtitle:   { color: '#aaa', fontSize: 14, marginTop: 4, marginBottom: 28 },
  error:      { color: '#e55', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  input: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  btn: {
    width: '100%',
    backgroundColor: '#b8860b',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  guestBtn:    { marginTop: 16, paddingVertical: 8 },
  guestText:   { color: '#666', fontSize: 13, textDecorationLine: 'underline' },
  legal:       { color: '#444', fontSize: 11, marginTop: 32, textAlign: 'center', lineHeight: 16 },
});
