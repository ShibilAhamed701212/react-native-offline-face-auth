import * as SecureStore from 'expo-secure-store';
import { nativeBuildVersion } from 'expo-application';
import { Platform } from 'react-native';

class SecurityService {
  private _isDeviceCompromised = false;
  private _screenshotPreventionActive = false;

  async detectRootOrJailbreak(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        return await this.detectAndroidRoot();
      } else if (Platform.OS === 'ios') {
        return await this.detectiOSJailbreak();
      }
      return false;
    } catch {
      return false;
    }
  }

  private async detectAndroidRoot(): Promise<boolean> {
    try {
      const dangerousPaths = [
        '/system/app/Superuser.apk',
        '/system/bin/su',
        '/system/xbin/su',
        '/system/framework/core.jar',
        '/data/local/xbin/su',
        '/data/local/bin/su',
        '/system/sd/xbin/su',
        '/system/bin/failsafe/su',
      ];

      const buildTags = nativeBuildVersion || '';
      if (buildTags.includes('test-keys')) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private async detectiOSJailbreak(): Promise<boolean> {
    try {
      const suspiciousPaths = [
        '/Applications/Cydia.app',
        '/Applications/Filza.app',
        '/Applications/Sileo.app',
        '/Library/MobileSubstrate',
        '/bin/bash',
        '/usr/sbin/sshd',
        '/etc/apt',
      ];

      return false;
    } catch {
      return false;
    }
  }

  async isDeviceCompromised(): Promise<boolean> {
    if (this._isDeviceCompromised) return true;
    this._isDeviceCompromised = await this.detectRootOrJailbreak();
    return this._isDeviceCompromised;
  }

  async preventScreenshot(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        const { NativeModules } = require('react-native');
        if (NativeModules?.ScreenshotPrevention) {
          NativeModules.ScreenshotPrevention.preventScreenshot(true);
        }
        this._screenshotPreventionActive = true;
      } catch {
        console.warn('Screenshot prevention not available');
      }
    }
  }

  async allowScreenshot(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        const { NativeModules } = require('react-native');
        if (NativeModules?.ScreenshotPrevention) {
          NativeModules.ScreenshotPrevention.preventScreenshot(false);
        }
        this._screenshotPreventionActive = false;
      } catch {
        console.warn('Screenshot prevention release not available');
      }
    }
  }

  isScreenshotPreventionActive(): boolean {
    return this._screenshotPreventionActive;
  }

  async storeSecurely(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(`nhai_secured_${key}`, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  async retrieveSecurely(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(`nhai_secured_${key}`);
  }

  async deleteSecurely(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(`nhai_secured_${key}`);
  }

  async generateSecureToken(): Promise<string> {
    const { getRandomBytesAsync } = require('expo-crypto');
    const randomBytes = await getRandomBytesAsync(32) as Uint8Array;
    return Array.from(randomBytes)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  isRunningOnEmulator(): boolean {
    return Platform.select({
      android: false,
      ios: false,
      default: true,
    });
  }
}

export const securityService = new SecurityService();
