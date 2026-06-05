import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import { getUnsyncedRecords, markRecordSynced, updateSyncAttempt, purgeSyncedRecords, getAttendanceStats } from '../storage/database';

export interface SyncConfig {
  apiEndpoint: string;
  apiKey: string;
  maxRetries: number;
  retryDelayMs: number;
  retentionDays: number;
  batchSize: number;
  useCompression: boolean;
}

export interface SyncResult {
  synced: number;
  failed: number;
  total: number;
  errors: string[];
}

const QUEUE_KEY = 'nhai_sync_queue';

function getDefaultConfig(): SyncConfig {
  const envEndpoint = process.env.EXPO_PUBLIC_API_ENDPOINT || '';
  return {
    apiEndpoint: envEndpoint,
    apiKey: '',
    maxRetries: 5,
    retryDelayMs: 30000,
    retentionDays: 30,
    batchSize: 10,
    useCompression: true,
  };
}

const DEFAULT_CONFIG = getDefaultConfig();

class SyncQueueService {
  private config: SyncConfig = { ...DEFAULT_CONFIG };
  private isSyncing = false;
  private connectivityListener: any = null;
  private lastConnectivityCheck = 0;
  private pendingQueue: any[] = [];
  private queueLoaded = false;

  configure(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  async loadQueueFromStorage(): Promise<void> {
    if (this.queueLoaded) return;
    try {
      const stored = await SecureStore.getItemAsync(QUEUE_KEY);
      if (stored) {
        this.pendingQueue = JSON.parse(stored);
      }
      this.queueLoaded = true;
    } catch {
      this.pendingQueue = [];
      this.queueLoaded = true;
    }
  }

  async saveQueueToStorage(): Promise<void> {
    try {
      await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(this.pendingQueue));
    } catch {
      console.warn('Failed to persist sync queue');
    }
  }

