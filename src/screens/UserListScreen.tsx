import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth, StoredUser } from '../context/AuthContext';
import { faceStorage } from '../services/faceStorage';

export default function UserListScreen({ navigation }: any) {
  const { storedUsers, removeAccount, switchUser, isLoading, refreshUsers } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const handleRemove = (user: StoredUser) => {
    Alert.alert(
      'Remove Account',
      `Remove ${user.name} from this device? Their face data will also be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await faceStorage.deleteFaceByUserId(user.userId);
            await removeAccount(user.userId);
          },
        },
      ]
    );
  };

  const handleLogin = async (user: StoredUser) => {
    await switchUser(user.userId);
  };

  const renderUser = ({ item }: { item: StoredUser }) => (
    <TouchableOpacity style={styles.userCard} onPress={() => handleLogin(item)} onLongPress={() => handleRemove(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userDesignation}>{item.designation} — {item.department}</Text>
        <Text style={styles.userStatus}>
          {item.faceRegistered ? 'Face registered' : 'Face not registered'}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NHAI Attendance</Text>
        <Text style={styles.subtitle}>Select an account to continue</Text>
      </View>

      {storedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👤</Text>
          <Text style={styles.emptyTitle}>No accounts yet</Text>
          <Text style={styles.emptySubtitle}>Add your account to get started</Text>
        </View>
      ) : (
        <FlatList
          data={storedUsers}
          keyExtractor={(item) => item.userId}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await refreshUsers();
            setRefreshing(false);
          }}
        />
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.addButtonText}>+ Add Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 16, color: '#aaa', marginTop: 8 },
  list: { paddingBottom: 20 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e',
    padding: 16, borderRadius: 12, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a73e8',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { color: '#fff', fontSize: 18, fontWeight: '600' },
  userDesignation: { color: '#aaa', fontSize: 13, marginTop: 2 },
  userStatus: { color: '#888', fontSize: 12, marginTop: 2 },
  chevron: { color: '#555', fontSize: 28 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  emptySubtitle: { color: '#888', fontSize: 15, marginTop: 8 },
  addButton: {
    backgroundColor: '#1a73e8', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 10,
  },
  addButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
