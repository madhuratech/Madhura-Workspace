import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Alert, Modal, TextInput, ActivityIndicator, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Settings, LogOut, User, Bell, Shield, HelpCircle,
  ChevronRight, ArrowLeft, Info, UserPlus, Lock, Key, Mail, MessageSquare, Phone
} from 'lucide-react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const PRIMARY = '#1b2b4c';
const ACCENT = '#ffca22';

const ROLE_CONFIG = {
  super_admin: { bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED', label: 'MD' },
  hr:          { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', label: 'HR'          },
  team_leader: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', label: 'Team Leader' },
  employee:    { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', label: 'Employee'    },
};

const SettingItem = ({ item, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 3, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const IconComponent = item.icon;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity style={styles.settingItem} activeOpacity={0.8} onPress={item.onPress}>
        <View style={[styles.settingIcon, { backgroundColor: item.iconBg }]}>
          <IconComponent color={item.iconColor} size={20} strokeWidth={2} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingLabel}>{item.label}</Text>
          {item.sub && <Text style={styles.settingSub}>{item.sub}</Text>}
        </View>
        <ChevronRight color="#64748B" size={18} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SettingsScreen({ navigation }) {
  const { logout, user, updateUserStatus } = useContext(AuthContext);

  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [isHelpModalVisible, setHelpModalVisible] = useState(false);
  const [isAboutModalVisible, setAboutModalVisible] = useState(false);
  
  const [isPersonalInfoModalVisible, setPersonalInfoModalVisible] = useState(false);
  const [isNotificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(
    user?.notificationSettings || { emailNotifications: true, pushNotifications: true, taskReminders: true }
  );
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const profileFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(profileFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const role = user?.role || 'employee';
  const roleCfg = ROLE_CONFIG[role] || ROLE_CONFIG.employee;
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  const groups = [
    {
      title: 'Account',
      items: [
        { icon: User,        label: 'Personal Information', sub: 'Update your name and profile', iconBg: '#EFF6FF', iconColor: '#2563EB', onPress: () => setPersonalInfoModalVisible(true) },
        { icon: Bell,        label: 'Notifications',        sub: 'Push and email alert settings', iconBg: '#F5F3FF', iconColor: '#8B5CF6', onPress: () => setNotificationsModalVisible(true) },
        { icon: Shield,      label: 'Security',             sub: 'Password and 2FA settings',     iconBg: '#FFF7ED', iconColor: '#F97316', onPress: () => setPasswordModalVisible(true) },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle,  label: 'Help & Support',       sub: 'FAQs and contact us',           iconBg: '#F8FAFC', iconColor: '#64748B', onPress: () => setHelpModalVisible(true) },
        { icon: Info,        label: 'About',                sub: 'App version and licenses',       iconBg: '#F1F5F9', iconColor: '#475569', onPress: () => setAboutModalVisible(true) },
      ],
    },
  ];

  if (role === 'super_admin' || role === 'hr') {
    groups.splice(1, 0, {
      title: 'Management',
      items: [
        { 
          icon: UserPlus, 
          label: 'Register New Employee', 
          sub: 'Create credentials for new joins', 
          iconBg: '#F3E8FF', 
          iconColor: '#9333EA', 
          onPress: () => navigation.navigate('RegisterMember') 
        },
      ],
    });
  }

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    setIsChangingPassword(true);
    try {
      await axios.put('/users/change-password', passwordData);
      Alert.alert('Success', 'Password updated successfully');
      setPasswordModalVisible(false);
      setPasswordData({ currentPassword: '', newPassword: '' });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      await axios.put('/users/notification-settings', { notificationSettings });
      Alert.alert('Success', 'Notification preferences saved.');
      setNotificationsModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences.');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  let delay = 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#111827" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Profile Card ─────────────────────── */}
        <Animated.View style={[styles.profileCard, { opacity: profileFade }]}>
          <View style={[styles.profileAvatar, { backgroundColor: roleCfg.text + '20' }]}>
            <Text style={[styles.profileAvatarText, { color: roleCfg.text }]}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleCfg.bg, borderColor: roleCfg.border }]}>
              <Text style={[styles.roleText, { color: roleCfg.text }]}>{roleCfg.label}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Status Picker ─────────────────────── */}
        <Animated.View style={[{ opacity: profileFade, marginBottom: 24 }]}>
          <Text style={styles.sectionTitle}>PRESENCE STATUS</Text>
          <View style={styles.statusContainer}>
            {['Active', 'Busy', 'Break', 'Away'].map(status => {
              const isActive = user?.presenceStatus === status;
              let statusColor = '#10B981'; // Active
              if (status === 'Busy') statusColor = '#EF4444';
              else if (status === 'Break') statusColor = '#F59E0B';
              else if (status === 'Away') statusColor = '#F97316';

              return (
                <TouchableOpacity 
                  key={status}
                  activeOpacity={0.8}
                  onPress={() => updateUserStatus(status)}
                  style={[
                    styles.statusBtn,
                    { backgroundColor: isActive ? statusColor + '15' : '#ffffff', borderColor: isActive ? statusColor + '40' : '#E2E8F0' }
                  ]}
                >
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusText, isActive ? { color: statusColor, fontWeight: '700' } : { color: '#64748B' }]}>{status}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Settings Groups ───────────────────── */}
        {groups.map(group => (
          <View key={group.title}>
            <Text style={styles.sectionTitle}>{group.title.toUpperCase()}</Text>
            {group.items.map(item => {
              const d = delay;
              delay += 40;
              return <SettingItem key={item.label} item={item} delay={d} />;
            })}
          </View>
        ))}

        {/* ── Log Out ───────────────────────────── */}
        <Animated.View style={[{ marginTop: 16 }, { opacity: profileFade }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <View style={styles.logoutIcon}>
              <LogOut color="#EF4444" size={20} strokeWidth={2} />
            </View>
            <Text style={styles.logoutLabel}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.version}>Madhura Workspace v1.0.0</Text>
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Password Modal */}
      <Modal visible={isPasswordModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Lock size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Current Password" placeholderTextColor="#94A3B8" secureTextEntry value={passwordData.currentPassword} onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))} />
            </View>
            <View style={styles.inputContainer}>
              <Key size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="New Password (min 6 chars)" placeholderTextColor="#94A3B8" secureTextEntry value={passwordData.newPassword} onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))} />
            </View>
            <TouchableOpacity style={[styles.saveBtn, isChangingPassword && { opacity: 0.7 }]} onPress={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Personal Info Modal */}
      <Modal visible={isPersonalInfoModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Personal Information</Text>
              <TouchableOpacity onPress={() => setPersonalInfoModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={[styles.profileAvatar, { backgroundColor: roleCfg.bg, width: 80, height: 80, marginRight: 0, marginBottom: 12 }]}>
                <Text style={[styles.profileAvatarText, { color: roleCfg.text, fontSize: 32 }]}>{initial}</Text>
              </View>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
            <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
               <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>Role</Text>
               <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', textTransform: 'capitalize' }}>{roleCfg.label}</Text>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={() => setPersonalInfoModalVisible(false)}>
              <Text style={styles.saveBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={isNotificationsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationsModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Email Notifications</Text>
              <Switch value={notificationSettings.emailNotifications} onValueChange={(val) => setNotificationSettings(p => ({...p, emailNotifications: val}))} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Push Notifications</Text>
              <Switch value={notificationSettings.pushNotifications} onValueChange={(val) => setNotificationSettings(p => ({...p, pushNotifications: val}))} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Task Reminders</Text>
              <Switch value={notificationSettings.taskReminders} onValueChange={(val) => setNotificationSettings(p => ({...p, taskReminders: val}))} />
            </View>
            <TouchableOpacity style={[styles.saveBtn, isSavingNotifications && { opacity: 0.7 }]} onPress={handleSaveNotifications} disabled={isSavingNotifications}>
              {isSavingNotifications ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Preferences</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal visible={isHelpModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Help & Support</Text>
              <TouchableOpacity onPress={() => setHelpModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 20 }}>
              Need assistance? Our support team is available 24/7. 
            </Text>
            <View style={styles.contactRow}>
              <Mail color={PRIMARY} size={20} />
              <Text style={styles.contactText}>support@madhura.com</Text>
            </View>
            <View style={styles.contactRow}>
              <Phone color={PRIMARY} size={20} />
              <Text style={styles.contactText}>+1 (800) 123-4567</Text>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={() => setHelpModalVisible(false)}>
              <Text style={styles.saveBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={isAboutModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About</Text>
              <TouchableOpacity onPress={() => setAboutModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 80, height: 80, borderRadius: 20, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800' }}>M</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>Madhura Workspace</Text>
              <Text style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>Version 1.0.0 (Build 42)</Text>
            </View>
            <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 }}>
              © 2026 Madhura Technologies. All rights reserved.
            </Text>
            <TouchableOpacity style={[styles.saveBtn, { marginTop: 24 }]} onPress={() => setAboutModalVisible(false)}>
              <Text style={styles.saveBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scrollContent: { padding: 16 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, padding: 20, marginBottom: 24,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1b2b4c', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 16, elevation: 2,
  },
  profileAvatar: {
    width: 60, height: 60, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  profileAvatarText: { fontSize: 26, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', marginBottom: 2, color: '#111827' },
  profileEmail: { fontSize: 12, marginBottom: 8, color: '#64748B' },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginBottom: 10, marginTop: 8, color: '#64748B'
  },

  statusContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1,
    width: '48%', justifyContent: 'center'
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 13, fontWeight: '600' },

  settingItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1b2b4c', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  settingIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', marginBottom: 1, color: '#111827' },
  settingSub: { fontSize: 12, color: '#64748B' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FECACA'
  },
  logoutIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  logoutLabel: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  version: { textAlign: 'center', fontSize: 12, fontWeight: '500', marginTop: 28, color: '#94A3B8' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalContent: {
    backgroundColor: '#ffffff', borderRadius: 20, width: '100%',
    padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 10
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalCloseBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center'
  },
  modalCloseText: { fontSize: 16, color: '#64748B', fontWeight: 'bold' },
  
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 16, paddingHorizontal: 14, height: 50
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 12, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 8
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
  },
  switchLabel: { fontSize: 15, color: '#111827', fontWeight: '500' },
  contactRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
  },
  contactText: { fontSize: 15, color: '#111827', marginLeft: 12, fontWeight: '500' },
});
