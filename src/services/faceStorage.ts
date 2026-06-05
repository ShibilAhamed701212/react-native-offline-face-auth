import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '../storage/secureStorage';

export interface RegisteredFace {
  id: string;
  userId: string;
  name: string;
  embedding: number[];
  photoPath?: string;
  timestamp: number;
}

const STORAGE_KEY = 'registered_faces';

class FaceStorageService {
  async saveRegisteredFace(face: RegisteredFace): Promise<void> {
    try {
      const existingFaces = await this.getRegisteredFaces();
      const updatedFaces = [...existingFaces, face];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFaces));

      try {
        await secureStorage.storeEncryptedEmbedding(face.id, face.embedding);
      } catch {
        console.warn('Secure storage unavailable, embedding stored in plaintext');
      }

      console.log(`Face registered and saved locally: ${face.name}`);
    } catch (error) {
      console.error('Error saving registered face:', error);
      throw new Error('Failed to save face data');
    }
  }

  async getRegisteredFaces(): Promise<RegisteredFace[]> {
    try {
      const facesJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (!facesJson) {
        return [];
      }
      const faces = JSON.parse(facesJson) as RegisteredFace[];
      console.log(`Loaded ${faces.length} registered faces from storage`);
      return faces;
    } catch (error) {
      console.error('Error loading registered faces:', error);
      return [];
    }
  }

  async getFaceByUserId(userId: string): Promise<RegisteredFace | null> {
    try {
      const faces = await this.getRegisteredFaces();
      return faces.find(f => f.userId === userId) || null;
    } catch {
      return null;
    }
  }

  async updateFaceByUserId(userId: string, updates: Partial<RegisteredFace>): Promise<RegisteredFace | null> {
    try {
      const faces = await this.getRegisteredFaces();
      const index = faces.findIndex(f => f.userId === userId);
      if (index === -1) return null;
      faces[index] = { ...faces[index], ...updates };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(faces));
      return faces[index];
    } catch {
      return null;
    }
  }

  async deleteFaceByUserId(userId: string): Promise<void> {
    try {
      const faces = await this.getRegisteredFaces();
      const face = faces.find(f => f.userId === userId);
      const filtered = faces.filter(f => f.userId !== userId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      if (face) {
        try { await secureStorage.deleteEncryptedEmbedding(face.id); } catch {}
      }
    } catch (error) {
      console.error('Error deleting face by userId:', error);
    }
  }

  async getDecryptedEmbedding(faceId: string): Promise<number[] | null> {
    try {
      return await secureStorage.getEncryptedEmbedding(faceId);
    } catch {
      const faces = await this.getRegisteredFaces();
      const face = faces.find(f => f.id === faceId);
      return face?.embedding ?? null;
    }
  }

  async deleteRegisteredFace(faceId: string): Promise<void> {
    try {
      const existingFaces = await this.getRegisteredFaces();
      const updatedFaces = existingFaces.filter((face) => face.id !== faceId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFaces));

      try {
        await secureStorage.deleteEncryptedEmbedding(faceId);
      } catch {
        console.warn('Could not delete secure embedding');
      }

      console.log(`Face deleted: ${faceId}`);
    } catch (error) {
      console.error('Error deleting registered face:', error);
      throw new Error('Failed to delete face data');
    }
  }

  async clearAllFaces(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('All registered faces cleared from storage');
    } catch (error) {
      console.error('Error clearing registered faces:', error);
      throw new Error('Failed to clear face data');
    }
  }

  async updateRegisteredFace(updatedFace: RegisteredFace): Promise<void> {
    try {
      const existingFaces = await this.getRegisteredFaces();
      const faceIndex = existingFaces.findIndex((face) => face.id === updatedFace.id);
      if (faceIndex === -1) {
        throw new Error('Face not found');
      }
      existingFaces[faceIndex] = updatedFace;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existingFaces));
      console.log(`Face updated: ${updatedFace.name}`);
    } catch (error) {
      console.error('Error updating registered face:', error);
      throw new Error('Failed to update face data');
    }
  }

  generateFaceId(): string {
    return `face_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getRegisteredFacesCount(): Promise<number> {
    try {
      const faces = await this.getRegisteredFaces();
      return faces.length;
    } catch (error) {
      console.error('Error getting face count:', error);
      return 0;
    }
  }

  async isFaceNameTaken(name: string): Promise<boolean> {
    try {
      const faces = await this.getRegisteredFaces();
      return faces.some((face) => face.name.toLowerCase() === name.toLowerCase());
    } catch (error) {
      console.error('Error checking face name:', error);
      return false;
    }
  }
}

export const faceStorage = new FaceStorageService();
