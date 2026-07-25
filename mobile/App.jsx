import React, { useContext, useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ActivityIndicator, View, Text, Platform, Animated, TouchableOpacity } from 'react-native';
import { Home, FolderKanban, CheckSquare, Menu, MessageSquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MyTasksScreen from './src/screens/MyTasksScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import ProjectDetailsScreen from './src/screens/ProjectDetailsScreen';
import TeamScreen from './src/screens/TeamScreen';
import MoreScreen from './src/screens/MoreScreen';
import ChatScreen from './src/screens/ChatScreen';
import ChatWindowScreen from './src/screens/ChatWindowScreen';
import EmailScreen from './src/screens/EmailScreen';
import MeetingsScreen from './src/screens/MeetingsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AttendanceLeaveScreen from './src/screens/AttendanceLeaveScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Projects Stack ────────────────────────────────────────────────────────
const ProjectsStack = createNativeStackNavigator();
function ProjectsNavigator() {
  return (
    <ProjectsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProjectsStack.Screen name="ProjectsList" component={ProjectsScreen} />
      <ProjectsStack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
    </ProjectsStack.Navigator>
  );
}

// ─── Chat Stack ────────────────────────────────────────────────────────────
const ChatStack = createNativeStackNavigator();
function ChatNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatList" component={ChatScreen} />
      <ChatStack.Screen name="ChatWindow" component={ChatWindowScreen} />
    </ChatStack.Navigator>
  );
}

// ─── More Stack ────────────────────────────────────────────────────────────
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
      <MoreStack.Screen name="AttendanceLeave" component={AttendanceLeaveScreen} />
    </MoreStack.Navigator>
  );
}

// ─── Premium Tab Bar Icon ──────────────────────────────────────────────────
function TabIcon({ icon: Icon, label, focused }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1.12, speed: 20, bounciness: 8, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, speed: 20, bounciness: 4, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [focused]);

  const ACTIVE_COLOR = '#818CF8';   // indigo-400
  const INACTIVE_COLOR = '#475569'; // slate-600

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 2 }}>
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 36,
          borderRadius: 12,
          backgroundColor: focused ? 'rgba(129,140,248,0.15)' : 'transparent',
        }}
      >
        <Icon
          color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
          size={20}
          strokeWidth={focused ? 2.5 : 1.8}
        />
      </Animated.View>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10,
          marginTop: 2,
          fontWeight: focused ? '700' : '500',
          color: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
      {focused && (
        <View
          style={{
            marginTop: 3,
            width: 20,
            height: 3,
            borderRadius: 2,
            backgroundColor: ACTIVE_COLOR,
            shadowColor: ACTIVE_COLOR,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
          }}
        />
      )}
    </View>
  );
}

// ─── Custom Tab Bar Background ──────────────────────────────────────────────
function PremiumTabBar({ state, descriptors, navigation }) {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        borderRadius: 28,
        overflow: 'hidden',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 20,
      }}
    >
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row',
          height: Platform.OS === 'ios' ? 78 : 68,
          paddingBottom: Platform.OS === 'ios' ? 16 : 6,
          paddingTop: 8,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const iconMap = {
            Dashboard: Home,
            Tasks: CheckSquare,
            Projects: FolderKanban,
            Chat: MessageSquare,
            Menu: Menu,
          };
          const labelMap = {
            Dashboard: 'Home',
            Tasks: 'Tasks',
            Projects: 'Projects',
            Chat: 'Chat',
            Menu: 'More',
          };

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <TabIcon
                icon={iconMap[route.name] || Home}
                label={labelMap[route.name] || route.name}
                focused={isFocused}
              />
            </TouchableOpacity>
          );
        })}
      </LinearGradient>
    </View>
  );
}

const tabBarStyle = {
  display: 'flex',
};
const hiddenTabBarStyle = { display: 'none' };

// ─── Bottom Tab Navigator ──────────────────────────────────────────────────
function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <PremiumTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tasks" component={MyTasksScreen} />
      <Tab.Screen
        name="Projects"
        component={ProjectsNavigator}
        options={({ route }) => {
          const routeName =
            require('@react-navigation/native').getFocusedRouteNameFromRoute(route) ?? 'ProjectsList';
          return {
            tabBarStyle: routeName === 'ProjectDetails' ? hiddenTabBarStyle : tabBarStyle,
          };
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={({ route }) => {
          const routeName =
            require('@react-navigation/native').getFocusedRouteNameFromRoute(route) ?? 'ChatList';
          return {
            tabBarStyle: routeName === 'ChatWindow' ? hiddenTabBarStyle : tabBarStyle,
          };
        }}
      />
      <Tab.Screen name="Menu" component={MoreNavigator} />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <View style={{
          width: 72, height: 72, borderRadius: 22,
          backgroundColor: '#6366F1',
          justifyContent: 'center', alignItems: 'center',
          shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.5, shadowRadius: 20, elevation: 12, marginBottom: 24,
        }}>
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800' }}>M</Text>
        </View>
        <ActivityIndicator size="large" color="#818CF8" />
        <Text style={{ color: '#475569', fontSize: 13, marginTop: 16, fontWeight: '500' }}>
          Loading your workspace...
        </Text>
      </LinearGradient>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
