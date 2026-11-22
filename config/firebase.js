import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBvzpAMsOQEY4hDtiGMxHC-4AT_CXpyOMM',
  authDomain: 'cellventory.firebaseapp.com',
  projectId: 'cellventory',
  storageBucket: 'cellventory.firebasestorage.app',
  messagingSenderId: '124675222673',
  appId: '1:124675222673:web:49701e4a66e1589312e330',
};

const app = initializeApp(firebaseConfig);

// Use AsyncStorage for auth persistence (stays logged in across app restarts)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const storage = getStorage(app);

export { app, auth, storage };
