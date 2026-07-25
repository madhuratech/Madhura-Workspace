import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, speed: 6, bounciness: 10, useNativeDriver: true }),
        Animated.timing(logoAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(formAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    const res = await login(email, password);
    if (!res.success) setError(res.message);
    setLoading(false);
  };

  return (
    <LinearGradient colors={['#0F172A','#1E293B','#0F172A']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.content}>

            {/* ── Logo Section ────────────────────── */}
            <Animated.View style={[styles.logoSection, { opacity: logoAnim, transform: [{ scale: logoScale }] }]}>
              <LinearGradient
                colors={['#6366F1','#818CF8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoContainer}
              >
                <Text style={styles.logoText}>M</Text>
              </LinearGradient>
              <Text style={styles.title}>MadhuraWS</Text>
              <Text style={styles.subtitle}>Your premium workspace platform</Text>
            </Animated.View>

            {/* ── Form Card ────────────────────────── */}
            <Animated.View style={[styles.formCard, { opacity: formAnim }]}>
              <Text style={styles.formTitle}>Welcome back 👋</Text>
              <Text style={styles.formSubtitle}>Sign in to continue</Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Email */}
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrap}>
                <Mail color="#94A3B8" size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Password */}
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Lock color="#94A3B8" size={18} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: 4 }}>
                  {showPassword
                    ? <EyeOff color="#94A3B8" size={18} />
                    : <Eye color="#94A3B8" size={18} />
                  }
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.88} style={{ marginTop: 8 }}>
                <LinearGradient
                  colors={['#6366F1','#818CF8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButton}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.loginButtonText}>Sign In</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <Animated.View style={{ opacity: formAnim, alignItems: 'center', marginTop: 24 }}>
              <Text style={styles.footerText}>Madhura Workspace · Enterprise Edition</Text>
            </Animated.View>

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: 36 },
  logoContainer: {
    width: 76, height: 76, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 14,
  },
  logoText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  title: { fontSize: 30, fontWeight: '800', color: '#F8FAFC', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(248,250,252,0.5)', textAlign: 'center' },

  // Form Card
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 28, padding: 26,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15, shadowRadius: 32, elevation: 10,
  },
  formTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 22 },

  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', marginBottom: 16,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 18,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#0F172A' },

  loginButton: {
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  footerText: { fontSize: 12, color: 'rgba(248,250,252,0.3)', fontWeight: '500' },
});
