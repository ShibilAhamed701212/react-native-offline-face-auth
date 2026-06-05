import { insertAttendanceRecord, getAttendanceHistory, getAttendanceStats } from '../storage/database';
import { gpsService, GPSCoordinates } from '../gps/gpsService';
import { livenessService } from '../liveness/livenessService';
import { secureStorage } from '../storage/secureStorage';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  latitude: number | null;
  longitude: number | null;
  livenessPassed: boolean;
  livenessChallenge: string;
  confidence: number;
  syncStatus: boolean;
}

class AttendanceService {
  async recordAttendance(params: {
    userId: string;
    userName: string;
    confidence: number;
    livenessChallenge: string;
  }): Promise<AttendanceRecord | null> {
    try {
      let coordinates: GPSCoordinates | null = null;

      try {
        coordinates = await gpsService.getCurrentLocation();
      } catch {
        console.warn('GPS unavailable, recording without location');
      }

      const record: AttendanceRecord = {
        id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: params.userId,
        userName: params.userName,
        timestamp: Date.now(),
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        livenessPassed: true,
        livenessChallenge: params.livenessChallenge,
        confidence: params.confidence,
        syncStatus: false,
      };

      await insertAttendanceRecord({
        id: record.id,
        user_id: record.userId,
        user_name: record.userName,
        timestamp: record.timestamp,
        latitude: record.latitude,
        longitude: record.longitude,
        liveness_passed: record.livenessPassed,
        liveness_challenge: record.livenessChallenge,
        confidence: record.confidence,
      });

      console.log(`Attendance recorded for ${record.userName} at ${new Date(record.timestamp).toISOString()}`);
      return record;
    } catch (error) {
      console.error('Error recording attendance:', error);
      return null;
    }
  }

  async getHistory(userId?: string, limit: number = 50, offset: number = 0): Promise<AttendanceRecord[]> {
    const records = await getAttendanceHistory(userId, limit, offset);
    return records.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      timestamp: r.timestamp,
      latitude: r.latitude,
      longitude: r.longitude,
      livenessPassed: !!r.liveness_passed,
      livenessChallenge: r.liveness_challenge,
      confidence: r.confidence,
      syncStatus: !!r.sync_status,
    }));
  }

  async getStats(): Promise<{ total: number; synced: number; pending: number }> {
    return getAttendanceStats();
  }

  generateAttendanceId(): string {
    return `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const attendanceService = new AttendanceService();
