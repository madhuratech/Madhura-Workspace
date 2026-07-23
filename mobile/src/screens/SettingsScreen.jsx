import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, LogOut, User, Bell, Shield, HelpCircle, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';

const SettingItem = ({ icon: Icon, title, subtitle, onPress, isDestructive, delay }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 12, bounciness: 4, delay, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity style={[styles.settingItem, isDestructive && styles.destructiveItem]} onPress={onPress}>
        <View style={[styles.iconContainer, isDestructive && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Icon color={isDestructive ? '#991B1B' : '#4B5563'} size={20} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.titleText, isDestructive && { color: '#991B1B' }]}>{title}</Text>
          {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
        </View>
        {!isDestructive && <ChevronRight color="#D1D5DB" size={20} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SettingsScreen({ navigation }) {
  const { logout, user } = useContext(AuthContext);

  const profileFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(profileFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Animated.View style={[styles.profileSection, { opacity: profileFade }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role?.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>
        </Animated.View>

        <Text style={styles.sectionTitle}>Account</Text>
        <SettingItem 
          icon={User} title="Personal Information" subtitle="Update your name and profile" 
          onPress={() => {}} delay={0}
        />
        <SettingItem 
          icon={Bell} title="Notifications" subtitle="Configure push and email alerts" 
          onPress={() => {}} delay={50}
        />
        <SettingItem 
          icon={Shield} title="Security" subtitle="Change password and 2FA" 
          onPress={() => {}} delay={100}
        />

        <Text style={styles.sectionTitle}>Support</Text>
        <SettingItem 
          icon={HelpCircle} title="Help & Support" subtitle="Contact us or view FAQs" 
          onPress={() => {}} delay={150}
        />

        <Text style={styles.sectionTitle}>Session</Text>
        <SettingItem 
          icon={LogOut} title="Log Out" isDestructive={true}
          onPress={logout} delay={200}
        />
        
        <Text style={styles.versionText}>Madhura Workspace v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF'
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827', letterSpacing: -0.5 },
  scrollContent: { padding: 24, paddingBottom: 140 }, 

  profileSection: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: 24, borderRadius: 20, marginBottom: 32, borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1
  },
  avatar: {
    width: 60, height: 60, borderRadius: 16, backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#ffffff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4, letterSpacing: -0.5 },
  profileEmail: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  roleBadge: {
    alignSelf: 'flex-start', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  roleText: { fontSize: 10, fontWeight: '600', color: '#4B5563', letterSpacing: 0.5 },
  
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 12, marginTop: 16,
  },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: 16, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1
  },
  destructiveItem: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  iconContainer: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F9FAFB',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  textContainer: { flex: 1 },
  titleText: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  subtitleText: { fontSize: 12, color: '#6B7280' },
  versionText: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 32, marginBottom: 24, fontWeight: '500' }
});
