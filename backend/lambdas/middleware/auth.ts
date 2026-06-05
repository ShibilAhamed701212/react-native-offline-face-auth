import { APIGatewayProxyEvent, APIGatewayTokenAuthorizerEvent, Context, APIGatewayAuthorizerResult } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nhai-jwt-secret-change-in-production';
const JWT_ISSUER = process.env.JWT_ISSUER || 'nhai-attendance-system';

export interface AuthPayload {
  userId: string;
  role: 'admin' | 'manager' | 'employee';
  deviceId?: string;
}

export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  auth?: AuthPayload;
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    }) as any;
    return {
      userId: decoded.sub,
      role: decoded['cognito:groups']?.includes('admin') ? 'admin'
        : decoded['cognito:groups']?.includes('manager') ? 'manager'
        : 'employee',
      deviceId: decoded.deviceId,
    };
  } catch {
    return null;
  }
}

export function generateToken(payload: {
  userId: string;
  deviceId?: string;
  groups?: string[];
}): string {
  return jwt.sign(
    {
      sub: payload.userId,
      deviceId: payload.deviceId,
      'cognito:groups': payload.groups || ['employee'],
    },
    JWT_SECRET,
    {
      issuer: JWT_ISSUER,
      expiresIn: '24h',
    }
  );
}

export function extractTokenFromHeader(authHeader: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  return null;
}

export const lambdaAuthorizer = async (
  event: APIGatewayTokenAuthorizerEvent,
  _context: Context
): Promise<APIGatewayAuthorizerResult> => {
  try {
    const token = extractTokenFromHeader(event.authorizationToken);
    if (!token) {
      throw new Error('No token provided');
    }

    const payload = verifyToken(token);
    if (!payload) {
      throw new Error('Invalid token');
    }

    const effect = 'Allow';
    const methodArn = event.methodArn;

    return {
      principalId: payload.userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: effect,
            Resource: methodArn,
          },
        ],
      },
      context: {
        userId: payload.userId,
        role: payload.role,
        deviceId: payload.deviceId || '',
      },
    };
  } catch {
    return {
      principalId: 'unauthorized',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: event.methodArn,
          },
        ],
      },
    };
  }
};

export function withAuth<T = any>(handler: (event: AuthenticatedEvent, context: Context) => Promise<T>) {
  return async (event: AuthenticatedEvent, context: Context) => {
    const authHeader = event.headers?.Authorization
      || (event.headers as any)?.authorization
      || (event.headers as any)?.['x-api-key'];

    if (!authHeader) {
      return {
        statusCode: 401,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Unauthorized: No auth header' }),
      };
    }

    const token = extractTokenFromHeader(authHeader as string);
    if (!token) {
      return {
        statusCode: 401,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Unauthorized: Invalid auth format' }),
      };
    }

    const payload = verifyToken(token);
    if (!payload) {
      return {
        statusCode: 401,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
      };
    }

    event.auth = payload;
    return handler(event, context);
  };
}

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
    'Access-Control-Allow-Credentials': 'true',
  };
}
