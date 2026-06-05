# NHAI Attendance System - AWS Backend

Serverless backend for the NHAI offline facial recognition attendance system. Built with AWS SAM (Serverless Application Model), Lambda, API Gateway, DynamoDB, and Cognito.

## Architecture

```
Client (React Native)
    |
    | HTTPS (JWT Auth)
    v
API Gateway (REST)
    |
    v
Lambda Authorizer (JWT Validation)
    |
    v
Lambda Functions (Business Logic)
    |
    v
DynamoDB (Single-Table Design)
S3 (Audit Images - Optional)
```

## Prerequisites

- AWS CLI configured (`aws configure`)
- AWS SAM CLI installed (`npm install -g @aws-amplify/cli` or `pip install aws-sam-cli`)
- Node.js 20.x

## Deployment

### 1. Build

```bash
cd backend
npm install
sam build
```

### 2. Deploy (First Time)

```bash
sam deploy --guided
```

You'll be prompted for:
- Stack Name: `nhai-attendance-backend`
- AWS Region: `ap-south-1` (Mumbai - recommended for NHAI)
- Environment: `production`
- JWTSecret: (generate a secure random string)
- Confirm changes before deploy: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Save arguments to samconfig.toml: `Y`

### 3. Deploy (Subsequent)

```bash
sam deploy
```

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /health | None | Health check |
| POST | /attendance | JWT | Single attendance record |
| POST | /attendance/bulk-sync | JWT | Bulk upload (up to 500) |
| POST | /employee/register | JWT | Register employee |
| GET | /employee/{id} | JWT | Get employee details |
| PUT | /employee/{id} | JWT | Update employee |
| DELETE | /employee/{id} | JWT | Deactivate employee |
| GET | /sync-status/{userId} | JWT | Sync status |
| POST | /audit/presigned-upload | JWT | Get presigned S3 URL for audit image upload |

## API Contract

Full OpenAPI 3.0 specification available at `docs/openapi.yaml`.

## Testing

```bash
# Health check
curl https://your-api.execute-api.ap-south-1.amazonaws.com/production/health

# Register employee
curl -X POST https://your-api.execute-api.ap-south-1.amazonaws.com/production/employee/register \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Rahul Sharma","designation":"Highway Engineer","department":"Construction"}'

# Sync attendance
curl -X POST https://your-api.execute-api.ap-south-1.amazonaws.com/production/attendance/bulk-sync \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"records":[{"userId":"emp_123","userName":"Rahul","timestamp":1717401600000,"livenessPassed":true,"confidence":95.2}]}'
```

## DynamoDB

- **Table:** `NHAIAttendance`
- **Billing:** Pay-per-request
- **Encryption:** AWS KMS (SSE)
- **Point-in-time recovery:** Enabled
- **TTL:** 365 days

## Monitoring

- CloudWatch Logs for each Lambda
- X-Ray tracing enabled
- CloudWatch metrics: invocations, errors, duration, throttles
- **NHAIAttendanceDashboard** (auto-deployed): Lambda invocations/errors/duration, DynamoDB capacity/latency, API Gateway 4xx/5xx/latency per environment

## CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) with:

| Stage | Description |
|---|---|
| `quality` | TypeScript check + ESLint |
| `test` | Jest unit tests |
| `build` | SAM build with esbuild |
| `deploy-dev` | Auto-deploy to dev on push to `main` |
| `deploy-prod` | Deploy to production on tag `v*` |

### Pipeline Setup

1. Add GitHub secrets:
   - `AWS_ROLE_ARN`: IAM role ARN for OIDC (recommended) or access keys
   - `JWT_SECRET_DEV`: JWT secret for development
   - `JWT_SECRET_PROD`: JWT secret for production

2. Tag a release to trigger production deploy:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

### Local Deploy (alternative)

```bash
cd backend
npm install
sam build
sam deploy --guided  # first time
sam deploy           # subsequent
```

## Cleanup

```bash
sam delete --stack-name nhai-attendance-backend
```
