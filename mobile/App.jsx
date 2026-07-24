import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { Home, FolderKanban, CheckSquare, Menu, MessageSquare } from 'lucide-react-native';

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

// ─── Tab Bar Icon Component ────────────────────────────────────────────────
function TabIcon({ icon: Icon, label, focused, color }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
      <Icon
        color={color}
        size={21}
        strokeWidth={focused ? 2.5 : 1.8}
      />
      <Text
        numberOfLines={1}
        style={{
          fontSize: 9,
          marginTop: 3,
          fontWeight: focused ? '700' : '500',
          color: color,
        }}
      >
        {label}
      </Text>
      {focused && (
        <View
          style={{
            marginTop: 3,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#3B82F6',
          }}
        />
      )}
    </View>
  );
}

// ─── Tab style helper ──────────────────────────────────────────────────────
const tabBarStyle = {
  backgroundColor: '#ffffff',
  position: 'absolute',
  bottom: 16,
  left: 16,
  right: 16,
  elevation: 8,
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 24,
  borderRadius: 28,
  height: Platform.OS === 'ios' ? 80 : 72,
  paddingBottom: Platform.OS === 'ios' ? 14 : 4,
  paddingTop: 0,
  borderWidth: 1,
  borderColor: '#F1F5F9',
};

const hiddenTabBarStyle = { ...tabBarStyle, display: 'none' };

// ─── Bottom Tab Navigator ──────────────────────────────────────────────────
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarShowLabel: false,
        tabBarStyle,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Home} label="Home" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={MyTasksScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={CheckSquare} label="Tasks" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsNavigator}
        options={({ route }) => {
          const routeName =
            require('@react-navigation/native').getFocusedRouteNameFromRoute(route) ??
            'ProjectsList';
          return {
            tabBarStyle: routeName === 'ProjectDetails' ? hiddenTabBarStyle : tabBarStyle,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={FolderKanban} label="Projects" focused={focused} color={color} />
            ),
          };
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={({ route }) => {
          const routeName =
            require('@react-navigation/native').getFocusedRouteNameFromRoute(route) ??
            'ChatList';
          return {
            tabBarStyle: routeName === 'ChatWindow' ? hiddenTabBarStyle : tabBarStyle,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={MessageSquare} label="Chat" focused={focused} color={color} />
            ),
          };
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MoreNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Menu} label="More" focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ────────────────────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
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
