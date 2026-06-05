export interface AttendanceRecord {
  pk: string;
  sk: string;
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  latitude: number | null;
  longitude: number | null;
  livenessPassed: boolean;
  livenessChallenge: string;
  confidence: number;
  deviceId: string;
  appVersion: string;
  createdAt: number;
  syncedAt: number;
  ttl: number;
}

export interface AttendanceInput {
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  latitude: number | null;
  longitude: number | null;
  livenessPassed: boolean;
  livenessChallenge: string;
  confidence: number;
  deviceId?: string;
  appVersion?: string;
}

export interface BulkSyncInput {
  records: AttendanceInput[];
  deviceId: string;
  appVersion: string;
}

export interface SyncResult {
  synced: number;
  duplicates: number;
  failed: number;
  errors: string[];
  acknowledgementIds: string[];
}

export interface EmployeeRecord {
  pk: string;
  sk: string;
  id: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
  password?: string;
  faceRegistered: boolean;
  registeredAt: number;
  updatedAt: number;
  active: boolean;
}

export interface EmployeeInput {
  id?: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
  password?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    designation: string;
    department: string;
    email: string;
    faceRegistered: boolean;
  };
}

export interface SyncStatusResponse {
  userId: string;
  totalRecords: number;
  syncedRecords: number;
  pendingRecords: number;
  lastSyncTimestamp: number | null;
  recentSyncs: Array<{
    id: string;
    timestamp: number;
    status: string;
    confidence: number;
  }>;
}
