# NHAI Hackathon 7.0 - Submission Notes

## Project: Offline Facial Recognition & Liveness Attendance System

### Problem Statement
NHAI requires a reliable, secure, and fully offline biometric attendance system for highway construction workers and operations personnel across remote locations with limited or no internet connectivity.

### Solution Overview
A React Native + Expo mobile application that performs facial recognition, liveness detection, and attendance tracking entirely on-device without requiring internet connectivity for core operations.

### Key Differentiators

#### 1. Fully Offline Operation
- All 3 core functions (face enrollment, recognition, liveness verification) work offline
- No internet dependency for daily attendance operations
- Async sync when connectivity becomes available

#### 2. Advanced Liveness Detection
- Random challenge engine prevents video/photo spoofing
- Multiple challenge types: blink, smile, head turn left, head turn right
- Configurable number of challenges (default: 2)
- No cloud dependency for anti-spoofing

#### 3. Enterprise-Grade Security
- AES encryption for biometric embeddings
- Root/jailbreak detection
- Screenshot prevention on attendance screens
- Secure key storage via platform Keystore/Keychain

#### 4. GPS-Enabled Attendance
- Automatic GPS coordinate capture with each attendance
- Coordinates stored locally and synced later
- Works offline with cached last-known location

#### 5. Intelligent Sync Management
- Automatic sync when network restored
- Configurable API endpoint (AWS-compatible)
- Exponential backoff for retries
- Retention-based data purge

#### 6. Production-Ready Performance
- Recognition <1 second
- Liveness check <1 second
- Works on Android 8+ devices with 3GB RAM

### Technical Architecture

**Frontend:** React Native + Expo 53
**AI Inference:** ONNX Runtime (ArcFace ResNet100 INT8) + TensorFlow.js (RFB detection)
**Storage:** SQLite (attendance) + expo-secure-store (embeddings)
**Camera:** react-native-vision-camera with MLKit face detection
**Liveness:** Challenge-based using native face landmarks
**Sync:** Custom sync queue with connectivity monitoring

### Compliance with NHAI Requirements

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Fully Offline | ✅ | All inference + storage offline |
| React Native | ✅ | Expo 53, Android + iOS |
| Lightweight AI (<20MB) | ✅ | Quantized ArcFace INT8 + RFB detection |
| Face Recognition (>95%) | ✅ | ArcFace 512-dim embeddings |
| Offline Liveness | ✅ | Challenge engine (blink, smile, turn) |
| Local Secure Storage | ✅ | SQLite + expo-secure-store |
| Attendance Workflow | ✅ | GPS + liveness + sync_status |
| Sync & Purge | ✅ | Auto-sync + retention policy |
| GPS Support | ✅ | Offline coordinates + later sync |
| Security | ✅ | AES, root detection, screenshot prevention |
| Performance (<1s) | ✅ | Optimized ArcFace + preprocessing |
| Lighting Robustness | ✅ | Histogram equalization + normalization |

### Use Cases

1. **Highway Construction Workers** - Daily attendance at remote construction sites
2. **Toll Plaza Staff** - Shift-based attendance for operations personnel  
3. **Maintenance Crews** - Field attendance for highway maintenance teams
4. **Remote Site Managers** - Verify worker attendance without internet

### Future Enhancements

1. **Face Mask Detection** - Adapt for PPE compliance
2. **Temperature Screening** - Integrate thermal camera data
3. **Multi-Factor Auth** - Combine face + NFC tag for higher security
4. **Dashboard Analytics** - Local charts for attendance patterns
5. **Voice Prompts** - Multilingual voice guidance for workers

---
**Team:** [Your Team Name]
**Track:** Offline Attendance & Identity Management
