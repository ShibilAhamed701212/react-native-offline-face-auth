import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Camera as VisionCamera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { Camera, Face, FaceDetectionOptions } from 'react-native-vision-camera-face-detector';

import { livenessService } from '../liveness/livenessService';
import { LivenessChallenge } from '../liveness/livenessChallengeEngine';

interface LivenessChallengeScreenProps {
  onComplete: (passed: boolean, confidence: number) => void;
  onBack: () => void;
}

export default function LivenessChallengeScreen({ onComplete, onBack }: LivenessChallengeScreenProps) {
  const cameraRef = useRef<VisionCamera>(null);
  const { hasPermission } = useCameraPermission();
  const { width, height } = useWindowDimensions();
  const device = useCameraDevice('front');

  const [challenge, setChallenge] = useState<LivenessChallenge | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('Preparing...');
  const [completed, setCompleted] = useState<number>(0);
  const [totalChallenges, setTotalChallenges] = useState(2);
  const [phase, setPhase] = useState<'ready' | 'challenge' | 'success' | 'failed'>('ready');
  const [failureReason, setFailureReason] = useState<string>('');

  useEffect(() => {
    if (!hasPermission) return;
    livenessService.startSession();
    setTotalChallenges(livenessService.getRequiredChallenges());
    const firstChallenge = livenessService.getNextChallenge();
    setChallenge(firstChallenge);
    setStatus(firstChallenge.instruction);
    setPhase('challenge');
  }, [hasPermission]);

  const bindX = useSharedValue(0);
  const bindY = useSharedValue(0);
  const bindW = useSharedValue(0);
  const bindH = useSharedValue(0);

  const boxStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    borderWidth: 3,
    borderColor: phase === 'failed' ? 'red' : phase === 'success' ? 'green' : '#FFA500',
    width: withTiming(bindW.value, { duration: 100 }),
    height: withTiming(bindH.value, { duration: 100 }),
    left: withTiming(bindX.value, { duration: 100 }),
    top: withTiming(bindY.value, { duration: 100 }),
  }));

  const faceOptions = useRef<FaceDetectionOptions>({
    performanceMode: 'accurate',
    landmarkMode: 'all',
    contourMode: 'none',
    classificationMode: 'all',
    trackingEnabled: false,
    windowWidth: width,
    windowHeight: height,
    autoScale: true,
  }).current;

  const handleFaces = async (faces: Face[]) => {
    if (phase === 'success' || phase === 'failed') return;

    if (faces?.length > 0) {
      const face = faces[0];
      bindX.value = face.bounds.x;
      bindY.value = face.bounds.y;
      bindW.value = face.bounds.width;
      bindH.value = face.bounds.height;

      const result = livenessService.processFrame({
        yawAngle: face.yawAngle,
        pitchAngle: face.pitchAngle,
        leftEyeOpenProbability: face.leftEyeOpenProbability,
        rightEyeOpenProbability: face.rightEyeOpenProbability,
        smilingProbability: (face as any).smilingProbability ?? face.leftEyeOpenProbability,
      });

      setProgress(result.progress);

      if (result.challengeCompleted && !result.sessionComplete) {
        setCompleted(prev => prev + 1);
        const next = livenessService.getNextChallenge();
        setChallenge(next);
        setStatus(next.instruction);
        setProgress(0);
      }

      if (result.sessionComplete && result.result?.passed) {
        setPhase('success');
        setStatus('All challenges completed!');
        onComplete(true, result.result.confidence);
      }
    }
  };

  if (!hasPermission) return <Text>Camera permission required</Text>;
  if (!device) return <Text>Camera not available</Text>;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        faceDetectionCallback={handleFaces}
        faceDetectionOptions={faceOptions}
        photo={false}
      />

      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.overlay}>
        <Text style={styles.title}>Liveness Check</Text>
        <Text style={styles.status}>{status}</Text>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <Text style={styles.counter}>
          Challenge {completed + 1} of {totalChallenges}
        </Text>
      </View>

      {phase === 'success' && (
        <View style={styles.resultOverlay}>
          <Text style={styles.resultText}>✓ All Liveness Checks Passed</Text>
        </View>
      )}

      {phase === 'failed' && (
        <View style={[styles.resultOverlay, { backgroundColor: 'rgba(255,0,0,0.8)' }]}>
          <Text style={styles.resultText}>✗ Liveness Check Failed</Text>
          <Text style={styles.failureText}>{failureReason}</Text>
        </View>
      )}

      <Animated.View style={boxStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 1000,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 15,
    zIndex: 1000,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    color: '#FFA500',
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  counter: {
    color: '#aaa',
    fontSize: 14,
  },
  resultOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,200,0,0.9)',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    zIndex: 1000,
  },
  resultText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  failureText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
  },
});
