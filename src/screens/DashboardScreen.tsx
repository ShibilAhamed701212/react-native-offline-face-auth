import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { faceStorage } from '../services/faceStorage';

export default function DashboardScreen({ navigation }: any) {
  const { activeUser, storedUsers, logout, switchUser } = useAuth();
  const [hasFace, setHasFace] = useState(false);

  useEffect(() => {
    if (activeUser) {
      faceStorage.getFaceByUserId(activeUser.userId).then(face => {
        setHasFace(!!face);
      });
    }
  }, [activeUser]);

  useEffect(() => {
    if (!activeUser) return;
    const unsubscribe = navigation.addListener('focus', () => {
      faceStorage.getFaceByUserId(activeUser.userId).then(face => {
        setHasFace(!!face);
      });
    });
    return unsubscribe;
  }, [navigation, activeUser]);

  if (!activeUser) return null;

  const handleSwitchUser = () => {
    Alert.alert('Switch Account', 'Choose an account', [
      ...storedUsers
        .filter(u => u.userId !== activeUser.userId)
        .map(u => ({
          text: u.name,
          onPress: () => switchUser(u.userId),
        })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'You can log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{activeUser.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{activeUser.name}</Text>
            <Text style={styles.userDesignation}>{activeUser.designation}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={[styles.card, styles.attendanceCard]}
          onPress={() => {
            if (!hasFace) {
              Alert.alert('Face Not Registered', 'Please register your face first.');
              return;
            }
            navigation.navigate('MarkAttendance');
          }}
        >
          <Text style={styles.cardIcon}>📷</Text>
          <Text style={styles.cardTitle}>Mark Attendance</Text>
          <Text style={styles.cardSubtext}>Scan face + liveness check</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.reregisterCard]}
          onPress={() => {
            if (!hasFace) {
              navigation.navigate('FirstTimeRegister');
            } else {
              navigation.navigate('ReRegister');
            }
          }}
        >
          <Text style={styles.cardIcon}>{hasFace ? '👤' : '✨'}</Text>
          <Text style={styles.cardTitle}>{hasFace ? 'Re-register Face' : 'Register Face'}</Text>
          <Text style={styles.cardSubtext}>
            {hasFace ? 'Update with 50% similarity check' : 'First-time enrollment'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.historyCard]}
          onPress={() => navigation.navigate('AttendanceHistory')}
        >
          <Text style={styles.cardIcon}>📊</Text>
          <Text style={styles.cardTitle}>Attendance History</Text>
          <Text style={styles.cardSubtext}>View past records</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={handleSwitchUser}>
          <Text style={styles.footerButtonText}>Switch Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerButton} onPress={handleLogout}>
          <Text style={[styles.footerButtonText, { color: '#ff4444' }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 60, marginBottom: 30,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a73e8',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  userName: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  userDesignation: { color: '#aaa', fontSize: 14, marginTop: 2 },
  cards: { flex: 1, justifyContent: 'center', gap: 16 },
  card: {
    padding: 24, borderRadius: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },
  attendanceCard: { backgroundColor: '#6a1b9a' },
  reregisterCard: { backgroundColor: '#1a73e8' },
  historyCard: { backgroundColor: '#2e7d32' },
  cardIcon: { fontSize: 40, marginBottom: 8 },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  cardSubtext: { color: '#e0e0e0', fontSize: 14 },
  footer: {
    flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 20,
  },
  footerButton: { paddingVertical: 12, paddingHorizontal: 24 },
  footerButtonText: { color: '#1a73e8', fontSize: 16, fontWeight: '600' },
});
