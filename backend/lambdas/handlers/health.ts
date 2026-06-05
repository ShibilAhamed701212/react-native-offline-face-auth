import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { ok, serverError } from '../middleware/response';

export const healthCheck = async (_event: APIGatewayProxyEvent, _context: Context) => {
  try {
    return ok({
      status: 'healthy',
      service: 'NHAI Attendance API',
      version: '1.0.0',
      timestamp: Date.now(),
      region: process.env.AWS_REGION || 'unknown',
      tableName: process.env.TABLE_NAME || 'NHAIAttendance',
    });
  } catch (error) {
    return serverError(error);
  }
};
