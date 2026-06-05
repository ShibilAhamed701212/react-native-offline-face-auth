import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, Alert } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Camera as VisionCamera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { Camera, Face } from 'react-native-vision-camera-face-detector';
import * as FileSystem from 'expo-file-system';
import { faceRecognitionService } from '../services/faceRecognitionService';
import { faceStorage } from '../services/faceStorage';
import { useAuth } from '../context/AuthContext';

interface Props {
  navigation: any;
}

export default function FirstTimeRegisterScreen({ navigation }: Props) {
  const cameraRef = useRef<VisionCamera>(null);
  const { hasPermission } = useCameraPermission();
  const { width, height } = useWindowDimensions();
  const device = useCameraDevice('front');
  const { activeUser, setFaceRegistered } = useAuth();

  const [capturing, setCapturing] = useState(false);
  const [faceStatus, setFaceStatus] = useState<{ yaw: string; pitch: string } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const aFaceW = useSharedValue(0);
  const aFaceH = useSharedValue(0);
  const aFaceX = useSharedValue(0);
  const aFaceY = useSharedValue(0);

  useEffect(() => {
    (async () => {
      await VisionCamera.requestCameraPermission();
      if (!faceRecognitionService.isModelLoaded()) {
        await faceRecognitionService.loadModel();
      }
    })();
  }, []);

  const faceAnimatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    borderWidth: 2,
    borderColor: isReady ? '#34a853' : '#ea4335',
    borderRadius: 4,
    width: aFaceW.value,
    height: aFaceH.value,
    left: aFaceX.value,
    top: aFaceY.value,
  }));

  const onFaceDetected = (faces: Face[]) => {
    if (faces.length === 0) {
      aFaceW.value = aFaceH.value = aFaceX.value = aFaceY.value = 0;
      setIsReady(false);
      setFaceStatus(null);
      return;
    }
    const face = faces[0];
    const { width: fw, height: fh, x, y } = face.bounds;
    aFaceW.value = withTiming(fw, { duration: 100 });
    aFaceH.value = withTiming(fh, { duration: 100 });
    aFaceX.value = withTiming(x, { duration: 100 });
    aFaceY.value = withTiming(y, { duration: 100 });

    const yaw = face.yawAngle ?? 0;
    const pitch = face.pitchAngle ?? 0;
    const ready = Math.abs(yaw) < 15 && Math.abs(pitch) < 15;
    setIsReady(ready);
    setFaceStatus({ yaw: yaw.toFixed(1), pitch: pitch.toFixed(1) });
  };

  const handleCapture = async () => {
    if (!cameraRef.current || capturing || !isReady) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto();
      const base64 = await FileSystem.readAsStringAsync(photo.path, { encoding: FileSystem.EncodingType.Base64 });

      const embedding = await faceRecognitionService.generateFaceEmbedding(base64);
      if (!embedding || !activeUser) {
        Alert.alert('Error', 'Failed to generate face embedding. Try again.');
        setCapturing(false);
        return;
      }

      const faceId = faceStorage.generateFaceId();
      await faceStorage.saveRegisteredFace({
        id: faceId,
        userId: activeUser.userId,
        name: activeUser.name,
        embedding,
        photoPath: photo.path,
        timestamp: Date.now(),
      });

      await setFaceRegistered(activeUser.userId);

      Alert.alert('Success', 'Face registered successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to register face. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  if (!device || !hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>Camera not available</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        faceDetectionCallback={onFaceDetected}
        faceDetectionOptions={{
          performanceMode: 'fast',
          landmarkMode: 'none',
          classificationMode: 'all',
        }}
      />

      <Animated.View style={faceAnimatedStyle} />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.title}>Register Your Face</Text>
          <Text style={styles.subtitle}>
            Position your face in the center{'\n'}Keep still and look straight ahead
          </Text>
        </View>

        {faceStatus && (
          <View style={styles.statusRow}>
            <Text style={[styles.status, Math.abs(parseFloat(faceStatus.yaw)) < 15 ? styles.good : styles.bad]}>
              Yaw: {faceStatus.yaw}°
            </Text>
            <Text style={[styles.status, Math.abs(parseFloat(faceStatus.pitch)) < 15 ? styles.good : styles.bad]}>
              Pitch: {faceStatus.pitch}°
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.captureBtn, (!isReady || capturing) && styles.captureBtnDisabled]}
          onPress={handleCapture}
          disabled={!isReady || capturing}
        >
          <Text style={styles.captureBtnText}>{capturing ? 'Processing...' : 'Capture'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: {
    flex: 1, justifyContent: 'flex-end', padding: 30, paddingBottom: 50,
  },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#ccc', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  statusRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 30 },
  status: { fontSize: 14, fontWeight: 'bold', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' },
  good: { color: '#34a853', backgroundColor: '#1a3a1a' },
  bad: { color: '#ea4335', backgroundColor: '#3a1a1a' },
  captureBtn: {
    backgroundColor: '#34a853', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16,
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  backBtn: { alignItems: 'center', paddingVertical: 12 },
  backBtnText: { color: '#1a73e8', fontSize: 16 },
  statusText: { color: '#fff', fontSize: 18, textAlign: 'center', marginTop: 100 },
});
