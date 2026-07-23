import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Users, Settings, ChevronRight, CalendarDays, Mail, Clock } from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';

const MenuItem = ({ icon: Icon, title, subtitle, onPress, delay }) => {
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
      <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={styles.iconContainer}>
          <Icon color="#4B5563" size={22} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>{title}</Text>
          {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
        </View>
        <ChevronRight color="#D1D5DB" size={20} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function MoreScreen({ navigation }) {
  const { logout } = useContext(AuthContext);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.sectionTitle}>Organization</Text>
        <MenuItem 
          icon={FileText} title="Documents" subtitle="View and download files"
          onPress={() => navigation.navigate('Documents')} delay={0}
        />
        <MenuItem 
          icon={Users} title="Team Directory" subtitle="Find colleagues and roles" 
          onPress={() => navigation.navigate('Team')} delay={50}
        />

        <Text style={styles.sectionTitle}>Communication</Text>
        <MenuItem 
          icon={Mail} title="Email" subtitle="Internal communications" 
          onPress={() => navigation.navigate('Email')} delay={100}
        />
        <MenuItem 
          icon={CalendarDays} title="Meetings" subtitle="Schedule and upcoming" 
          onPress={() => navigation.navigate('Meetings')} delay={150}
        />

        <Text style={styles.sectionTitle}>Tools</Text>
        <MenuItem 
          icon={Clock} title="Attendance & Leave" subtitle="Punch in and request time off" 
          onPress={() => navigation.navigate('AttendanceLeave')} delay={200}
        />

        <Text style={styles.sectionTitle}>Account</Text>
        <MenuItem 
          icon={Settings} title="Settings & Logout" subtitle="Preferences and account" 
          onPress={() => navigation.navigate('Settings')} delay={250}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#111827', letterSpacing: -0.5 },
  scrollContent: { padding: 24, paddingBottom: 140 }, 
  
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 12, marginTop: 24,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: 16, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1
  },
  iconContainer: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#F9FAFB',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  textContainer: { flex: 1 },
  titleText: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  subtitleText: { fontSize: 13, color: '#6B7280' }
});
