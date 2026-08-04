import React, { useContext, useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ActivityIndicator, View, Text, Platform, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, FolderKanban, CheckSquare, MoreHorizontal, MessageSquare } from 'lucide-react-native';
import { SocketProvider } from './src/context/SocketContext';
import Toast from 'react-native-toast-message';

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
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import RegisterMemberScreen from './src/screens/RegisterMemberScreen';
import TicketsScreen from './src/screens/TicketsScreen';

const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();

const PRIMARY = '#5B5BD6';

// ─── Stacks ────────────────────────────────────────────────────────────────
const ProjectsStack = createNativeStackNavigator();
function ProjectsNavigator() {
  return (
    <ProjectsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProjectsStack.Screen name="ProjectsList" component={ProjectsScreen} />
      <ProjectsStack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
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

import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  if (focusedOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View style={[tabStyles.wrapper, { bottom: Math.max(insets.bottom + 10, 20) }]}>
      <View style={tabStyles.container}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const cfg = TAB_CONFIG.find(t => t.name === route.name) || TAB_CONFIG[0];
          const { Icon } = cfg;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={tabStyles.tab}
            >
              <View style={tabStyles.pill}>
                <Icon
                  color={isFocused ? PRIMARY : '#9CA3AF'}
                  size={24}
                  strokeWidth={isFocused ? 2.5 : 2}
                />
              </View>
              <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
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
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#1a1a2e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  pill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  pillActive: {
    // Removed background color to avoid square appearance
  },
  label: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  labelActive: {
    color: PRIMARY,
    fontWeight: '700',
  },
});

// ─── Tab Navigator ──────────────────────────────────────────────────────────
const HIDE_TAB = { tabBarStyle: { display: 'none' } };

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tasks" component={MyTasksScreen} />
      <Tab.Screen
        name="Projects"
        component={ProjectsNavigator}
        options={({ route }) => {
          const n = require('@react-navigation/native').getFocusedRouteNameFromRoute(route) ?? 'ProjectsList';
          return n === 'ProjectDetails' ? HIDE_TAB : {};
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

// ─── Root ──────────────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <View style={{
          width: 64, height: 64, borderRadius: 20,
          backgroundColor: PRIMARY,
          justifyContent: 'center', alignItems: 'center',
          marginBottom: 20,
        }}>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>M</Text>
        </View>
        <ActivityIndicator color={PRIMARY} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
  return (
    <AuthProvider>
      <SocketProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
        <Toast />
      </SocketProvider>
    </AuthProvider>
  );
}
