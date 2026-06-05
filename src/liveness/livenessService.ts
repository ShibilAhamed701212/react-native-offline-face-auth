import { livenessChallengeEngine, LivenessChallenge, LivenessChallengeType, LivenessResult } from './livenessChallengeEngine';

export interface LivenessFrameData {
  yawAngle: number;
  pitchAngle: number;
  leftEyeOpenProbability: number;
  rightEyeOpenProbability: number;
  smilingProbability?: number;
}

class LivenessService {
  private challengesCompleted: LivenessChallengeType[] = [];
  private isRunning = false;
  private requiredChallenges = 2;

  startSession(): void {
    this.isRunning = true;
    this.challengesCompleted = [];
    livenessChallengeEngine.reset();
  }

  getNextChallenge(): LivenessChallenge {
    return livenessChallengeEngine.selectRandomChallenge();
  }

  processFrame(data: LivenessFrameData): {
    challengeCompleted: boolean;
    sessionComplete: boolean;
    result?: LivenessResult;
    progress: number;
  } {
    const challenge = livenessChallengeEngine.getCurrentChallenge();
    if (!challenge) {
      return { challengeCompleted: false, sessionComplete: false, progress: 0 };
    }

    const evaluation = livenessChallengeEngine.evaluateChallenge(challenge.type, data);

    if (evaluation.complete && evaluation.passed) {
      this.challengesCompleted.push(challenge.type);
      const result = livenessChallengeEngine.getChallengeResult();
      const sessionComplete = this.challengesCompleted.length >= this.requiredChallenges;

      if (!sessionComplete) {
        livenessChallengeEngine.selectRandomChallenge();
      }

      return {
        challengeCompleted: true,
        sessionComplete,
        result,
        progress: this.challengesCompleted.length / this.requiredChallenges,
      };
    }

    return {
      challengeCompleted: evaluation.complete && evaluation.passed,
      sessionComplete: false,
      progress: livenessChallengeEngine.getProgress(),
    };
  }

  isSessionActive(): boolean {
    return this.isRunning;
  }

  getCompletedChallenges(): LivenessChallengeType[] {
    return [...this.challengesCompleted];
  }

  endSession(): LivenessResult | null {
    this.isRunning = false;
    if (this.challengesCompleted.length >= this.requiredChallenges) {
      return {
        passed: true,
        challenge: this.challengesCompleted[this.challengesCompleted.length - 1],
        confidence: 100,
        durationMs: 0,
      };
    }
    this.challengesCompleted = [];
    livenessChallengeEngine.reset();
    return null;
  }

  setRequiredChallenges(count: number): void {
    this.requiredChallenges = Math.max(1, Math.min(4, count));
  }

  getRequiredChallenges(): number {
    return this.requiredChallenges;
  }
}

export const livenessService = new LivenessService();
