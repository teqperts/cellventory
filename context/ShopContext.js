import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';

import { auth } from '../config/firebase';

const SHOP_NAME_KEY = '@cellventory_shop_name';

export const ShopContext = createContext({
  shopName: 'My Shop',
  userEmail: '',
  updateShopName: async () => {},
  isProfileModalOpen: false,
  setIsProfileModalOpen: () => {},
});

export function normalizeAuthIdentifier(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  return `${trimmed.toLowerCase()}@cellventory.com`;
}

export function formatDefaultShopName(email) {
  if (!email || typeof email !== 'string') return 'My Shop';
  const prefix = email.split('@')[0];
  const cleaned = prefix.replace(/[^a-zA-Z0-9]/g, ' ').trim();
  if (!cleaned) return 'My Shop';

  const words = cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  if (words.length === 1) {
    const single = words[0];
    if (single.toLowerCase().endsWith('s')) {
      return `${single}' Shop`;
    }
    return `${single}'s Shop`;
  }
  return words.join(' ');
}

export function ShopProvider({ children }) {
  const [shopName, setShopName] = useState('My Shop');
  const [userEmail, setUserEmail] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email || '');

        const userCacheKey = `${SHOP_NAME_KEY}_${user.uid}`;

        // 1. Firebase Auth profile displayName is the official store name
        if (user.displayName && user.displayName.trim()) {
          const fbName = user.displayName.trim();
          setShopName(fbName);
          await AsyncStorage.setItem(userCacheKey, fbName).catch(() => {});
          await AsyncStorage.setItem(SHOP_NAME_KEY, fbName).catch(() => {});
          return;
        }

        // 2. Offline fallback: check cached name for this specific account
        try {
          const cached = await AsyncStorage.getItem(userCacheKey);
          if (cached && cached.trim()) {
            setShopName(cached.trim());
            return;
          }
        } catch (e) {
          // Ignore cache read errors
        }

        // 3. Fallback: derived from email or username
        const derived = formatDefaultShopName(user.email);
        setShopName(derived);
        await AsyncStorage.setItem(userCacheKey, derived).catch(() => {});
        await AsyncStorage.setItem(SHOP_NAME_KEY, derived).catch(() => {});
      } else {
        setUserEmail('');
        setShopName('My Shop');
      }
    });

    return unsubscribe;
  }, []);

  // In-app shop name updating is disabled. Changes must occur through Firebase credentials.
  const updateShopName = async () => {
    console.warn('In-app shop name modification is disabled. Manage via Firebase account.');
  };

  return (
    <ShopContext.Provider
      value={{
        shopName,
        userEmail,
        updateShopName,
        isProfileModalOpen,
        setIsProfileModalOpen,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}