  async enqueueFailedRecord(record: any): Promise<void> {
    await this.loadQueueFromStorage();
    const exists = this.pendingQueue.find((r: any) => r.id === record.id);
    if (!exists) {
      this.pendingQueue.push({
        ...record,
        queuedAt: Date.now(),
        retryCount: 0,
      });
      await this.saveQueueToStorage();
    }
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      const state = await Network.getNetworkStateAsync();
      return state.isConnected ?? false;
    } catch {
      return false;
    }
  }

  async startConnectivityMonitor(
    onOnline: () => void,
    checkIntervalMs: number = 30000
  ): Promise<void> {
    const check = async () => {
      const now = Date.now();
      if (now - this.lastConnectivityCheck < checkIntervalMs) return;
      this.lastConnectivityCheck = now;

      if (this.isSyncing) return;

      const isConnected = await this.checkConnectivity();
      if (isConnected) {
        onOnline();
      }
    };

    this.connectivityListener = setInterval(check, checkIntervalMs);
  }

  stopConnectivityMonitor(): void {
    if (this.connectivityListener) {
      clearInterval(this.connectivityListener);
      this.connectivityListener = null;
    }
  }

  async syncPendingRecords(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { synced: 0, failed: 0, total: 0, errors: ['Sync already in progress'] };
    }

    const isConnected = await this.checkConnectivity();
    if (!isConnected) {
      return { synced: 0, failed: 0, total: 0, errors: ['No network connectivity'] };
    }

    this.isSyncing = true;
    const result: SyncResult = { synced: 0, failed: 0, total: 0, errors: [] };

    try {
      await this.loadQueueFromStorage();

      const dbRecords = await getUnsyncedRecords();
      const allRecords = [...this.pendingQueue, ...dbRecords];

      const uniqueRecords = this.deduplicateRecords(allRecords);
      result.total = uniqueRecords.length;

      if (uniqueRecords.length === 0) {
        return result;
      }

      const batches = [];
      for (let i = 0; i < uniqueRecords.length; i += this.config.batchSize) {
        batches.push(uniqueRecords.slice(i, i + this.config.batchSize));
      }

      for (const batch of batches) {
        const batchResult = await this.syncBatch(batch);
        result.synced += batchResult.synced;
        result.failed += batchResult.failed;
        result.errors.push(...batchResult.errors);
      }

      this.pendingQueue = this.pendingQueue.filter(
        (r: any) => r.retryCount < this.config.maxRetries
      );
      await this.saveQueueToStorage();

      if (result.synced > 0) {
        const purged = await purgeSyncedRecords(this.config.retentionDays);
        console.log(`Purged ${purged} old synced records`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown sync error';
      result.errors.push(msg);
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  private deduplicateRecords(records: any[]): any[] {
    const seen = new Set<string>();
    return records.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }

  private async syncBatch(records: any[]): Promise<{ synced: number; failed: number; errors: string[] }> {
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    if (records.length === 1) {
      return this.syncSingleRecord(records[0]);
    }

    try {
      const payloads = records.map((record) => ({
        id: record.id,
        userId: record.user_id,
        userName: record.user_name,
        timestamp: record.timestamp,
        latitude: record.latitude,
        longitude: record.longitude,
        livenessPassed: !!record.liveness_passed,
        livenessChallenge: record.liveness_challenge || 'blink',
        confidence: record.confidence,
        deviceId: record.device_id || 'unknown',
        appVersion: record.app_version || '1.0.0',
      }));

      const body = {
        records: payloads,
        deviceId: 'device_default',
        appVersion: '1.0.0',
      };

      const bodyStr = JSON.stringify(body);
      const payload = this.config.useCompression
        ? Buffer.from(bodyStr).toString('base64')
        : bodyStr;

      const response = await this.uploadWithRetry('/attendance/bulk-sync', {
        method: 'POST',
        headers: {
          'Content-Type': this.config.useCompression ? 'application/x-base64' : 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify({
          ...body,
          _compressed: this.config.useCompression,
          _encoding: 'base64',
        }),
      });

      if (response.ok) {
        const data = JSON.parse(response.body);
        synced = data.synced || 0;
        failed = data.failed || 0;

        for (const record of records) {
          await markRecordSynced(record.id);
        }
      } else {
        failed = records.length;
        errors.push(`Bulk upload failed with status ${response.status}`);
        for (const record of records) {
          await updateSyncAttempt(record.id, `HTTP ${response.status}`);
          await this.enqueueFailedRecord(record);
        }
      }
    } catch (error) {
      failed = records.length;
      const msg = error instanceof Error ? error.message : 'Bulk upload error';
      errors.push(msg);
      for (const record of records) {
        await updateSyncAttempt(record.id, msg);
        await this.enqueueFailedRecord(record);
      }
    }

    return { synced, failed, errors };
  }

  private async syncSingleRecord(record: any): Promise<{ synced: number; failed: number; errors: string[] }> {
    try {
      const payload = {
        id: record.id,
        userId: record.user_id,
        userName: record.user_name,
        timestamp: record.timestamp,
        latitude: record.latitude,
        longitude: record.longitude,
        livenessPassed: !!record.liveness_passed,
        livenessChallenge: record.liveness_challenge || 'blink',
        confidence: record.confidence,
      };

      const response = await this.uploadWithRetry('/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = JSON.parse(response.body);

      if (response.ok || response.status === 200) {
        if (data.status !== 'duplicate') {
          await markRecordSynced(record.id);
        } else {
          await markRecordSynced(record.id);
        }
        return { synced: 1, failed: 0, errors: [] };
      } else {
        await updateSyncAttempt(record.id, `HTTP ${response.status}`);
        record.retryCount = (record.retryCount || 0) + 1;
        if (record.retryCount < this.config.maxRetries) {
          await this.enqueueFailedRecord(record);
        }
        return { synced: 0, failed: 1, errors: [`HTTP ${response.status}: ${data.error || 'Unknown'}`] };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Upload error';
      await updateSyncAttempt(record.id, msg);
      record.retryCount = (record.retryCount || 0) + 1;
      if (record.retryCount < this.config.maxRetries) {
        await this.enqueueFailedRecord(record);
      }
      return { synced: 0, failed: 1, errors: [msg] };
    }
  }

  private async uploadWithRetry(
    path: string,
    options: RequestInit,
    retryCount: number = 0
  ): Promise<{ ok: boolean; status: number; body: string }> {
    const maxRetries = 3;

    try {
      const url = `${this.config.apiEndpoint}${path}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const body = await response.text();
      return { ok: response.ok, status: response.status, body };
    } catch (error) {
      if (retryCount < maxRetries) {
        const delay = this.getExponentialBackoff(retryCount);
        console.log(`Retry ${retryCount + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.uploadWithRetry(path, options, retryCount + 1);
      }
      throw error;
    }
  }

  private getExponentialBackoff(attempt: number): number {
    const base = this.config.retryDelayMs;
    const maxDelay = 300000;
    const delay = Math.min(base * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.3 * delay;
    return Math.floor(delay + jitter);
  }

  async getStats(): Promise<{ total: number; synced: number; pending: number }> {
    const stats = await getAttendanceStats();
    await this.loadQueueFromStorage();
    return {
      total: stats.total + this.pendingQueue.length,
      synced: stats.synced,
      pending: stats.pending + this.pendingQueue.length,
    };
  }

  async forcePurgeOldRecords(retentionDays?: number): Promise<number> {
    return purgeSyncedRecords(retentionDays ?? this.config.retentionDays);
  }

  isSyncActive(): boolean {
    return this.isSyncing;
  }

  getPendingQueueSize(): number {
    return this.pendingQueue.length;
  }
}

export const syncQueueService = new SyncQueueService();
