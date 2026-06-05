import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { attendanceService, AttendanceRecord } from '../attendance/attendanceService';
import { useAuth } from '../context/AuthContext';

export default function AttendanceHistoryScreen({ navigation }: any) {
  const { activeUser } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    (async () => {
      if (activeUser) {
        const h = await attendanceService.getHistory(activeUser.userId, 50);
        setRecords(h);
      }
    })();
  }, [activeUser]);

  const renderRecord = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.record}>
      <View style={styles.recordLeft}>
        <Text style={styles.recordName}>{item.userName}</Text>
        <Text style={styles.recordTime}>{new Date(item.timestamp).toLocaleString()}</Text>
        {item.latitude && item.longitude && (
          <Text style={styles.recordGps}>
            📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
          </Text>
        )}
      </View>
      <Text style={[styles.syncBadge, item.syncStatus ? styles.synced : styles.pending]}>
        {item.syncStatus ? 'Synced' : 'Pending'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Attendance History</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={records}
        keyExtractor={item => item.id}
        renderItem={renderRecord}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No attendance records yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20, paddingTop: 40,
  },
  backBtn: { color: '#1a73e8', fontSize: 16, fontWeight: 'bold' },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  list: { paddingBottom: 20 },
  record: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e',
    padding: 14, borderRadius: 10, marginBottom: 8,
  },
  recordLeft: { flex: 1 },
  recordName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  recordTime: { color: '#888', fontSize: 12, marginTop: 2 },
  recordGps: { color: '#666', fontSize: 11, marginTop: 2 },
  syncBadge: { fontSize: 11, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  synced: { color: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.2)' },
  pending: { color: '#FF9800', backgroundColor: 'rgba(255,152,0,0.2)' },
  empty: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 16 },
});
