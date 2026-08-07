import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';

const PRIMARY = '#000000';
const SECONDARY = '#6B7280';
const BORDER = '#E5E7EB';

export default function RegisterScreen({ navigation }) {
  const { register } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const handleRegister = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');
    const res = await register(name, email, password);
    if (!res.success) setError(res.message);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Create an account</Text>
            <Text style={styles.subtitle}>Set up your workspace MD account.</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="you@company.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPass(!showPass)}>
                {showPass
                  ? <EyeOff color="#9CA3AF" size={20} />
                  : <Eye color="#9CA3AF" size={20} />
                }
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Account Role</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <TextInput
                style={styles.input}
                value="MD (Initial Setup)"
                editable={false}
                color="#1b2b4c"
              />
            </View>
            <Text style={styles.noteText}>
              Note: Employees do not use this page. They are created by the MD or HR internally.
            </Text>

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Sign Up</Text>
              }
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.signupLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.footerText}>
            Madhura Workspace · Enterprise
          </Text>

        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'center', paddingBottom: 40 },
  header: { marginBottom: 32, marginTop: 40 },
  title: { fontSize: 32, fontWeight: '800', color: '#1b2b4c', marginBottom: 12, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#64748B', fontWeight: '400' },
  
  errorBox: {
    backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginBottom: 24,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '700', color: '#1b2b4c', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 20,
    height: 52,
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: {
    backgroundColor: '#F8FAFC',
  },
  input: {
    flex: 1, height: '100%', paddingHorizontal: 16, fontSize: 15, color: '#1b2b4c'
  },
  eyeIcon: { padding: 16 },
  
  noteText: {
    fontSize: 13, color: '#64748B', lineHeight: 18, marginTop: -8, marginBottom: 24,
  },
  
  loginBtn: {
    backgroundColor: '#1b2b4c', borderRadius: 8,
    height: 52, justifyContent: 'center', alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signupLink: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: '700',
  },

  footerText: { textAlign: 'center', color: '#D1D5DB', fontSize: 12, marginTop: 40 },
});
