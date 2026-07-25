import React, { useContext, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FileText, Users, Settings, ChevronRight,
  CalendarDays, Mail, Clock, LogOut, User, Shield,
} from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';

const ROLE_CONFIG = {
  super_admin: { label: 'Super Admin', grad: ['#7C3AED','#A78BFA'], glow: '#7C3AED' },
  hr:          { label: 'HR',          grad: ['#2563EB','#60A5FA'], glow: '#3B82F6' },
  team_leader: { label: 'Team Leader', grad: ['#D97706','#FCD34D'], glow: '#F59E0B' },
  employee:    { label: 'Employee',    grad: ['#059669','#34D399'], glow: '#10B981' },
};

const MENU_ITEMS = [
  {
    section: 'Organization',
    sectionGrad: ['#6366F1','#818CF8'],
    items: [
      { icon: FileText,     label: 'Documents',        sub: 'View and download files',        route: 'Documents',       grad: ['#3B82F6','#60A5FA'] },
      { icon: Users,        label: 'Team Directory',   sub: 'Find colleagues and their roles', route: 'Team',            grad: ['#8B5CF6','#A78BFA'] },
    ],
  },
  {
    section: 'Communication',
    sectionGrad: ['#10B981','#34D399'],
    items: [
      { icon: Mail,         label: 'Email',            sub: 'Internal communications',         route: 'Email',           grad: ['#10B981','#34D399'] },
      { icon: CalendarDays, label: 'Meetings',         sub: 'Scheduled and upcoming',          route: 'Meetings',        grad: ['#F97316','#FB923C'] },
    ],
  },
  {
    section: 'Tools',
    sectionGrad: ['#E11D48','#FB7185'],
    items: [
      { icon: Clock,        label: 'Attendance & Leave', sub: 'Punch in and request time off', route: 'AttendanceLeave', grad: ['#E11D48','#FB7185'] },
    ],
  },
  {
    section: 'Account',
    sectionGrad: ['#64748B','#94A3B8'],
    items: [
      { icon: Settings,     label: 'Settings',         sub: 'Preferences and account',         route: 'Settings',        grad: ['#64748B','#94A3B8'] },
    ],
  },
];

const MenuItem = ({ item, onPress, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 16, bounciness: 3, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.8}>
        <LinearGradient colors={item.grad} style={styles.menuIcon}>
          <item.icon color="#fff" size={20} strokeWidth={2} />
        </LinearGradient>
        <View style={styles.menuText}>
          <Text style={styles.menuLabel}>{item.label}</Text>
          {item.sub && <Text style={styles.menuSub}>{item.sub}</Text>}
        </View>
        <View style={styles.chevronWrap}>
          <ChevronRight color="#CBD5E1" size={17} />
        </View>
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
  const profileScale = useRef(new Animated.Value(0.95)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(profileFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(profileScale, { toValue: 1, speed: 10, bounciness: 5, useNativeDriver: true }),
    ]).start();
  }, []);

  let delay = 80;

  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient colors={['#0F172A','#1E293B']} style={styles.headerGradient}>
        <Text style={styles.headerTitle}>More</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Profile Card ─────────────────────── */}
        <Animated.View style={{ opacity: profileFade, transform: [{ scale: profileScale }] }}>
          <LinearGradient
            colors={['#0F172A','#1E293B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            {/* Avatar */}
            <View style={styles.profileAvatarOuter}>
              <LinearGradient colors={roleCfg.grad} style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{initial}</Text>
              </LinearGradient>
            </View>

            {/* Info */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>
              <LinearGradient colors={roleCfg.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rolePill}>
                <Shield color="#fff" size={10} style={{ marginRight: 4 }} />
                <Text style={styles.roleText}>{roleCfg.label}</Text>
              </LinearGradient>
            </View>

            {/* Edit Button */}
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <User color="rgba(248,250,252,0.7)" size={18} strokeWidth={1.8} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* ── Menu Sections ─────────────────────── */}
        {MENU_ITEMS.map(section => (
          <View key={section.section}>
            <View style={styles.sectionHeader}>
              <LinearGradient colors={section.sectionGrad} style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>{section.section.toUpperCase()}</Text>
            </View>
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
          <TouchableOpacity onPress={logout} activeOpacity={0.85}>
            <LinearGradient colors={['#FFF1F2','#FFE4E6']} style={styles.logoutBtn}>
              <LinearGradient colors={['#E11D48','#FB7185']} style={styles.logoutIcon}>
                <LogOut color="#fff" size={18} strokeWidth={2} />
              </LinearGradient>
              <Text style={styles.logoutLabel}>Log Out</Text>
              <ChevronRight color="#FDA4AF" size={18} />
            </LinearGradient>
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

  headerGradient: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#F8FAFC' },

  scrollContent: { padding: 16 },

  // Profile Card
  profileCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 22, padding: 20,
    marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  profileAvatarOuter: {
    width: 60, height: 60, borderRadius: 20, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', marginRight: 14,
  },
  profileAvatar: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { fontSize: 26, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '800', color: '#F8FAFC', marginBottom: 3 },
  profileEmail: { fontSize: 12, color: 'rgba(248,250,252,0.5)', marginBottom: 8 },
  rolePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  editBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 8 },
  sectionDot: { width: 4, height: 16, borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.2 },

  // Menu Item
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 18, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  menuIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  menuSub: { fontSize: 12, color: '#94A3B8' },
  chevronWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#FECDD3',
  },
  logoutIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  logoutLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: '#E11D48' },

  version: { textAlign: 'center', color: '#CBD5E1', fontSize: 12, fontWeight: '500', marginTop: 24, marginBottom: 8 },
});
