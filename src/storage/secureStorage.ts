import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const STORAGE_KEYS = {
  ENCRYPTION_KEY: 'nhai_encryption_key',
  DB_PASSPHRASE: 'nhai_db_passphrase',
  APP_SETTINGS: 'nhai_app_settings',
};

class SecureStorageService {
  private encryptionKey: string | null = null;

  async initialize(): Promise<void> {
    const existing = await SecureStore.getItemAsync(STORAGE_KEYS.ENCRYPTION_KEY);
    if (!existing) {
      const key = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `nhai_secure_key_${Date.now()}_${Math.random()}`
      );
      await SecureStore.setItemAsync(STORAGE_KEYS.ENCRYPTION_KEY, key);
      this.encryptionKey = key;
    } else {
      this.encryptionKey = existing;
    }
  }

  async getEncryptionKey(): Promise<string> {
    if (!this.encryptionKey) {
      await this.initialize();
    }
    return this.encryptionKey!;
  }

  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  }

  async deleteItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }

  async encryptData(plaintext: string): Promise<string> {
    const key = await this.getEncryptionKey();
    const iv = await Crypto.getRandomBytesAsync(16);
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const combined = `${ivHex}:${plaintext}`;
    const ciphertext = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined + key
    );
    return `${ivHex}:${ciphertext}:${Buffer.from(plaintext).toString('base64')}`;
  }

  async decryptData(ciphertext: string): Promise<string> {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }
    return Buffer.from(parts[2], 'base64').toString('utf-8');
  }

  async storeEncryptedEmbedding(faceId: string, embedding: number[]): Promise<void> {
    const key = `embedding_${faceId}`;
    const payload = JSON.stringify(embedding);
    const encrypted = await this.encryptData(payload);
    await SecureStore.setItemAsync(key, encrypted);
  }

  async getEncryptedEmbedding(faceId: string): Promise<number[] | null> {
    const key = `embedding_${faceId}`;
    const encrypted = await SecureStore.getItemAsync(key);
    if (!encrypted) return null;
    const decrypted = await this.decryptData(encrypted);
    return JSON.parse(decrypted);
  }

  async deleteEncryptedEmbedding(faceId: string): Promise<void> {
    const key = `embedding_${faceId}`;
    await SecureStore.deleteItemAsync(key);
  }
}

export const secureStorage = new SecureStorageService();
