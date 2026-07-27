import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, UserPlus, Mail, Lock, Briefcase, Shield } from 'lucide-react-native';
import axios from 'axios';
import Toast from 'react-native-toast-message';

const PRIMARY = '#000000';
const BORDER = '#E5E7EB';

export default function RegisterMemberScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [designation, setDesignation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Name, email, and password are required.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const wsRes = await axios.get('/workspaces');
      if (!wsRes.data || wsRes.data.length === 0) {
        setError('No workspace found. You must be in a workspace to add a member.');
        setLoading(false);
        return;
      }
      const workspaceId = wsRes.data[0]._id;

      await axios.post(`/workspaces/${workspaceId}/members`, {
        name, email, password, role, designation
      });

      Toast.show({
        type: 'success',
        text1: 'Member Registered',
        text2: 'The credentials have been created successfully.',
      });
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#0F172A" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Member</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>Create credentials for a new employee or team leader to give them access.</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <UserPlus color="#9CA3AF" size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Mail color="#9CA3AF" size={18} style={styles.inputIcon} />
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

            <Text style={styles.label}>Temporary Password</Text>
            <View style={styles.inputContainer}>
              <Lock color="#9CA3AF" size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <Text style={styles.label}>Designation (Optional)</Text>
            <View style={styles.inputContainer}>
              <Briefcase color="#9CA3AF" size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Frontend Developer"
                placeholderTextColor="#9CA3AF"
                value={designation}
                onChangeText={setDesignation}
              />
            </View>

            <Text style={styles.label}>Role</Text>
            <View style={styles.roleContainer}>
              {['employee', 'team_leader', 'hr'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                    {r.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Account</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  
  content: { padding: 24, paddingBottom: 60 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 20 },

  errorBox: { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginBottom: 20 },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  
  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 8, marginBottom: 16, height: 52,
  },
  inputIcon: { marginLeft: 16, marginRight: 8 },
  input: { flex: 1, height: '100%', fontSize: 15, color: '#111827', paddingRight: 16 },

  roleContainer: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  roleBtn: {
    flex: 1, height: 42, borderWidth: 1, borderColor: BORDER,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  roleBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  roleBtnText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  roleBtnTextActive: { color: '#FFFFFF' },

  submitBtn: {
    backgroundColor: PRIMARY, borderRadius: 8, height: 52,
    justifyContent: 'center', alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
