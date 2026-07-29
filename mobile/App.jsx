import 'react-native-gesture-handler';
import React, { useContext, useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ActivityIndicator, View, Text, Platform, Animated, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Home, FolderKanban, CheckSquare, MoreHorizontal, MessageSquare, LogOut, Settings, Users, CalendarDays, FileText, BarChart3, Clock } from 'lucide-react-native';
import { SocketProvider } from './src/context/SocketContext';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();
const Drawer = createDrawerNavigator();

const PRIMARY = '#5B5BD6';
const SIDEBAR_BG = '#1A1D21'; // Slack-like dark purple/black
const SIDEBAR_TEXT = '#D1D2D3';

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
    </MoreStack.Navigator>
  );
}

// ─── Custom Tab Bar (Edge-to-Edge) ─────────────────────────────────────────
const TAB_CONFIG = [
  { name: 'Dashboard', label: 'Home',     Icon: Home },
  { name: 'Chat',      label: 'Chat',     Icon: MessageSquare },
  { name: 'Tasks',     label: 'Tasks',    Icon: CheckSquare },
  { name: 'Projects',  label: 'Projects', Icon: FolderKanban },
  { name: 'Menu',      label: 'More',     Icon: MoreHorizontal },
];

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  if (focusedOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View style={[tabStyles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
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
            <View style={tabStyles.iconWrapper}>
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
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginBottom: 4,
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
      screenOptions={{ headerShown: false, swipeEnabled: false }} // disable swipe to not conflict with drawer
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={({ route }) => {
          const n = require('@react-navigation/native').getFocusedRouteNameFromRoute(route) ?? 'ChatList';
          return n === 'ChatWindow' ? HIDE_TAB : {};
        }}
      />
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

// ─── Custom Drawer Content ─────────────────────────────────────────────────
function CustomDrawerContent(props) {
  const { user, logout } = useContext(AuthContext);

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, backgroundColor: SIDEBAR_BG }}>
      {/* Workspace / User Profile Header */}
      <View style={{ padding: 20, paddingBottom: 30, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>M</Text>
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>MadhuraWS</Text>
            <Text style={{ color: SIDEBAR_TEXT, fontSize: 13 }}>Workspace</Text>
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#3F3F46', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
              {user?.name?.substring(0, 2).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{user?.name || 'User'}</Text>
            <Text style={{ color: SIDEBAR_TEXT, fontSize: 12, textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ') || 'Member'}
            </Text>
          </View>
        </View>
      </View>

      {/* Drawer Items */}
      <View style={{ flex: 1, paddingTop: 10 }}>
        <DrawerItem 
          label="Dashboard" 
          icon={({ color, size }) => <Home color={SIDEBAR_TEXT} size={20} />}
          labelStyle={{ color: SIDEBAR_TEXT, marginLeft: -16, fontWeight: '500' }}
          onPress={() => props.navigation.navigate('MainTabs', { screen: 'Dashboard' })} 
        />
        <DrawerItem 
          label="Direct Messages" 
          icon={({ color, size }) => <MessageSquare color={SIDEBAR_TEXT} size={20} />}
          labelStyle={{ color: SIDEBAR_TEXT, marginLeft: -16, fontWeight: '500' }}
          onPress={() => props.navigation.navigate('MainTabs', { screen: 'Chat' })} 
        />
        <DrawerItem 
          label="My Tasks" 
          icon={({ color, size }) => <CheckSquare color={SIDEBAR_TEXT} size={20} />}
          labelStyle={{ color: SIDEBAR_TEXT, marginLeft: -16, fontWeight: '500' }}
          onPress={() => props.navigation.navigate('MainTabs', { screen: 'Tasks' })} 
        />
        <DrawerItem 
          label="Projects" 
          icon={({ color, size }) => <FolderKanban color={SIDEBAR_TEXT} size={20} />}
          labelStyle={{ color: SIDEBAR_TEXT, marginLeft: -16, fontWeight: '500' }}
          onPress={() => props.navigation.navigate('MainTabs', { screen: 'Projects' })} 
        />
        <DrawerItem 
          label="Meetings" 
          icon={({ color, size }) => <CalendarDays color={SIDEBAR_TEXT} size={20} />}
          labelStyle={{ color: SIDEBAR_TEXT, marginLeft: -16, fontWeight: '500' }}
          onPress={() => props.navigation.navigate('MainTabs', { screen: 'Menu', params: { screen: 'Meetings' } })} 
        />
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10, marginHorizontal: 20 }} />
        <DrawerItem 
          label="Settings" 
          icon={({ color, size }) => <Settings color={SIDEBAR_TEXT} size={20} />}
          labelStyle={{ color: SIDEBAR_TEXT, marginLeft: -16, fontWeight: '500' }}
          onPress={() => props.navigation.navigate('MainTabs', { screen: 'Menu', params: { screen: 'Settings' } })} 
        />
      </View>

      {/* Logout */}
      <View style={{ padding: 20, paddingBottom: Math.max(props.insets?.bottom || 20, 20), borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
        <TouchableOpacity onPress={logout} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <LogOut color="#EF4444" size={20} />
          <Text style={{ color: '#EF4444', fontWeight: 'bold', marginLeft: 16 }}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

// ─── Drawer Wrapper ────────────────────────────────────────────────────────
function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{ 
        headerShown: false,
        drawerStyle: {
          backgroundColor: SIDEBAR_BG,
          width: 300,
        },
        drawerType: 'slide',
      }}
    >
      <Drawer.Screen name="MainTabs" component={TabNavigator} />
    </Drawer.Navigator>
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
          <Stack.Screen name="DrawerRoot" component={DrawerNavigator} />
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
