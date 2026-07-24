import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, Users } from 'lucide-react-native';
import axios from 'axios';

const AVATAR_COLORS = [
  '#3B82F6','#8B5CF6','#F97316','#10B981','#EC4899',
  '#06B6D4','#EF4444','#84CC16','#F59E0B',
];

const ROLE_CONFIG = {
  super_admin: { bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED', label: 'Super Admin' },
  hr:          { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', label: 'HR'          },
  team_leader: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', label: 'Team Leader' },
  employee:    { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', label: 'Employee'    },
};

const MemberCard = ({ member, delay, colorIdx }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 4, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const memberUser = member.user || member;
  const name = memberUser?.name || 'Unknown';
  const email = memberUser?.email || '';
  const role = member.role || memberUser?.role || 'employee';
  const initial = name.charAt(0).toUpperCase();
  const color = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
  const roleCfg = ROLE_CONFIG[role] || ROLE_CONFIG.employee;

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: color + '20' }]}>
        <Text style={[styles.avatarText, { color }]}>{initial}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {memberUser?.designation && (
          <Text style={styles.designation}>{memberUser.designation}</Text>
        )}
        {/* Role badge */}
        <View style={[styles.roleBadge, { backgroundColor: roleCfg.bg, borderColor: roleCfg.border }]}>
          <Text style={[styles.roleText, { color: roleCfg.text }]}>{roleCfg.label}</Text>
        </View>
      </View>

      {/* Email */}
      {email ? (
        <View style={styles.emailBtn}>
          <Mail color="#94A3B8" size={18} strokeWidth={1.6} />
        </View>
      ) : null}
    </Animated.View>
  );
};

export default function TeamScreen({ navigation }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        const detailRes = await axios.get(`/workspaces/${ws._id}`);
        setMembers(detailRes.data.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#0F172A" size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Team Directory</Text>
          <Text style={styles.headerSub}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
        </View>
      </Animated.View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item, index) => item.user?._id || String(index)}
          renderItem={({ item, index }) => (
            <MemberCard member={item} delay={index * 50} colorIdx={index} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Users color="#CBD5E1" size={48} />
              <Text style={styles.emptyTitle}>No team members yet.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 140 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 18, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarText: { fontSize: 22, fontWeight: '700' },

  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  designation: { fontSize: 12, color: '#64748B', marginBottom: 6 },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  emailBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
  },

  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#94A3B8', marginTop: 14 },
});
