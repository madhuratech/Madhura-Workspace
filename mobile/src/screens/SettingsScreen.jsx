import React, { useContext, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Settings, LogOut, User, Bell, Shield, HelpCircle,
  ChevronRight, ArrowLeft, Info, UserPlus
} from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';

const ROLE_CONFIG = {
  super_admin: { bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED', label: 'Super Admin' },
  hr:          { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', label: 'HR'          },
  team_leader: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', label: 'Team Leader' },
  employee:    { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', label: 'Employee'    },
};

// Remove global SETTING_GROUPS

const SettingItem = ({ item, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 3, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity style={styles.settingItem} activeOpacity={0.8} onPress={item.onPress}>
        <View style={[styles.settingIcon, { backgroundColor: item.iconBg }]}>
          <item.icon color={item.iconColor} size={20} strokeWidth={2} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingLabel}>{item.label}</Text>
          {item.sub && <Text style={styles.settingSub}>{item.sub}</Text>}
        </View>
        <ChevronRight color="#CBD5E1" size={18} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SettingsScreen({ navigation }) {
  const { logout, user, updateUserStatus } = useContext(AuthContext);

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
        { icon: User,        label: 'Personal Information', sub: 'Update your name and profile', iconBg: '#EFF6FF', iconColor: '#3B82F6' },
        { icon: Bell,        label: 'Notifications',        sub: 'Push and email alert settings', iconBg: '#F5F3FF', iconColor: '#8B5CF6' },
        { icon: Shield,      label: 'Security',             sub: 'Password and 2FA settings',     iconBg: '#FFF7ED', iconColor: '#F97316' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle,  label: 'Help & Support',       sub: 'FAQs and contact us',           iconBg: '#F0FDF4', iconColor: '#10B981' },
        { icon: Info,        label: 'About',                sub: 'App version and licenses',       iconBg: '#F8FAFC', iconColor: '#64748B' },
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

  let delay = 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#0F172A" size={22} />
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
                    isActive ? { backgroundColor: statusColor + '15', borderColor: statusColor + '40' } : { backgroundColor: '#fff', borderColor: '#F1F5F9' }
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
              <LogOut color="#E11D48" size={20} strokeWidth={2} />
            </View>
            <Text style={styles.logoutLabel}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.version}>Madhura Workspace v1.0.0</Text>
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  scrollContent: { padding: 16 },

  // Profile card
  profileCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 20, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  profileAvatar: {
    width: 60, height: 60, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  profileAvatarText: { fontSize: 26, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  profileEmail: { fontSize: 12, color: '#94A3B8', marginBottom: 8 },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.2,
    marginBottom: 10, marginTop: 8,
  },

  // Status
  statusContainer: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1,
    width: '48%', justifyContent: 'center'
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 13, fontWeight: '600' },

  // Setting items
  settingItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  settingIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 1 },
  settingSub: { fontSize: 12, color: '#94A3B8' },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F2',
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FECDD3',
  },
  logoutIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFE4E6',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  logoutLabel: { fontSize: 15, fontWeight: '700', color: '#E11D48' },

  version: {
    textAlign: 'center', color: '#CBD5E1', fontSize: 12,
    fontWeight: '500', marginTop: 28,
  },
});
