import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { attendanceService, AttendanceRecord } from '../attendance/attendanceService';
import { faceStorage, RegisteredFace } from '../services/faceStorage';
import { syncQueueService } from '../sync/syncQueueService';
import { securityService } from '../security/securityService';
import { useAuth } from '../context/AuthContext';

type AttendancePhase = 'loading' | 'verification' | 'complete';

export default function AttendanceScreen({ navigation }: any) {
  const { activeUser } = useAuth();
  const [phase, setPhase] = useState<AttendancePhase>('loading');
  const [selectedFace, setSelectedFace] = useState<RegisteredFace | null>(null);
  const [stats, setStats] = useState({ total: 0, synced: 0, pending: 0 });
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    securityService.preventScreenshot();
    return () => { securityService.allowScreenshot(); };
  }, []);

  useEffect(() => {
    (async () => {
      if (!activeUser) {
        Alert.alert('Error', 'No active user');
        navigation.goBack();
        return;
      }
      const face = await faceStorage.getFaceByUserId(activeUser.userId);
      if (!face) {
        Alert.alert('Face Not Registered', 'Please register your face first.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      setSelectedFace(face);
      const s = await attendanceService.getStats();
      setStats(s);
      setPhase('verification');
    })();
  }, [activeUser]);

  const handleLivenessComplete = async (passed: boolean, livenessConfidence: number) => {
    if (!passed || !selectedFace || !activeUser) {
      Alert.alert('Liveness Failed', 'Please try again.');
      setPhase('verification');
      return;
    }

    setIsRecording(true);
    try {
      const record = await attendanceService.recordAttendance({
        userId: activeUser.userId,
        userName: selectedFace.name,
        confidence: livenessConfidence,
        livenessChallenge: 'blink,smile',
      });

      if (record) {
        setPhase('complete');
        const s = await attendanceService.getStats();
        setStats(s);
      } else {
        Alert.alert('Error', 'Failed to record attendance.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to record attendance.');
    } finally {
      setIsRecording(false);
    }
  };

  const handleSyncNow = async () => {
    const result = await syncQueueService.syncPendingRecords();
    Alert.alert('Sync Complete', `Synced: ${result.synced}\nFailed: ${result.failed}\nTotal: ${result.total}`);
    const s = await attendanceService.getStats();
    setStats(s);
  };

  if (phase === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1a73e8" style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (phase === 'verification') {
    const LivenessChallengeScreen = require('./liveness-challenge').default;
    return (
      <LivenessChallengeScreen
        onBack={() => navigation.goBack()}
        onComplete={handleLivenessComplete}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#4CAF50' }]}>{stats.synced}</Text>
          <Text style={styles.statLabel}>Synced</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#FF9800' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      <View style={styles.successCard}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Attendance Recorded</Text>
        <Text style={styles.successName}>{selectedFace?.name}</Text>
        <Text style={styles.successTime}>{new Date().toLocaleString()}</Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => setPhase('verification')}>
        <Text style={styles.primaryBtnText}>Record Another</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.syncBtn} onPress={handleSyncNow}>
        <Text style={styles.syncBtnText}>Sync Now ({stats.pending} pending)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  header: { alignItems: 'center', marginBottom: 20, paddingTop: 40 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 30 },
  statBox: { alignItems: 'center', backgroundColor: '#1a1a2e', padding: 16, borderRadius: 12, minWidth: 100 },
  statNum: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12, marginTop: 4 },
  successCard: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  successIcon: { fontSize: 64, color: '#4CAF50', marginBottom: 20 },
  successTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  successName: { color: '#aaa', fontSize: 18, marginBottom: 5 },
  successTime: { color: '#666', fontSize: 14 },
  primaryBtn: { backgroundColor: '#1a73e8', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  syncBtn: { backgroundColor: '#6a1b9a', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  syncBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { backgroundColor: '#333', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  secondaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
