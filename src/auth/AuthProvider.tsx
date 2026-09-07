import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
  type AuthUser,
} from '../services/api';
import { loadQuestionBank } from '../data/questions';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(currentUser => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    login: async (email, password) => {
      const currentUser = await loginAccount({ email, password });
      await loadQuestionBank(true);
      setUser(currentUser);
    },
    register: async (email, password, displayName) => {
      const currentUser = await registerAccount({ email, password, displayName });
      await loadQuestionBank(true);
      setUser(currentUser);
    },
    logout: async () => {
      await logoutAccount();
      await loadQuestionBank(true);
      setUser(null);
    },
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
