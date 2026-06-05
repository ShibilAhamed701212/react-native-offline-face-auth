import { corsHeaders } from './auth';

export function ok(data: any, statusCode: number = 200) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(data),
  };
}

export function created(data: any) {
  return ok(data, 201);
}

export function badRequest(message: string) {
  return {
    statusCode: 400,
    headers: corsHeaders(),
    body: JSON.stringify({ error: message }),
  };
}

export function notFound(message: string = 'Resource not found') {
  return {
    statusCode: 404,
    headers: corsHeaders(),
    body: JSON.stringify({ error: message }),
  };
}

export function conflict(message: string) {
  return {
    statusCode: 409,
    headers: corsHeaders(),
    body: JSON.stringify({ error: message }),
  };
}

export function serverError(error: any) {
  console.error('Internal server error:', error);
  return {
    statusCode: 500,
    headers: corsHeaders(),
    body: JSON.stringify({ error: 'Internal server error' }),
  };
}

export function parseBody(event: any): any | null {
  try {
    if (event.body) {
      const body = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf-8')
        : event.body;
      return JSON.parse(body);
    }
    return null;
  } catch {
    return null;
  }
}

export function decompressBody(base64Body: string): string {
  try {
    const buffer = Buffer.from(base64Body, 'base64');
    return buffer.toString('utf-8');
  } catch {
    return base64Body;
  }
}
