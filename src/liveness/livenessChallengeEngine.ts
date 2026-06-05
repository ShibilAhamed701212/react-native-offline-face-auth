export type LivenessChallengeType = 'blink' | 'smile' | 'turn_left' | 'turn_right';

export interface LivenessChallenge {
  type: LivenessChallengeType;
  instruction: string;
  timeoutMs: number;
  requiredConsecutiveFrames: number;
}

export interface LivenessResult {
  passed: boolean;
  challenge: LivenessChallengeType;
  confidence: number;
  durationMs: number;
  failureReason?: string;
}

const CHALLENGE_POOL: LivenessChallenge[] = [
  {
    type: 'blink',
    instruction: 'Please blink your eyes',
    timeoutMs: 8000,
    requiredConsecutiveFrames: 3,
  },
  {
    type: 'smile',
    instruction: 'Please smile',
    timeoutMs: 8000,
    requiredConsecutiveFrames: 3,
  },
  {
    type: 'turn_left',
    instruction: 'Please turn your head to the left',
    timeoutMs: 10000,
    requiredConsecutiveFrames: 2,
  },
  {
    type: 'turn_right',
    instruction: 'Please turn your head to the right',
    timeoutMs: 10000,
    requiredConsecutiveFrames: 2,
  },
];

class LivenessChallengeEngine {
  private currentChallenge: LivenessChallenge | null = null;
  private consecutiveSuccess = 0;
  private challengeStartTime = 0;
  private usedChallenges: Set<LivenessChallengeType> = new Set();

  selectRandomChallenge(): LivenessChallenge {
    const available = CHALLENGE_POOL.filter(c => !this.usedChallenges.has(c.type));
    const pool = available.length > 0 ? available : CHALLENGE_POOL;
    if (available.length === 0) {
      this.usedChallenges.clear();
    }
    const selected = pool[Math.floor(Math.random() * pool.length)];
    this.currentChallenge = { ...selected };
    this.consecutiveSuccess = 0;
    this.challengeStartTime = Date.now();
    this.usedChallenges.add(selected.type);
    return this.currentChallenge;
  }

  getCurrentChallenge(): LivenessChallenge | null {
    return this.currentChallenge;
  }

  evaluateChallenge(
    challengeType: LivenessChallengeType,
    faceData: {
      yawAngle: number;
      pitchAngle: number;
      leftEyeOpenProbability: number;
      rightEyeOpenProbability: number;
      smilingProbability?: number;
    }
  ): { passed: boolean; complete: boolean } {
    if (!this.currentChallenge) {
      return { passed: false, complete: false };
    }

    if (this.currentChallenge.type !== challengeType) {
      return { passed: false, complete: false };
    }

    const elapsed = Date.now() - this.challengeStartTime;
    if (elapsed > this.currentChallenge.timeoutMs) {
      return { passed: false, complete: true };
    }

    let passed = false;

    switch (challengeType) {
      case 'blink': {
        const eyesClosed =
          faceData.leftEyeOpenProbability < 0.3 &&
          faceData.rightEyeOpenProbability < 0.3;
        passed = eyesClosed;
        break;
      }
      case 'smile': {
        const isSmiling =
          (faceData.smilingProbability ?? 0) > 0.7;
        passed = isSmiling;
        break;
      }
      case 'turn_left': {
        const headLeft = faceData.yawAngle < -20;
        passed = headLeft;
        break;
      }
      case 'turn_right': {
        const headRight = faceData.yawAngle > 20;
        passed = headRight;
        break;
      }
    }

    if (passed) {
      this.consecutiveSuccess++;
    } else {
      this.consecutiveSuccess = Math.max(0, this.consecutiveSuccess - 1);
    }

    const complete =
      this.consecutiveSuccess >= this.currentChallenge.requiredConsecutiveFrames;

    return { passed, complete };
  }

  getChallengeResult(): LivenessResult {
    const elapsed = Date.now() - this.challengeStartTime;
    return {
      passed: this.consecutiveSuccess >= (this.currentChallenge?.requiredConsecutiveFrames ?? 3),
      challenge: this.currentChallenge?.type ?? 'blink',
      confidence: Math.min(100, (this.consecutiveSuccess / (this.currentChallenge?.requiredConsecutiveFrames ?? 3)) * 100),
      durationMs: elapsed,
      failureReason: this.consecutiveSuccess === 0 ? 'Challenge not completed' : undefined,
    };
  }

  reset(): void {
    this.currentChallenge = null;
    this.consecutiveSuccess = 0;
    this.challengeStartTime = 0;
    this.usedChallenges.clear();
  }

  getProgress(): number {
    if (!this.currentChallenge) return 0;
    return this.consecutiveSuccess / this.currentChallenge.requiredConsecutiveFrames;
  }
}

export const livenessChallengeEngine = new LivenessChallengeEngine();
