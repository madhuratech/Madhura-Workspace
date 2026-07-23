import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft } from 'lucide-react-native';
import axios from 'axios';

const MemberCard = ({ member, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 12, bounciness: 4, delay, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{member.user?.name ? member.user.name.charAt(0).toUpperCase() : 'U'}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.user?.name || 'Unknown'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{member.role.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.contactItem}>
          <Mail color="#6B7280" size={14} />
          <Text style={styles.contactText}>{member.user?.email || 'No email'}</Text>
        </View>
      </View>
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
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Team Directory</Text>
          <Text style={styles.headerSubtitle}>{members.length} Members</Text>
        </View>
      </Animated.View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={item => item.user?._id || Math.random().toString()}
          renderItem={({ item, index }) => <MemberCard member={item} delay={index * 50} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  backBtn: { padding: 8, marginRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 24, paddingBottom: 140 },
  
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
    borderWidth: 1, borderColor: '#BFDBFE'
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#2563EB' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 6 },
  roleBadge: {
    alignSelf: 'flex-start', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  roleText: { fontSize: 10, fontWeight: '600', color: '#4B5563', letterSpacing: 0.5 },
  
  cardFooter: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  contactItem: { flexDirection: 'row', alignItems: 'center' },
  contactText: { fontSize: 13, color: '#6B7280', marginLeft: 8, fontWeight: '500' }
});
