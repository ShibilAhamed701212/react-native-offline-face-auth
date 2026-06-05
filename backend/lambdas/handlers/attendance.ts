import { Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { attendanceRepo } from '../services/dynamodb';
import { AttendanceInput, AttendanceRecord } from '../models/attendance';
import { withAuth, AuthenticatedEvent } from '../middleware/auth';
import { ok, created, badRequest, conflict, serverError, parseBody, decompressBody } from '../middleware/response';

const TTL_DAYS = parseInt(process.env.TTL_DAYS || '365', 10);

function buildAttendanceRecord(input: AttendanceInput): Record<string, any> {
  const id = input.id || `att_${Date.now()}_${uuidv4().slice(0, 8)}`;
  const now = Date.now();

  return {
    pk: `ATTENDANCE#${id}`,
    sk: `METADATA#${id}`,
    gsipk: 'ATTENDANCE',
    gsisk: `${now}`,
    id,
    userId: input.userId,
    userName: input.userName,
    timestamp: input.timestamp,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    livenessPassed: input.livenessPassed,
    livenessChallenge: input.livenessChallenge,
    confidence: input.confidence,
    deviceId: input.deviceId || 'unknown',
    appVersion: input.appVersion || '1.0.0',
    syncStatus: 'synced',
    createdAt: now,
    syncedAt: now,
    ttl: Math.floor(now / 1000) + TTL_DAYS * 86400,
  };
}

export const postAttendance = withAuth(async (event: AuthenticatedEvent, _context: Context) => {
  try {
    const body = parseBody(event);
    if (!body) {
      return badRequest('Invalid request body');
    }

    const input: AttendanceInput = {
      id: body.id,
      userId: body.userId,
      userName: body.userName,
      timestamp: body.timestamp,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      livenessPassed: body.livenessPassed,
      livenessChallenge: body.livenessChallenge,
      confidence: body.confidence,
      deviceId: body.deviceId || event.auth?.deviceId,
      appVersion: body.appVersion,
    };

    if (!input.userId || !input.userName || !input.timestamp) {
      return badRequest('Missing required fields: userId, userName, timestamp');
    }

    const record = buildAttendanceRecord(input);

    try {
      await attendanceRepo.putAttendanceRecord(record);
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        const existing = await attendanceRepo.getAttendanceRecord(record.id);
        return ok({
          message: 'Duplicate record - already synced',
          id: record.id,
          status: 'duplicate',
          existingTimestamp: existing?.timestamp,
        }, 200);
      }
      throw err;
    }

    return created({
      message: 'Attendance recorded successfully',
      id: record.id,
      userId: record.userId,
      timestamp: record.timestamp,
      status: 'synced',
    });
  } catch (error) {
    return serverError(error);
  }
});

export const bulkSyncAttendance = withAuth(async (event: AuthenticatedEvent, _context: Context) => {
  try {
    let rawBody = event.body || '';

    if (event.isBase64Encoded) {
      rawBody = decompressBody(rawBody);
    }

    const body = JSON.parse(rawBody);
    const records: AttendanceInput[] = body.records || [];
    const deviceId = body.deviceId || event.auth?.deviceId || 'unknown';
    const appVersion = body.appVersion || '1.0.0';

    if (!Array.isArray(records) || records.length === 0) {
      return badRequest('Records array is required and must not be empty');
    }

    if (records.length > 500) {
      return badRequest('Maximum 500 records per bulk sync request');
    }

    let synced = 0;
    let duplicates = 0;
    let failed = 0;
    const errors: string[] = [];
    const acknowledgementIds: string[] = [];

    const dbRecords: Record<string, any>[] = [];

    for (const input of records) {
      if (!input.userId || !input.userName || !input.timestamp) {
        failed++;
        errors.push(`Record for user ${input.userId || 'unknown'}: missing required fields`);
        continue;
      }

      const record = buildAttendanceRecord({
        ...input,
        deviceId,
        appVersion,
      });

      dbRecords.push(record);
      acknowledgementIds.push(record.id);
    }

    try {
      const written = await attendanceRepo.batchWriteRecords(dbRecords);
      synced = written;
    } catch (err: any) {
      for (const record of dbRecords) {
        try {
          await attendanceRepo.putAttendanceRecord(record);
          synced++;
        } catch (putErr: any) {
          if (putErr.name === 'ConditionalCheckFailedException') {
            duplicates++;
          } else {
            failed++;
            errors.push(`Failed to sync record ${record.id}: ${putErr.message}`);
          }
        }
      }
    }

    return created({
      message: 'Bulk sync completed',
      synced,
      duplicates,
      failed,
      total: records.length,
      acknowledgementIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return serverError(error);
  }
});

export const getAttendanceByUser = withAuth(async (event: AuthenticatedEvent, _context: Context) => {
  try {
    const userId = event.pathParameters?.userId || event.queryStringParameters?.userId;
    if (!userId) {
      return badRequest('userId path parameter is required');
    }

    const limit = parseInt(event.queryStringParameters?.limit || '50', 10);
    const lastKey = event.queryStringParameters?.lastKey
      ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey))
      : undefined;

    const result = await attendanceRepo.queryByUser(userId, Math.min(limit, 200), lastKey);

    return ok({
      userId,
      records: result.items.map((item: any) => ({
        id: item.id,
        userId: item.userId,
        userName: item.userName,
        timestamp: item.timestamp,
        latitude: item.latitude,
        longitude: item.longitude,
        livenessPassed: item.livenessPassed,
        confidence: item.confidence,
        syncStatus: item.syncStatus,
        createdAt: item.createdAt,
      })),
      lastKey: result.lastKey ? encodeURIComponent(JSON.stringify(result.lastKey)) : null,
      count: result.items.length,
    });
  } catch (error) {
    return serverError(error);
  }
});
