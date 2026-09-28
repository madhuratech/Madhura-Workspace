import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, KeyboardAvoidingView, Platform,
  Image, Modal, ScrollView
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle, X } from 'lucide-react-native';
import axios from 'axios';

const PRIMARY = '#1b2b4c';
const ACCENT = '#ffca22';
const SECONDARY = '#64748B';
const BORDER = '#E2E8F0';

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true })
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    const res = await login(email.trim(), password);
    if (!res.success) {
      setError(res.message || 'Invalid email or password');
    }
    setLoading(false);
  };

  const handleOpenForgot = () => {
    setForgotEmail(email ? email.trim() : '');
    setForgotError('');
    setForgotSuccess(false);
    setForgotMessage('');
    setShowForgotModal(true);
  };

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your registered email');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await axios.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotSuccess(true);
      setForgotMessage(res.data?.message || 'Password reset request sent to Managing Director and HR.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit reset request. Please check the email.';
      setForgotError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            
            {/* Header / Brand Logo */}
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <Image 
                  source={require('../../assets/logo.jpeg')} 
                  style={styles.logoImage} 
                  resizeMode="contain" 
                />
                <Text style={styles.appName}>
                  Madhura<Text style={{ color: ACCENT }}>Workspace</Text>
                </Text>
              </View>

              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Please enter your details to sign in.</Text>
            </View>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBox}>
                <AlertCircle color="#DC2626" size={16} style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Form Fields */}
            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="you@company.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.passwordLabelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={handleOpenForgot} activeOpacity={0.7}>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setShowPass(!showPass)}
                  activeOpacity={0.7}
                >
                  {showPass
                    ? <EyeOff color="#94A3B8" size={20} />
                    : <Eye color="#94A3B8" size={20} />
                  }
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.loginBtn}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#ffffff" />
                  : <Text style={styles.loginBtnText}>Sign In</Text>
                }
              </TouchableOpacity>
            </View>
            
            {/* Enterprise Footer Info */}
            <View style={styles.footerContainer}>
              <View style={styles.badgeRow}>
                <View style={styles.greenDot} />
                <Text style={styles.badgeText}>Enterprise Workspace · Invite-Only Access</Text>
              </View>
              <Text style={styles.footerNote}>
                New team member accounts are provisioned by Managing Director / HR.
              </Text>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal visible={showForgotModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.keyIconCircle}>
                  <KeyRound color={PRIMARY} size={18} />
                </View>
                <Text style={styles.modalTitle}>Reset Password</Text>
              </View>
              <TouchableOpacity onPress={() => setShowForgotModal(false)} style={{ padding: 4 }}>
                <X color="#64748B" size={20} />
              </TouchableOpacity>
            </View>

            {forgotSuccess ? (
              <View style={styles.successBox}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 color="#10B981" size={36} />
                </View>
                <Text style={styles.successTitle}>Request Dispatched!</Text>
                <Text style={styles.successSub}>{forgotMessage}</Text>
                
                <View style={styles.infoCallout}>
                  <Text style={styles.infoCalloutTitle}>What happens next?</Text>
                  <Text style={styles.infoCalloutText}>• MD or HR will set a new password for your account.</Text>
                  <Text style={styles.infoCalloutText}>• Contact your administrator to receive your new login credentials.</Text>
                </View>

                <TouchableOpacity 
                  style={styles.modalActionBtn} 
                  onPress={() => setShowForgotModal(false)}
                >
                  <Text style={styles.modalActionBtnText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ paddingTop: 8 }}>
                <Text style={styles.modalSubtext}>
                  Enter your registered email address below. A password reset request will be automatically dispatched to your Managing Director (MD) and HR.
                </Text>

                {forgotError ? (
                  <View style={[styles.errorBox, { marginBottom: 14 }]}>
                    <AlertCircle color="#DC2626" size={15} style={{ marginRight: 6 }} />
                    <Text style={styles.errorText}>{forgotError}</Text>
                  </View>
                ) : null}

                <Text style={styles.label}>Registered Email</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="name@company.com"
                    placeholderTextColor="#94A3B8"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity 
                    style={styles.cancelBtn} 
                    onPress={() => setShowForgotModal(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.submitResetBtn} 
                    onPress={handleForgotSubmit}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.submitResetBtnText}>Request Reset</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 28, 
    paddingVertical: 24 
  },
  content: { 
    width: '100%', 
    maxWidth: 420, 
    alignSelf: 'center' 
  },
  header: { 
    marginBottom: 28 
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  appName: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: PRIMARY, 
    letterSpacing: -0.5 
  },
  title: { 
    fontSize: 30, 
    fontWeight: '800', 
    color: '#111827', 
    marginBottom: 6, 
    letterSpacing: -0.5 
  },
  subtitle: { 
    fontSize: 14, 
    color: SECONDARY, 
    fontWeight: '400' 
  },
  
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2', 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },
  errorText: { 
    color: '#DC2626', 
    fontSize: 13, 
    fontWeight: '500', 
    flex: 1 
  },
  
  form: { 
    width: '100%' 
  },
  label: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#374151', 
    marginBottom: 6 
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row', 
    alignItems: 'center',
    borderWidth: 1.5, 
    borderColor: BORDER,
    borderRadius: 12,
    marginBottom: 18,
    height: 52,
    backgroundColor: '#FAFAFA'
  },
  input: {
    flex: 1, 
    height: '100%', 
    paddingHorizontal: 16, 
    fontSize: 15, 
    color: '#111827'
  },
  eyeIcon: { 
    padding: 14 
  },
  
  loginBtn: {
    backgroundColor: PRIMARY, 
    borderRadius: 12,
    height: 52, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  loginBtnText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: 0.3
  },
  
  footerContainer: {
    marginTop: 36,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: SECONDARY,
  },
  footerNote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtext: {
    fontSize: 13,
    color: SECONDARY,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: SECONDARY,
  },
  submitResetBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitResetBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  successSub: {
    fontSize: 13,
    color: SECONDARY,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  infoCallout: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  infoCalloutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  infoCalloutText: {
    fontSize: 11,
    color: SECONDARY,
    lineHeight: 16,
    marginBottom: 2,
  },
  modalActionBtn: {
    width: '100%',
    backgroundColor: PRIMARY,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
