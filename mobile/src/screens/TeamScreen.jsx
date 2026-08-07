import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Animated, Alert, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, Users, UserPlus, Key } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const AVATAR_COLORS = [
  '#1b2b4c','#8B5CF6','#F97316','#10B981','#EC4899',
  '#06B6D4','#EF4444','#84CC16','#F59E0B',
];

const ROLE_CONFIG = {
  super_admin: { bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED', label: 'MD' },
  hr:          { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', label: 'HR'          },
  team_leader: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', label: 'Team Leader' },
  employee:    { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', label: 'Employee'    },
};

const MemberCard = ({ member, delay, colorIdx, currentUserRole, onResetPassword }) => {
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

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {currentUserRole === 'super_admin' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => onResetPassword(memberUser?._id)}>
            <Key color="#94A3B8" size={18} strokeWidth={1.6} />
          </TouchableOpacity>
        )}
        {email ? (
          <TouchableOpacity style={styles.actionBtn}>
            <Mail color="#94A3B8" size={18} strokeWidth={1.6} />
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
};

export default function TeamScreen({ navigation }) {
  const { user } = React.useContext(AuthContext);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('employee');
  const [resetModal, setResetModal] = useState({ isVisible: false, userId: null, newPassword: '', loading: false });
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
        const memberList = detailRes.data.members || [];
        setMembers(memberList);
        
        const me = memberList.find(m => String(m.user?._id || m.user) === String(user._id));
        if (me) setCurrentUserRole(me.role);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = (userId) => {
    setResetModal({ isVisible: true, userId, newPassword: '', loading: false });
  };

  const submitResetPassword = async () => {
    const { userId, newPassword } = resetModal;
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setResetModal(prev => ({ ...prev, loading: true }));
    try {
      await axios.put(`/users/${userId}/reset-password`, { newPassword });
      setResetModal({ isVisible: false, userId: null, newPassword: '', loading: false });
      Alert.alert('Success', 'Password reset successfully');
    } catch (error) {
      setResetModal(prev => ({ ...prev, loading: false }));
      Alert.alert('Error', error.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#1b2b4c" size={22} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Team Directory</Text>
          <Text style={styles.headerSub}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
        </View>
        {['super_admin', 'hr'].includes(currentUserRole) && (
          <TouchableOpacity style={styles.inviteBtn} onPress={() => navigation.navigate('RegisterMember')}>
            <UserPlus color="#ffffff" size={18} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1b2b4c" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item, index) => item.user?._id || String(index)}
          renderItem={({ item, index }) => (
            <MemberCard 
              member={item} 
              delay={index * 50} 
              colorIdx={index} 
              currentUserRole={currentUserRole}
              onResetPassword={handleResetPassword}
            />
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

      {/* Reset Password Modal */}
      <Modal visible={resetModal.isVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={() => setResetModal({ isVisible: false, userId: null, newPassword: '', loading: false })} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>Enter a new password for this user.</Text>

            <View style={styles.inputContainer}>
              <Key size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New Password (min 6 chars)"
                secureTextEntry
                autoFocus
                value={resetModal.newPassword}
                onChangeText={(text) => setResetModal(prev => ({ ...prev, newPassword: text }))}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, resetModal.loading && { opacity: 0.7 }]} 
              activeOpacity={0.8}
              onPress={submitResetPassword}
              disabled={resetModal.loading}
            >
              {resetModal.loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Reset Password</Text>
              )}
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  inviteBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: '#1b2b4c',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1b2b4c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1b2b4c' },
  headerSub: { fontSize: 13, color: '#64748B', marginTop: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 140 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 18, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1b2b4c', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarText: { fontSize: 22, fontWeight: '700' },

  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1b2b4c', marginBottom: 2 },
  designation: { fontSize: 12, color: '#64748B', marginBottom: 6 },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  actionBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
  },

  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#94A3B8', marginTop: 14 },

  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 20, width: '100%',
    padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 10
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1b2b4c' },
  modalSub: { fontSize: 13, color: '#64748B', marginBottom: 20 },
  modalCloseBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center'
  },
  modalCloseText: { fontSize: 16, color: '#64748B', fontWeight: 'bold' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    marginBottom: 20, paddingHorizontal: 14, height: 50
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#1b2b4c' },
  saveBtn: {
    backgroundColor: '#1b2b4c', borderRadius: 12, height: 50,
    justifyContent: 'center', alignItems: 'center'
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
