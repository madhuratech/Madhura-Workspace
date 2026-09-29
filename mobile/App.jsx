import React, { useContext, useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ActivityIndicator, View, Text, Platform, Animated, TouchableOpacity, StyleSheet, Image, Easing } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Home, FolderKanban, CheckSquare, MoreHorizontal, MessageSquare } from 'lucide-react-native';
import { SocketProvider } from './src/context/SocketContext';
import Toast from 'react-native-toast-message';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MyTasksScreen from './src/screens/MyTasksScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import ProjectDetailsScreen from './src/screens/ProjectDetailsScreen';
import CreateProjectScreen from './src/screens/CreateProjectScreen';
import TeamScreen from './src/screens/TeamScreen';
import MoreScreen from './src/screens/MoreScreen';
import ChatScreen from './src/screens/ChatScreen';
import ChatWindowScreen from './src/screens/ChatWindowScreen';
import EmailScreen from './src/screens/EmailScreen';
import MeetingsScreen from './src/screens/MeetingsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AttendanceLeaveScreen from './src/screens/AttendanceLeaveScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import RegisterMemberScreen from './src/screens/RegisterMemberScreen';
import TicketsScreen from './src/screens/TicketsScreen';
import AnnouncementsScreen from './src/screens/AnnouncementsScreen';
import NotesScreen from './src/screens/NotesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Stacks ────────────────────────────────────────────────────────────────
const ProjectsStack = createNativeStackNavigator();
function ProjectsNavigator() {
  return (
    <ProjectsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProjectsStack.Screen name="ProjectsList" component={ProjectsScreen} />
      <ProjectsStack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
      <ProjectsStack.Screen name="CreateProject" component={CreateProjectScreen} />
    </ProjectsStack.Navigator>
  );
}

const ChatStack = createNativeStackNavigator();
function ChatNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatList" component={ChatScreen} />
      <ChatStack.Screen name="ChatWindow" component={ChatWindowScreen} />
    </ChatStack.Navigator>
  );
}

const MoreStack = createNativeStackNavigator();
function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreMenu" component={MoreScreen} />
      <MoreStack.Screen name="Documents" component={DocumentsScreen} />
      <MoreStack.Screen name="Team" component={TeamScreen} />
      <MoreStack.Screen name="Email" component={EmailScreen} />
      <MoreStack.Screen name="Meetings" component={MeetingsScreen} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
      <MoreStack.Screen name="RegisterMember" component={RegisterMemberScreen} />
      <MoreStack.Screen name="AttendanceLeave" component={AttendanceLeaveScreen} />
      <MoreStack.Screen name="Analytics" component={AnalyticsScreen} />
      <MoreStack.Screen name="Tickets" component={TicketsScreen} />
      <MoreStack.Screen name="Announcements" component={AnnouncementsScreen} />
      <MoreStack.Screen name="Notes" component={NotesScreen} />
    </MoreStack.Navigator>
  );
}

// ─── Custom Tab Bar ────────────────────────────────────────────────────────
const TAB_CONFIG = [
  { name: 'Dashboard', label: 'Home',     Icon: Home },
  { name: 'Tasks',     label: 'Tasks',    Icon: CheckSquare },
  { name: 'Projects',  label: 'Projects', Icon: FolderKanban },
  { name: 'Chat',      label: 'Chat',     Icon: MessageSquare },
  { name: 'Menu',      label: 'More',     Icon: MoreHorizontal },
];

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  
  if (focusedOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View style={[tabStyles.wrapper, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: '#ffffff', borderTopColor: '#E2E8F0' }]}>
      <View style={[tabStyles.container, { backgroundColor: '#ffffff' }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const cfg = TAB_CONFIG.find(t => t.name === route.name) || TAB_CONFIG[0];
          const { Icon } = cfg;

          // Simple local state animation for scale
          const scale = useRef(new Animated.Value(isFocused ? 1.15 : 1)).current;

          useEffect(() => {
            Animated.spring(scale, { toValue: isFocused ? 1.15 : 1, friction: 5, useNativeDriver: true }).start();
          }, [isFocused]);

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.7} style={tabStyles.tab}>
              <Animated.View style={[tabStyles.pill, { transform: [{ scale }] }]}>
                <Icon color={isFocused ? '#1b2b4c' : '#64748B'} size={24} strokeWidth={isFocused ? 2.5 : 2} />
              </Animated.View>
              <Text style={[tabStyles.label, { color: isFocused ? '#1b2b4c' : '#64748B', fontWeight: isFocused ? '700' : '500' }]}>
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  pill: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  pillActive: {
  },
  label: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  }
});

// ─── Tab Navigator ──────────────────────────────────────────────────────────
const HIDE_TAB = { tabBarStyle: { display: 'none' } };

function TabNavigator() {
  const { user } = useContext(AuthContext);
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      {user?.role !== 'super_admin' && (
        <Tab.Screen name="Tasks" component={MyTasksScreen} />
      )}
      <Tab.Screen
        name="Projects"
        component={ProjectsNavigator}
        options={({ route }) => {
          const n = require('@react-navigation/native').getFocusedRouteNameFromRoute(route) ?? 'ProjectsList';
          return n === 'ProjectDetails' || n === 'CreateProject' ? HIDE_TAB : {};
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={({ route }) => {
          const n = require('@react-navigation/native').getFocusedRouteNameFromRoute(route) ?? 'ChatList';
          return n === 'ChatWindow' ? HIDE_TAB : {};
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MoreNavigator}
        options={({ route }) => {
          const n = require('@react-navigation/native').getFocusedRouteNameFromRoute(route) ?? 'MoreMenu';
          return n !== 'MoreMenu' ? HIDE_TAB : {};
        }}
      />
    </Tab.Navigator>
  );
}

const AnimatedSplashScreen = ({ onFinish }) => {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(15)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo scale & fade in
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true })
      ]),
      // 2. Text slide and fade in
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(textTranslateY, { toValue: 0, friction: 6, tension: 60, useNativeDriver: true })
      ]),
      // 3. Tagline fade in
      Animated.timing(tagOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      // 4. Hold briefly for a smooth clean look
      Animated.delay(400),
      // 5. Fade out splash cleanly
      Animated.timing(containerOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start(() => {
      if (onFinish) onFinish();
    });
  }, []);

  return (
    <Animated.View style={[splashStyles.container, { opacity: containerOpacity }]}>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <Animated.View style={[splashStyles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image 
          source={require('./assets/logo.jpeg')} 
          style={splashStyles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={[splashStyles.textContainer, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}>
        <Text style={splashStyles.brandTitle}>
          Madhura<Text style={{ color: '#ffca22' }}>Workspace</Text>
        </Text>
      </Animated.View>

      <Animated.View style={[splashStyles.tagContainer, { opacity: tagOpacity }]}>
        <Text style={splashStyles.tagText}>ENTERPRISE WORKSPACE</Text>
        <ActivityIndicator size="small" color="#1b2b4c" style={{ marginTop: 16 }} />
      </Animated.View>
    </Animated.View>
  );
};

const splashStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1b2b4c',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    marginBottom: 20,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 20,
  },
  textContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1b2b4c',
    letterSpacing: -0.5,
  },
  tagContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 3,
  }
});

// ─── Root ──────────────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#1b2b4c" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [splashFinished, setSplashFinished] = React.useState(false);

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <AuthProvider>
        <SocketProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
          {!splashFinished && (
            <AnimatedSplashScreen onFinish={() => setSplashFinished(true)} />
          )}
          <Toast />
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
