import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set persistence to local by default
    setPersistence(auth, browserLocalPersistence);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          // Fetch User Metadata
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const uData = userDoc.data();
            
            // Fetch Company Metadata
            const companyDoc = await getDoc(doc(db, 'companies', uData.company_id));
            if (companyDoc.exists()) {
              const cData = companyDoc.data();
              const brandColor = cData.brand_color || '#2dd4bf';
              const monthlyGoal = cData.monthly_goal || 0;
              const combinedData = { ...uData, companyName: cData.name, brandColor, monthlyGoal };
              setUserData(combinedData);
              
              // Inject Brand Color CSS Variables
              const root = document.documentElement;
              root.style.setProperty('--brand-primary', brandColor);
              
              // Convert hex to RGB for opacity utilities
              const hexToRgb = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? 
                  `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
                  '45, 212, 191';
              };
              root.style.setProperty('--brand-primary-rgb', hexToRgb(brandColor));
              
            } else {
              setUserData(uData);
            }
          }
        } catch (error) {
          console.error("Error fetching user/company data:", error);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    userData,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
