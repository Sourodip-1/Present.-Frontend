import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory fallback for environments with missing native modules (Expo Go versions mismatches)
const memoryStorage = {};

const SafeStorage = {
  getItem: async (key) => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value || memoryStorage[key] || null;
    } catch (e) {
      console.warn(`[SafeStorage] AsyncStorage failed for getItem(${key}), using memory fallback.`, e.message);
      return memoryStorage[key] || null;
    }
  },

  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[SafeStorage] AsyncStorage failed for setItem(${key}), using memory fallback.`, e.message);
      memoryStorage[key] = value;
    }
  },

  multiSet: async (keyValuePairs) => {
    try {
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (e) {
      console.warn('[SafeStorage] AsyncStorage failed for multiSet, using memory fallback.', e.message);
      keyValuePairs.forEach(([key, value]) => {
        memoryStorage[key] = value;
      });
    }
  },

  clear: async () => {
    try {
      await AsyncStorage.clear();
      // Also clear memory
      for (const key in memoryStorage) delete memoryStorage[key];
    } catch (e) {
      console.warn('[SafeStorage] AsyncStorage failed for clear, using memory fallback.', e.message);
      for (const key in memoryStorage) delete memoryStorage[key];
    }
  },

  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
      delete memoryStorage[key];
    } catch (e) {
      console.warn(`[SafeStorage] AsyncStorage failed for removeItem(${key}), using memory fallback.`, e.message);
      delete memoryStorage[key];
    }
  }
};

export default SafeStorage;
