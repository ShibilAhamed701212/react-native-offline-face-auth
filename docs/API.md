# API Documentation - NHAI Attendance System

## Modules

### 1. FaceRecognitionService (`src/services/faceRecognitionService.ts`)

```typescript
// Load ArcFace ONNX model
faceRecognitionService.loadModel(): Promise<InferenceSession | null>

// Generate 512-dim face embedding from base64 image
faceRecognitionService.generateFaceEmbedding(
  base64: string,
  options?: { normalize?: boolean }
): Promise<number[] | null>

// Compare two face embeddings
faceRecognitionService.compareFaces(
  embedding1: number[],
  embedding2: number[]
): {
  similarity: number;    // 0-1 cosine similarity
  distance: number;      // 1 - similarity
  isMatch: boolean;      // similarity >= 0.6
  confidence: number;    // similarity * 100
}

// Compare raw embeddings (no re-normalization)
faceRecognitionService.compareEmbeddingsRaw(
  embedding1: number[] | Float32Array,
  embedding2: number[]
): { similarity, distance, isMatch, confidence }
```

### 2. LivenessService (`src/liveness/livenessService.ts`)

```typescript
// Start a liveness session
livenessService.startSession(): void

// Get next random challenge
livenessService.getNextChallenge(): LivenessChallenge

// Process a face detection frame
livenessService.processFrame(data: LivenessFrameData): {
  challengeCompleted: boolean;
  sessionComplete: boolean;
  result?: LivenessResult;
  progress: number;       // 0-1
}

// End session and get result
livenessService.endSession(): LivenessResult | null

// Configure required challenge count (1-4)
livenessService.setRequiredChallenges(count: number): void
```

### 3. LivenessChallengeEngine (`src/liveness/livenessChallengeEngine.ts`)

```typescript
// Types
type LivenessChallengeType = 'blink' | 'smile' | 'turn_left' | 'turn_right';

interface LivenessChallenge {
  type: LivenessChallengeType;
  instruction: string;
  timeoutMs: number;
  requiredConsecutiveFrames: number;
}

// Select random challenge
livenessChallengeEngine.selectRandomChallenge(): LivenessChallenge

// Evaluate a frame against current challenge
livenessChallengeEngine.evaluateChallenge(
  type: LivenessChallengeType,
  faceData: {
    yawAngle: number;
    pitchAngle: number;
    leftEyeOpenProbability: number;
    rightEyeOpenProbability: number;
    smilingProbability?: number;
  }
): { passed: boolean; complete: boolean }
```

### 4. AttendanceService (`src/attendance/attendanceService.ts`)

```typescript
// Record attendance with GPS + liveness
attendanceService.recordAttendance(params: {
  userId: string;
  userName: string;
  confidence: number;
  livenessChallenge: string;
}): Promise<AttendanceRecord | null>

// Get attendance history
attendanceService.getHistory(
  userId?: string,
  limit?: number,
  offset?: number
): Promise<AttendanceRecord[]>

// Get attendance statistics
attendanceService.getStats(): Promise<{
  total: number;
  synced: number;
  pending: number;
}>
```

### 5. SyncQueueService (`src/sync/syncQueueService.ts`)

```typescript
// Configure sync settings
syncQueueService.configure(config: {
  apiEndpoint?: string;
  apiKey?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  retentionDays?: number;
  batchSize?: number;
}): void

// Check network connectivity
syncQueueService.checkConnectivity(): Promise<boolean>

// Start automatic connectivity monitoring
syncQueueService.startConnectivityMonitor(
  onOnline: () => void,
  checkIntervalMs?: number
): Promise<void>

// Stop connectivity monitoring
syncQueueService.stopConnectivityMonitor(): void

// Sync all pending records
syncQueueService.syncPendingRecords(): Promise<SyncResult>

// Get sync statistics
syncQueueService.getStats(): Promise<{ total: number; synced: number; pending: number }>

// Force purge old synced records
syncQueueService.forcePurgeOldRecords(retentionDays?: number): Promise<number>
```

### 6. GPSService (`src/gps/gpsService.ts`)

```typescript
// Request location permission
gpsService.requestPermission(): Promise<boolean>

// Get current GPS coordinates
gpsService.getCurrentLocation(): Promise<GPSCoordinates | null>

// Get last known location
gpsService.getLastKnownLocation(): GPSCoordinates | null

// Start watching position
gpsService.watchPosition(
  callback: (coords: GPSCoordinates) => void,
  intervalMs?: number
): Promise<LocationSubscription | null>
```

### 7. SecurityService (`src/security/securityService.ts`)

```typescript
// Detect root/jailbreak
securityService.detectRootOrJailbreak(): Promise<boolean>

// Check if device is compromised
securityService.isDeviceCompromised(): Promise<boolean>

// Prevent screenshots (Android)
securityService.preventScreenshot(): Promise<void>

// Allow screenshots (Android)
securityService.allowScreenshot(): Promise<void>

// Store data securely
securityService.storeSecurely(key: string, value: string): Promise<void>
securityService.retrieveSecurely(key: string): Promise<string | null>
securityService.deleteSecurely(key: string): Promise<void>
```

### 8. PreprocessingPipeline (`src/faceRecognition/preprocessingPipeline.ts`)

```typescript
// Apply full preprocessing pipeline
applyPreprocessing(
  grayPixels: Uint8Array,
  width: number,
  height: number,
  options?: PreprocessingOptions
): Float32Array

// Detect lighting condition
getLightingCondition(grayPixels: Uint8Array): 'low' | 'normal' | 'harsh'

// Estimate image brightness
estimateBrightness(grayPixels: Uint8Array): number

// Check if low light
isLowLight(grayPixels: Uint8Array, threshold?: number): boolean
```

### 9. Database (`src/storage/database.ts`)

```typescript
// Get database instance
getDatabase(): Promise<SQLiteDatabase>

// Insert attendance record
insertAttendanceRecord(record: AttendanceDBRecord): Promise<void>

// Get unsynced records
getUnsyncedRecords(): Promise<any[]>

// Mark record as synced
markRecordSynced(recordId: string): Promise<void>

// Purge old synced records
purgeSyncedRecords(retentionDays: number): Promise<number>

// Get attendance statistics
getAttendanceStats(): Promise<{ total: number; synced: number; pending: number }>

// App settings
setSetting(key: string, value: string): Promise<void>
getSetting(key: string): Promise<string | null>
```
