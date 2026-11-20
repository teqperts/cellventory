import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
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

export function formatDefaultShopName(email) {
  if (!email || typeof email !== 'string') return 'My Shop';
  const prefix = email.split('@')[0];
  const cleaned = prefix.replace(/[^a-zA-Z0-9]/g, ' ').trim();
  if (!cleaned) return 'My Shop';

  const words = cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  if (words.length === 1) {
    return `${words[0]}'s Shop`;
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

        try {
          const stored = await AsyncStorage.getItem(SHOP_NAME_KEY);
          if (stored && stored.trim()) {
            setShopName(stored.trim());
          } else if (user.displayName && user.displayName.trim()) {
            setShopName(user.displayName.trim());
          } else {
            const derived = formatDefaultShopName(user.email);
            setShopName(derived);
            await AsyncStorage.setItem(SHOP_NAME_KEY, derived);
          }
        } catch (err) {
          console.warn('Failed to load shop name from storage:', err);
          const fallback = user.displayName || formatDefaultShopName(user.email);
          setShopName(fallback);
        }
      } else {
        setUserEmail('');
        setShopName('My Shop');
      }
    });

    return unsubscribe;
  }, []);

  const updateShopName = async (newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) {
      throw new Error('Shop name cannot be empty');
    }

    setShopName(trimmed);
    await AsyncStorage.setItem(SHOP_NAME_KEY, trimmed);

    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName: trimmed });
      } catch (err) {
        console.warn('Failed to sync displayName to Firebase Auth:', err);
      }
    }
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
