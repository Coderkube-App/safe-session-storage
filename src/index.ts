import { useState, useEffect, useCallback } from 'react';
import CryptoJS from 'crypto-js';

type StorageType = 'local' | 'session' | 'async';

interface SafeStorageOptions {
  secretKey?: string;
  storageType?: StorageType;
  customStorage?: any; // For AsyncStorage or other custom engines
}

/**
 * Military-grade AES encryption for storage values.
 */
export const simpleEncrypt = (text: string, key: string): string => {
  try {
    return CryptoJS.AES.encrypt(text, key).toString();
  } catch (e) {
    console.error('Encryption failed:', e);
    return text;
  }
};

export const simpleDecrypt = (encoded: string, key: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encoded, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error('Decryption failed:', e);
    return '';
  }
};

/**
 * Synchronous Storage Wrapper (Web)
 */
export class SafeStorage {
  private storage: Storage | null = null;
  private secretKey: string;

  constructor(options: SafeStorageOptions = {}) {
    const { secretKey = 'safe-storage-default-key', storageType = 'local' } = options;
    this.secretKey = secretKey;
    
    if (typeof window !== 'undefined') {
      this.storage = storageType === 'local' ? window.localStorage : window.sessionStorage;
    }
  }

  setItem(key: string, value: any): void {
    if (!this.storage) return;
    const stringValue = JSON.stringify(value);
    const encryptedValue = simpleEncrypt(stringValue, this.secretKey);
    this.storage.setItem(key, encryptedValue);
  }

  getItem<T = any>(key: string): T | null {
    if (!this.storage) return null;
    const encryptedValue = this.storage.getItem(key);
    if (!encryptedValue) return null;

    const decryptedValue = simpleDecrypt(encryptedValue, this.secretKey);
    try {
      return JSON.parse(decryptedValue) as T;
    } catch (e) {
      return null;
    }
  }

  removeItem(key: string): void {
    if (!this.storage) return;
    this.storage.removeItem(key);
  }

  clear(): void {
    if (!this.storage) return;
    this.storage.clear();
  }
}

/**
 * Asynchronous Storage Wrapper (React Native / Custom)
 */
export class AsyncSafeStorage {
  private storage: any;
  private secretKey: string;

  constructor(options: SafeStorageOptions = {}) {
    const { secretKey = 'safe-storage-default-key', customStorage } = options;
    this.secretKey = secretKey;
    this.storage = customStorage;
  }

  async setItem(key: string, value: any): Promise<void> {
    if (!this.storage) return;
    const stringValue = JSON.stringify(value);
    const encryptedValue = simpleEncrypt(stringValue, this.secretKey);
    await this.storage.setItem(key, encryptedValue);
  }

  async getItem<T = any>(key: string): Promise<T | null> {
    if (!this.storage) return null;
    const encryptedValue = await this.storage.getItem(key);
    if (!encryptedValue) return null;

    const decryptedValue = simpleDecrypt(encryptedValue, this.secretKey);
    try {
      return JSON.parse(decryptedValue) as T;
    } catch (e) {
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.storage) return;
    await this.storage.removeItem(key);
  }

  async clear(): Promise<void> {
    if (!this.storage) return;
    await this.storage.clear();
  }
}

// Default instances for Web
export const safeLocal = new SafeStorage({ storageType: 'local' });
export const safeSession = new SafeStorage({ storageType: 'session' });

/**
 * React Hook for Synchronous Storage (Web/Next.js)
 */
export function useSafeStorage<T>(key: string, initialValue: T, options: SafeStorageOptions = {}) {
  const [isMounted, setIsMounted] = useState(false);
  const storage = options.storageType === 'session' ? safeSession : safeLocal;

  const [storedValue, setStoredValue] = useState<T>(() => {
    // During SSR, return initialValue
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = storage.getItem<T>(key);
      return item !== null ? item : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      storage.setItem(key, valueToStore);
    } catch (error) {
      console.error(error);
    }
  }, [key, storage, storedValue]);

  return [isMounted ? storedValue : initialValue, setValue] as const;
}

/**
 * React Hook for Asynchronous Storage (React Native)
 */
export function useAsyncSafeStorage<T>(key: string, initialValue: T, options: SafeStorageOptions) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const storage = new AsyncSafeStorage(options);

  useEffect(() => {
    const loadStoredValue = async () => {
      try {
        const item = await storage.getItem<T>(key);
        if (item !== null) {
          setStoredValue(item);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadStoredValue();
  }, [key]);

  const setValue = useCallback(async (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      await storage.setItem(key, valueToStore);
    } catch (error) {
      console.error(error);
    }
  }, [key, storage, storedValue]);

  return [storedValue, setValue, loading] as const;
}
