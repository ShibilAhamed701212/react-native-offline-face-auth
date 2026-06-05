import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { secureStorage } from '../storage/secureStorage';
import { syncQueueService } from '../sync/syncQueueService';
import { securityService } from '../security/securityService';
import { getDatabase } from '../storage/database';

import UserListScreen from './UserListScreen';
import LoginScreen from './LoginScreen';
import DashboardScreen from './DashboardScreen';
import FirstTimeRegisterScreen from './FirstTimeRegisterScreen';
import ReRegisterScreen from './ReRegisterScreen';
import AttendanceScreen from './attendance-screen';
import AttendanceHistoryScreen from './AttendanceHistoryScreen';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
      <AuthStack.Screen name="UserList" component={UserListScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  const { activeUser } = useAuth();
  const hasFace = activeUser?.faceRegistered;

  return (
    <AppStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
      <AppStack.Screen name="Dashboard" component={DashboardScreen} />
      {!hasFace && (
        <AppStack.Screen name="FirstTimeRegister" component={FirstTimeRegisterScreen} />
      )}
      <AppStack.Screen name="MarkAttendance" component={AttendanceScreen} />
      <AppStack.Screen name="ReRegister" component={ReRegisterScreen} />
      <AppStack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
    </AppStack.Navigator>
  );
}

function RootNavigator() {
  const { activeUser, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <NavigationContainer>
      {activeUser ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        await secureStorage.initialize();
        await getDatabase();
        await securityService.isDeviceCompromised();

        syncQueueService.startConnectivityMonitor(async () => {
          console.log('Network restored, syncing pending records...');
          const result = await syncQueueService.syncPendingRecords();
          console.log(`Auto-sync: ${result.synced} synced, ${result.failed} failed`);
        }, 60000);
      } catch (error) {
        console.error('Initialization error:', error);
      }
    })();

    return () => {
      syncQueueService.stopConnectivityMonitor();
    };
  }, []);

  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <RootNavigator />
    </AuthProvider>
  );
}
