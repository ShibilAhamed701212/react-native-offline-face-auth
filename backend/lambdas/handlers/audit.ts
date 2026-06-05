import { Context } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { withAuth, AuthenticatedEvent } from '../middleware/auth';
import { ok, badRequest, serverError } from '../middleware/response';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const BUCKET_NAME = process.env.AUDIT_BUCKET_NAME || '';

export const getPresignedUploadUrl = withAuth(async (event: AuthenticatedEvent, _context: Context) => {
  try {
    if (!BUCKET_NAME) {
      return serverError(new Error('AUDIT_BUCKET_NAME not configured'));
    }

    const body = JSON.parse(event.body || '{}');
    const contentType = body.contentType || 'image/jpeg';
    const attendanceId = body.attendanceId;

    if (!attendanceId) {
      return badRequest('attendanceId is required');
    }

    const userId = event.auth?.userId || 'unknown';
    const timestamp = Date.now();
    const key = `audit/${userId}/${timestamp}_${attendanceId}.jpg`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return ok({
      presignedUrl,
      key,
      bucket: BUCKET_NAME,
      expiresIn: 300,
    });
  } catch (error) {
    return serverError(error);
  }
});
