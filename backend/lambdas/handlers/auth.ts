import { APIGatewayTokenAuthorizerEvent, Context, APIGatewayAuthorizerResult } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nhai-jwt-secret-change-in-production';

function extractToken(token: string): string | null {
  if (!token) return null;
  const parts = token.split(' ');
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
    const token = extractToken(event.authorizationToken);
    if (!token) {
      throw new Error('No valid token found');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    return {
      principalId: decoded.sub || 'unknown',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn,
          },
        ],
      },
      context: {
        userId: decoded.sub || '',
        scope: (decoded.scope || '').join(','),
        email: decoded.email || '',
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
