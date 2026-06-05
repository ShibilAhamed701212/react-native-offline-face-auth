import { attendanceRepo } from '../services/dynamodb';
import { withAuth, AuthenticatedEvent } from '../middleware/auth';
import { ok, badRequest, serverError } from '../middleware/response';

interface SyncStatusResponse {
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

export const getSyncStatus = withAuth(async (event: AuthenticatedEvent, _context: any) => {
  try {
    const userId = event.pathParameters?.userId || event.auth?.userId;
    if (!userId) {
      return badRequest('userId is required');
    }

    const { total, synced } = await attendanceRepo.getSyncStatus(userId);
    const pending = total - synced;

    const recentResult = await attendanceRepo.queryByUser(userId, 10);
    const recentSyncs = recentResult.items
      .filter((item: any) => item.syncStatus === 'synced')
      .slice(0, 5)
      .map((item: any) => ({
        id: item.id,
        timestamp: item.timestamp,
        status: item.syncStatus,
        confidence: item.confidence,
      }));

    const lastSyncTimestamp = recentSyncs.length > 0
      ? Math.max(...recentSyncs.map((s: any) => s.timestamp))
      : null;

    const response: SyncStatusResponse = {
      userId,
      totalRecords: total,
      syncedRecords: synced,
      pendingRecords: pending,
      lastSyncTimestamp,
      recentSyncs,
    };

    return ok(response);
  } catch (error) {
    return serverError(error);
  }
});

export const getSystemStats = withAuth(async (_event: AuthenticatedEvent, _context: any) => {
  try {
    const { total, synced } = await attendanceRepo.getSyncStatus('*');
    return ok({
      system: 'NHAI Attendance System',
      version: '1.0.0',
      totalRecords: total,
      syncedRecords: synced,
      pendingRecords: total - synced,
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  } catch (error) {
    return serverError(error);
  }
});
