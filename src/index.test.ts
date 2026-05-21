import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SafeStorage, simpleEncrypt, simpleDecrypt } from './index';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SafeStorage Core Logic', () => {
  const secretKey = 'test-key';
  
  it('should encrypt and decrypt a string correctly', () => {
    const original = 'hello world';
    // @ts-ignore - internal function test
    const encrypted = simpleEncrypt(original, secretKey);
    // @ts-ignore - internal function test
    const decrypted = simpleDecrypt(encrypted, secretKey);
    
    expect(encrypted).not.toBe(original);
    expect(decrypted).toBe(original);
  });

  it('should handle complex JSON objects', () => {
    const storage = new SafeStorage({ secretKey, storageType: 'local' });
    const data = { id: 1, name: 'Test', active: true, nested: { key: 'value' } };
    
    storage.setItem('user', data);
    const retrieved = storage.getItem('user');
    
    expect(retrieved).toEqual(data);
  });

  it('should store data in obfuscated format in localStorage', () => {
    const storage = new SafeStorage({ secretKey, storageType: 'local' });
    storage.setItem('secret', 'my-data');
    
    const rawValue = window.localStorage.getItem('secret');
    expect(rawValue).not.toBe(JSON.stringify('my-data'));
    expect(typeof rawValue).toBe('string');
  });

  it('should return null for non-existent keys', () => {
    const storage = new SafeStorage({ secretKey });
    expect(storage.getItem('non-existent')).toBeNull();
  });

  it('should handle removal of items', () => {
    const storage = new SafeStorage({ secretKey });
    storage.setItem('temp', 'value');
    storage.removeItem('temp');
    expect(storage.getItem('temp')).toBeNull();
  });
});
