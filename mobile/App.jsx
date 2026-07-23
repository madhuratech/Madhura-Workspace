import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { Home, FolderKanban, CheckSquare, Menu, Settings, LogOut, FileText, Users } from 'lucide-react-native';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import MyTasksScreen from './src/screens/MyTasksScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import ProjectDetailsScreen from './src/screens/ProjectDetailsScreen';
import TeamScreen from './src/screens/TeamScreen';
import MoreScreen from './src/screens/MoreScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- Navigators ---

// 1. Projects Stack
const ProjectsStack = createNativeStackNavigator();
function ProjectsNavigator() {
  return (
    <ProjectsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProjectsStack.Screen name="ProjectsList" component={ProjectsScreen} />
      <ProjectsStack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
    </ProjectsStack.Navigator>
  );
}

// 2. Chat Stack
import ChatScreen from './src/screens/ChatScreen';
import ChatWindowScreen from './src/screens/ChatWindowScreen';
import { MessageSquare } from 'lucide-react-native';

const ChatStack = createNativeStackNavigator();
function ChatNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatList" component={ChatScreen} />
      <ChatStack.Screen name="ChatWindow" component={ChatWindowScreen} />
    </ChatStack.Navigator>
  );
}

// 3. More Stack (For things that don't fit in the bottom bar)
import EmailScreen from './src/screens/EmailScreen';
import MeetingsScreen from './src/screens/MeetingsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AttendanceLeaveScreen from './src/screens/AttendanceLeaveScreen';

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

// 4. Main Bottom Tabs
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          position: 'absolute',
          bottom: 24,
          left: 24,
          right: 24,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.05,
          shadowRadius: 15,
          borderRadius: 32,
          height: 64,
          paddingBottom: 0,
          borderWidth: 1,
          borderColor: '#E5E7EB',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Tasks" 
        component={MyTasksScreen}
        options={{
          tabBarIcon: ({ color, size }) => <CheckSquare color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Projects" 
        component={ProjectsNavigator}
        options={({ route }) => {
          // Hide tab bar on ProjectDetails
          const routeName = require('@react-navigation/native').getFocusedRouteNameFromRoute(route) ?? 'ProjectsList';
          return {
            tabBarStyle: {
              display: routeName === 'ProjectDetails' ? 'none' : 'flex',
              backgroundColor: '#ffffff',
              position: 'absolute',
              bottom: 24,
              left: 24,
              right: 24,
              elevation: 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.05,
              shadowRadius: 15,
              borderRadius: 32,
              height: 64,
              paddingBottom: 0,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            },
            tabBarIcon: ({ color, size }) => <FolderKanban color={color} size={size} />
          };
        }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatNavigator}
        options={({ route }) => {
          // Hide tab bar on ChatWindow
          const routeName = require('@react-navigation/native').getFocusedRouteNameFromRoute(route) ?? 'ChatList';
          return {
            tabBarStyle: {
              display: routeName === 'ChatWindow' ? 'none' : 'flex',
              backgroundColor: '#ffffff',
              position: 'absolute',
              bottom: 24,
              left: 24,
              right: 24,
              elevation: 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.05,
              shadowRadius: 15,
              borderRadius: 32,
              height: 64,
              paddingBottom: 0,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            },
            tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />
          };
        }}
      />
      <Tab.Screen 
        name="Menu" 
        component={MoreNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}

// 4. Root App
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
