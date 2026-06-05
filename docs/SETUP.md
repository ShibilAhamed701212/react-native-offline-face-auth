# Setup Guide - NHAI Offline Attendance System

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Expo CLI**: `npm install -g @expo/cli`
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Physical device** with camera (face detection unavailable on simulators)

## Installation

### 1. Clone and Install

```bash
git clone <repository-url>
cd reactnative-offline
npm install --legacy-peer-deps
```

### 2. Configure Environment

Edit `src/sync/syncQueueService.ts` to set your API endpoint:

```typescript
syncQueueService.configure({
  apiEndpoint: 'https://your-api.example.com/nhai/attendance',
  apiKey: 'your-api-key',
  retentionDays: 30,
});
```

### 3. Configure App

Edit `app.json` if needed:
- Update `bundleIdentifier` / `package` for your organization
- Update `EAS projectId` for over-the-air updates

### 4. Run on Device

```bash
# Android
npm run android

# iOS (macOS only)
npm run ios
```

## Device Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Android Version | 8.0 (API 26) | 10.0+ |
| RAM | 3GB | 4GB+ |
| Camera | Front-facing, 5MP+ | 8MP+ |
| Storage | 200MB free | 500MB+ |
| GPS | Yes | Yes |

## Building for Production

### Android APK/AAB

```bash
expo build:android
```

### iOS IPA

```bash
expo build:ios
```

### OTA Updates (EAS)

```bash
npm install -g eas-cli
eas update --branch production --message "Release notes"
```

## Configuring Sync API

The sync queue expects an AWS-compatible REST API at the configured endpoint:

### POST /nhai/attendance

**Request Body:**
```json
{
  "userId": "face_1234567890_abc123def",
  "userName": "John Doe",
  "timestamp": 1717401600000,
  "latitude": 28.6139,
  "longitude": 77.2090,
  "livenessPassed": true,
  "livenessChallenge": "blink,smile",
  "confidence": 95.2
}
```

**Response:**
```json
{ "status": "ok", "id": "att_1234567890_xyz" }
```

### API Key

Pass API key in header: `X-API-Key: your-api-key`

## Testing

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Run tests
npm test
```

## Troubleshooting

### Camera Permission Denied
- Android: Check app settings > permissions > camera
- iOS: Settings > [App Name] > Camera

### Model Loading Failure
- Ensure `onnxruntime-react-native` plugin is configured in app.json
- Run `expo prebuild --clean` then rebuild

### GPS Not Working
- Enable location permissions
- Ensure GPS is enabled on device
- Try outdoors for faster GPS lock

### Sync Not Working
- Check network connectivity
- Verify API endpoint configuration
- Check API key is set
