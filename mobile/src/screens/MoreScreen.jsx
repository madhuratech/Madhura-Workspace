import React, { useContext, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText, Users, Settings, ChevronRight,
  CalendarDays, Mail, Clock, LogOut, User,
} from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';

const ROLE_CONFIG = {
  super_admin: { bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED', label: 'Super Admin' },
  hr:          { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', label: 'HR'          },
  team_leader: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', label: 'Team Leader' },
  employee:    { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', label: 'Employee'    },
};

const MENU_ITEMS = [
  {
    section: 'Organization',
    items: [
      { icon: FileText,    label: 'Documents',         sub: 'View and download files',         route: 'Documents',       iconBg: '#EFF6FF', iconColor: '#3B82F6' },
      { icon: Users,       label: 'Team Directory',    sub: 'Find colleagues and their roles',  route: 'Team',            iconBg: '#F5F3FF', iconColor: '#8B5CF6' },
    ],
  },
  {
    section: 'Communication',
    items: [
      { icon: Mail,        label: 'Email',             sub: 'Internal communications',          route: 'Email',           iconBg: '#F0FDF4', iconColor: '#10B981' },
      { icon: CalendarDays,label: 'Meetings',          sub: 'Scheduled and upcoming',           route: 'Meetings',        iconBg: '#FFF7ED', iconColor: '#F97316' },
    ],
  },
  {
    section: 'Tools',
    items: [
      { icon: Clock,       label: 'Attendance & Leave',sub: 'Punch in and request time off',    route: 'AttendanceLeave', iconBg: '#FFF1F2', iconColor: '#E11D48' },
    ],
  },
  {
    section: 'Account',
    items: [
      { icon: Settings,    label: 'Settings',          sub: 'Preferences and account',          route: 'Settings',        iconBg: '#F8FAFC', iconColor: '#64748B' },
    ],
  },
];

const MenuItem = ({ item, onPress, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 3, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.8}>
        <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
          <item.icon color={item.iconColor} size={20} strokeWidth={2} />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuLabel}>{item.label}</Text>
          {item.sub && <Text style={styles.menuSub}>{item.sub}</Text>}
        </View>
        <ChevronRight color="#CBD5E1" size={18} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function MoreScreen({ navigation }) {
  const { logout, user } = useContext(AuthContext);

  const role = user?.role || 'employee';
  const roleCfg = ROLE_CONFIG[role] || ROLE_CONFIG.employee;
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  const profileFade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(profileFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  let delay = 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
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
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <User color="#64748B" size={18} strokeWidth={1.8} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Menu Sections ─────────────────────── */}
        {MENU_ITEMS.map(section => (
          <View key={section.section}>
            <Text style={styles.sectionTitle}>{section.section.toUpperCase()}</Text>
            {section.items.map(item => {
              const itemDelay = delay;
              delay += 40;
              return (
                <MenuItem
                  key={item.route}
                  item={item}
                  delay={itemDelay}
                  onPress={() => navigation.navigate(item.route)}
                />
              );
            })}
          </View>
        ))}

        {/* ── Logout ────────────────────────────── */}
        <Animated.View style={{ opacity: profileFade, marginTop: 8 }}>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <View style={styles.logoutIcon}>
              <LogOut color="#E11D48" size={20} strokeWidth={2} />
            </View>
            <Text style={styles.logoutLabel}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.version}>Madhura Workspace v1.0.0</Text>
        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  scrollContent: { padding: 16 },

  // Profile card
  profileCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 20, padding: 18, marginBottom: 24,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  profileAvatarText: { fontSize: 24, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  profileEmail: { fontSize: 12, color: '#94A3B8', marginBottom: 6 },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  editBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
  },

  // Section
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1.2,
    marginBottom: 10, marginTop: 8,
  },

  // Menu item
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  menuIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 1 },
  menuSub: { fontSize: 12, color: '#94A3B8' },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F2',
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FECDD3',
  },
  logoutIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFE4E6',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  logoutLabel: { fontSize: 15, fontWeight: '700', color: '#E11D48' },

  version: {
    textAlign: 'center', color: '#CBD5E1', fontSize: 12,
    fontWeight: '500', marginTop: 24, marginBottom: 8,
  },
});
