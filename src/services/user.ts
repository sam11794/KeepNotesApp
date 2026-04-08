import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@KeepNotes:user';

export interface UserProfile {
  name: string;
  email: string;
  photo?: string;
}

export const getUser = async (): Promise<UserProfile | null> => {
  try {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const saveUser = async (user: UserProfile): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
};

export const clearUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
};
