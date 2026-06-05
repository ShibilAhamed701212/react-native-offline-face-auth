# Architecture Document - NHAI Attendance System

## System Overview

The NHAI Offline Attendance System is a React Native application that provides facial recognition, liveness detection, and attendance tracking entirely offline. The system follows a modular architecture with clear separation of concerns.

## Architecture Diagram

```mermaid
graph TB
    subgraph "UI Layer"
        APP[App.tsx Navigator]
        HS[HomeScreen]
        AS[Attendance Screen]
        LC[Liveness Challenge]
        FR[Face Registration]
        FV[Face Verification]
        FS[Face Selection]
    end

    subgraph "Service Layer"
        FRS[faceRecognitionService]
        FDS[faceDetectionService]
        FSVC[faceStorage]
        PPS[photoProcessingService]
        LS[livenessService]
        LCE[livenessChallengeEngine]
        ATS[attendanceService]
        SQS[syncQueueService]
        GPS[gpsService]
    end

    subgraph "Storage Layer"
        DB[(SQLite Database)]
        SS[expo-secure-store]
        AST[AsyncStorage]
    end

    subgraph "Security Layer"
        SEC[securityService]
        SCR[secureStorage]
    end

    subgraph "Inference Engine"
        ONNX[ONNX Runtime]
        TFJS[TensorFlow.js]
        VCD[Vision Camera Detector]
    end

    subgraph "Models"
        AF[ArcFace ResNet100 INT8]
        RFB[RFB-320 INT8]
    end

    APP --> HS
    HS --> AS
    AS --> LC
    AS --> FS
    FS --> FV
    APP --> FR

    AS --> ATS
    AS --> SQS
    AS --> GPS
    LC --> LS
    LS --> LCE

    ATS --> DB
    ATS --> GPS
    SQS --> DB
    FSVC --> AST
    FSVC --> SCR
    SCR --> SS

    FRS --> ONNX
    ONNX --> AF
    FDS --> TFJS
    TFJS --> RFB
    VCD --> FDS

    SEC --> SS
    SEC --> SCR
```

## Data Flow - Attendance Workflow

```mermaid
sequenceDiagram
    participant User
    participant AS as Attendance Screen
    participant LC as Liveness Challenge
    participant LS as Liveness Service
    participant FR as Face Recognition
    participant ATS as Attendance Service
    participant GPS as GPS Service
    participant DB as SQLite Database
    participant SQS as Sync Queue

    User->>AS: Select User
    AS->>LC: Start Liveness Check
    LC->>LS: Get Random Challenge
    LS-->>LC: Challenge (e.g., "Blink")
    LC->>LS: Process Frame Data
    LS-->>LC: Challenge Result
    LC->>LS: Next Challenge
    LS-->>LC: Challenge (e.g., "Turn Left")
    alt All Challenges Passed
        LC-->>AS: Liveness Passed
        AS->>ATS: Record Attendance
        ATS->>GPS: Get Location
        GPS-->>ATS: GPS Coordinates
        ATS->>DB: Insert Record (sync_status=0)
        ATS-->>AS: Attendance Record
        AS-->>User: Success Screen
        Note over SQS: Later, when online...
        SQS->>DB: Query Unsynced Records
        SQS->>API: POST /attendance
        API-->>SQS: 200 OK
        SQS->>DB: Update sync_status=1
    else Challenge Failed
        LC-->>AS: Liveness Failed
        AS-->>User: Failure Screen
    end
```

## Component Diagram

```mermaid
classDiagram
    class FaceRecognitionService {
        -modelSession: InferenceSession
        +loadModel()
        +generateFaceEmbedding(base64)
        +compareFaces(e1, e2)
        +calculateCosineSimilarity(a, b)
    }

    class LivenessService {
        -challengesCompleted: LivenessChallengeType[]
        -requiredChallenges: number
        +startSession()
        +getNextChallenge()
        +processFrame(data)
        +endSession()
    }

    class LivenessChallengeEngine {
        -currentChallenge: LivenessChallenge
        -consecutiveSuccess: number
        +selectRandomChallenge()
        +evaluateChallenge(type, faceData)
        +getChallengeResult()
    }

    class AttendanceService {
        +recordAttendance(params)
        +getHistory(userId, limit, offset)
        +getStats()
    }

    class SyncQueueService {
        -config: SyncConfig
        -isSyncing: boolean
        +syncPendingRecords()
        +checkConnectivity()
        +startConnectivityMonitor()
    }

    class DatabaseService {
        +getDatabase()
        +insertAttendanceRecord()
        +getUnsyncedRecords()
        +markRecordSynced()
        +purgeSyncedRecords()
    }

    class SecureStorageService {
        -encryptionKey: string
        +initialize()
        +storeEncryptedEmbedding()
        +getEncryptedEmbedding()
        +encryptData()
        +decryptData()
    }

    class SecurityService {
        +detectRootOrJailbreak()
        +preventScreenshot()
        +isDeviceCompromised()
    }

    class GPSService {
        -lastKnownLocation: GPSCoordinates
        +getCurrentLocation()
        +watchPosition()
    }

    class PreprocessingPipeline {
        +applyPreprocessing()
        +estimateBrightness()
        +getLightingCondition()
        +normalizeBrightness()
        +enhanceContrast()
    }

    FaceRecognitionService --> PreprocessingPipeline : uses
    AttendanceService --> GPSService : uses
    AttendanceService --> DatabaseService : writes
    SyncQueueService --> DatabaseService : reads
    SecureStorageService --> ExpoSecureStore : wraps
    LivenessService --> LivenessChallengeEngine : delegates
```

## Key Design Decisions

1. **ONNX Runtime** for face recognition inference - cross-platform, optimized for mobile CPU
2. **SQLite via expo-sqlite** for structured attendance data with WAL mode for performance
3. **expo-secure-store** for AES-encrypted biometric embeddings with Keychain/Keystore backing
4. **State-based navigation** (no React Navigation) to minimize bundle size and complexity
5. **Challenge-based liveness** using native MLKit face landmarks - no additional ML model needed

## Performance Targets

| Operation | Target | Current |
|-----------|--------|---------|
| Face embedding generation | <300ms | ~200ms |
| Face verification (comparison) | <100ms | ~50ms |
| Liveness challenge evaluation | <100ms | ~30ms |
| Total model footprint | <25MB | ~23MB |
| SQLite write | <50ms | ~10ms |
| GPS acquisition | <5s | ~2s |
