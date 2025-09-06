import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

class SecureStorage {
  private isWeb: boolean;

  constructor() {
    this.isWeb = Platform.OS === 'web';
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.isWeb) {
      // Use localStorage on web (not truly secure, but functional)
      localStorage.setItem(key, value);
    } else {
      // Use SecureStore on native platforms
      await SecureStore.setItemAsync(key, value);
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (this.isWeb) {
      // Use localStorage on web
      return localStorage.getItem(key);
    } else {
      // Use SecureStore on native platforms
      return await SecureStore.getItemAsync(key);
    }
  }

  async deleteItem(key: string): Promise<void> {
    if (this.isWeb) {
      // Use localStorage on web
      localStorage.removeItem(key);
    } else {
      // Use SecureStore on native platforms
      await SecureStore.deleteItemAsync(key);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (this.isWeb) {
      // localStorage is always available in browsers
      return true;
    } else {
      // Check SecureStore availability on native
      return await SecureStore.isAvailableAsync();
    }
  }
}

export default new SecureStorage();