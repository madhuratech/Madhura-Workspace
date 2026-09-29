import React, { useContext, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText, Users, Settings, ChevronRight,
  CalendarDays, Mail, Clock, LogOut, User, BarChart3, LifeBuoy, Megaphone, StickyNote, CheckSquare
} from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';

const PRIMARY = '#5B5BD6';

const ROLE_CFG = {
  super_admin: { label: 'MD', color: '#7C3AED', bg: '#F5F3FF' },
  hr:          { label: 'HR',          color: '#2563EB', bg: '#EFF6FF' },
  team_leader: { label: 'Team Leader', color: '#D97706', bg: '#FFF7ED' },
  employee:    { label: 'Employee',    color: '#059669', bg: '#F0FDF4' },
};

// ── Menu Item ──────────────────────────────────────────────────────────────
const MenuItem = ({ item, onPress, delay }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 340, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 340, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.78}>
        <View style={[styles.menuIconBox, { backgroundColor: item.iconBg }]}>
          <item.icon color={item.iconColor} size={19} strokeWidth={2} />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuLabel}>{item.label}</Text>
          {item.sub ? <Text style={styles.menuSub}>{item.sub}</Text> : null}
        </View>
        <ChevronRight color="#D1D5DB" size={17} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function MoreScreen({ navigation }) {
  const { logout, user } = useContext(AuthContext);

  const role = user?.role || 'employee';
  const rc = ROLE_CFG[role] || ROLE_CFG.employee;
  const initial = user?.name?.[0]?.toUpperCase() || 'U';

  const MENU = [
    {
      section: 'Workspace',
      items: [
        { icon: CheckSquare,  label: 'My Tasks',          sub: 'Assigned tasks & to-dos',         route: 'Tasks',           iconBg: '#EEF2FF', iconColor: '#4F46E5'   },
        ...(role === 'super_admin' || role === 'hr' ? [
          { icon: FileText,     label: 'Documents',         sub: 'Files and attachments',          route: 'Documents',       iconBg: '#EEF2FF', iconColor: PRIMARY      }
        ] : []),
        { icon: Users,        label: 'Team Directory',    sub: 'Colleagues and roles',            route: 'Team',            iconBg: '#F5F3FF', iconColor: '#7C3AED'   },
      ],
    },
    {
      section: 'Communication',
      items: [
        { icon: Megaphone,    label: 'Notice Board',      sub: 'Announcements & Alerts',          route: 'Announcements',   iconBg: '#EFF6FF', iconColor: '#1b2b4c'   },
        { icon: Mail,         label: 'Email',             sub: 'Internal messages',               route: 'Email',           iconBg: '#F0FDF4', iconColor: '#059669'   },
        { icon: CalendarDays, label: 'Meetings',          sub: 'Schedule and upcoming',           route: 'Meetings',        iconBg: '#FFF7ED', iconColor: '#D97706'   },
      ],
    },
    {
      section: 'Tools',
      items: [
        { icon: Clock,        label: 'Attendance & Leave', sub: 'Check in and time off',         route: 'AttendanceLeave', iconBg: '#FEF2F2', iconColor: '#DC2626'   },
        { icon: LifeBuoy,     label: 'Support Tickets',   sub: 'IT & HR Support requests',       route: 'Tickets',         iconBg: '#EFF6FF', iconColor: '#1b2b4c'   },
        { icon: StickyNote,   label: 'Quick Notes',       sub: 'Personal scratchpad',            route: 'Notes',           iconBg: '#FEF9C3', iconColor: '#EAB308'   },
        ...(role === 'super_admin' || role === 'hr' ? [
          { icon: BarChart3,  label: 'Analytics',         sub: 'Reports & Productivity',         route: 'Analytics',       iconBg: '#F5F3FF', iconColor: '#8B5CF6'   }
        ] : [])
      ],
    },
    {
      section: 'Account',
      items: [
        { icon: Settings,     label: 'Settings',          sub: 'App preferences',                 route: 'Settings',        iconBg: '#F9FAFB', iconColor: '#6B7280'   },
      ],
    },
  ];

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  let d = 60;

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ──────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Card ─────────────────────── */}
        <Animated.View style={[styles.profileCard, { opacity: fade }]}>
          {/* Avatar */}
          <View style={[styles.avatarBox, { backgroundColor: rc.bg }]}>
            <Text style={[styles.avatarLetter, { color: rc.color }]}>{initial}</Text>
          </View>

          {/* Info */}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{user?.name || 'User'}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>
            <View style={[styles.rolePill, { backgroundColor: rc.bg }]}>
              <View style={[styles.roleDot, { backgroundColor: rc.color }]} />
              <Text style={[styles.roleLabel, { color: rc.color }]}>{rc.label}</Text>
            </View>
          </View>

          {/* Edit */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <User color="#9CA3AF" size={17} strokeWidth={1.8} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Menu sections ─────────────────────── */}
        {MENU.map(section => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section.toUpperCase()}</Text>
            {section.items.map(item => {
              const delay = d;
              d += 35;
              return (
                <MenuItem
                  key={item.route}
                  item={item}
                  delay={delay}
                  onPress={() => navigation.navigate(item.route)}
                />
              );
            })}
          </View>
        ))}

        {/* ── Logout ────────────────────────────── */}
        <Animated.View style={{ opacity: fade, marginTop: 8 }}>
          <TouchableOpacity style={styles.logoutRow} onPress={logout} activeOpacity={0.8}>
            <View style={styles.logoutIconBox}>
              <LogOut color="#DC2626" size={19} strokeWidth={2} />
            </View>
            <Text style={styles.logoutLabel}>Sign Out</Text>
            <ChevronRight color="#FCA5A5" size={17} />
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.versionText}>Madhura Workspace · v1.0.0</Text>
        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  // Profile card
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 24,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  avatarBox: {
    width: 54, height: 54, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarLetter: { fontSize: 22, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 3 },
  profileEmail: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  roleLabel: { fontSize: 11, fontWeight: '700' },
  editBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },

  // Section
  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.8, marginBottom: 8, paddingLeft: 2,
  },

  // Menu row
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  menuIconBox: {
    width: 42, height: 42, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  menuSub: { fontSize: 12, color: '#9CA3AF' },

  // Logout
  logoutRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutIconBox: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  logoutLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: '#DC2626' },

  versionText: {
    textAlign: 'center', fontSize: 12, color: '#D1D5DB',
    fontWeight: '500', marginTop: 28, marginBottom: 8,
  },
});
