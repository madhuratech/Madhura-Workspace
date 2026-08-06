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

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');
    const res = await login(email, password);
    if (!res.success) setError(res.message);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          
          <View style={styles.header}>
            <Text style={styles.appName}>Madhura<Text style={{color: '#5B5BD6'}}>WS</Text></Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Please enter your details to sign in.</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
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

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Sign In</Text>
              }
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupLink}>Sign Up</Text>
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
  header: { marginBottom: 32 },
  appName: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 24, letterSpacing: -0.5 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 8, letterSpacing: -1 },
  subtitle: { fontSize: 15, color: SECONDARY, fontWeight: '400' },
  
  errorBox: {
    backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginBottom: 24,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  
  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 8,
    marginBottom: 20,
    height: 52,
  },
  input: {
    flex: 1, height: '100%', paddingHorizontal: 16, fontSize: 15, color: '#111827'
  },
  eyeIcon: { padding: 16 },
  
  loginBtn: {
    backgroundColor: PRIMARY, borderRadius: 8,
    height: 52, justifyContent: 'center', alignItems: 'center',
    marginTop: 8,
  },
  loginBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
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
