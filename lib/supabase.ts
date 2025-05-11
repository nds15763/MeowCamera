import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Import SecureStore with a try-catch to handle potential native module errors
let memoryStorage: Record<string, string> = {};

// Create a fallback adapter when SecureStore isn't available
const MemoryStorageAdapter = {
  getItemAsync: async (key: string) => memoryStorage[key] || null,
  setItemAsync: async (key: string, value: string) => {
    memoryStorage[key] = value;
    return value;
  },
  deleteItemAsync: async (key: string) => {
    delete memoryStorage[key];
  }
};

// Import with a dynamic require to prevent initialization errors
let SecureStore: typeof import('expo-secure-store') | typeof MemoryStorageAdapter;
try {
  SecureStore = require('expo-secure-store');
} catch (error) {
  console.warn('expo-secure-store not available, using in-memory storage');
  SecureStore = MemoryStorageAdapter;
}

// Supabase URL and anon key
const supabaseUrl = 'https://iqofeyrgrdcietbsnkzw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxb2ZleXJncmRjaWV0YnNua3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNDg0MjYsImV4cCI6MjA1ODgyNDQyNn0.Bt7BLdTQzrP98Euswd8q3pbfHVhaMmCU3lF0D9TUpqg';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
