import { postAttendance, bulkSyncAttendance, getAttendanceByUser } from '../../lambdas/handlers/attendance';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({ userId: 'test-user', role: 'employee' }),
  sign: jest.fn().mockReturnValue('test-token'),
}));

jest.mock('../../lambdas/services/dynamodb', () => ({
  attendanceRepo: {
    putAttendanceRecord: jest.fn(),
    getAttendanceRecord: jest.fn().mockResolvedValue(null),
    queryByUser: jest.fn().mockResolvedValue({ items: [], lastKey: undefined }),
    batchWriteRecords: jest.fn().mockResolvedValue(10),
  },
}));

const mockEvent = (body: any, auth?: any, pathParams?: any, queryParams?: any) => ({
  body: JSON.stringify(body),
  headers: { Authorization: 'Bearer test-token' },
  auth: auth || { userId: 'test-user', role: 'employee' },
  pathParameters: pathParams || {},
  queryStringParameters: queryParams || {},
  isBase64Encoded: false,
});

describe('Attendance Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('postAttendance - success', async () => {
    const event = mockEvent({
      id: 'att_123',
      userId: 'emp_001',
      userName: 'Test User',
      timestamp: Date.now(),
      livenessPassed: true,
      livenessChallenge: 'blink',
      confidence: 95.5,
    });

    const response = await postAttendance(event as any, {} as any);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(201);
    expect(body.message).toBe('Attendance recorded successfully');
    expect(body.id).toBeDefined();
    expect(body.status).toBe('synced');
  });

  test('postAttendance - missing required fields', async () => {
    const event = mockEvent({
      id: 'att_123',
      livenessPassed: true,
    });

    const response = await postAttendance(event as any, {} as any);
    expect(response.statusCode).toBe(400);
  });

  test('bulkSyncAttendance - success', async () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      id: `att_${i}`,
      userId: 'emp_001',
      userName: `User ${i}`,
      timestamp: Date.now(),
      livenessPassed: true,
      livenessChallenge: 'blink',
      confidence: 90 + i,
    }));

    const event = mockEvent({
      records,
      deviceId: 'device_001',
      appVersion: '1.0.0',
    });

    const response = await bulkSyncAttendance(event as any, {} as any);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(201);
    expect(body.synced).toBeGreaterThan(0);
    expect(body.acknowledgementIds).toHaveLength(10);
  });

  test('bulkSyncAttendance - empty records', async () => {
    const event = mockEvent({ records: [] });
    const response = await bulkSyncAttendance(event as any, {} as any);
    expect(response.statusCode).toBe(400);
  });

  test('bulkSyncAttendance - exceeds max records', async () => {
    const records = Array.from({ length: 501 }, (_, i) => ({
      id: `att_${i}`,
      userId: 'emp_001',
      userName: `User ${i}`,
      timestamp: Date.now(),
      livenessPassed: true,
      confidence: 90,
    }));

    const event = mockEvent({ records });
    const response = await bulkSyncAttendance(event as any, {} as any);
    expect(response.statusCode).toBe(400);
  });

  test('getAttendanceByUser - success', async () => {
    const event = mockEvent({}, { userId: 'emp_001', role: 'employee' }, { userId: 'emp_001' });

    const response = await getAttendanceByUser(event as any, {} as any);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.userId).toBe('emp_001');
  });
});
