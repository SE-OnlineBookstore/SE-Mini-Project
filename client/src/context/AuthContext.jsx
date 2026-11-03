import { createContext, useContext, useEffect, useState } from 'react';
import api, { setAccessToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore the session from the refresh cookie on first load.
  useEffect(() => {
    api.post('/auth/refresh')
      .then(async ({ data }) => {
        setAccessToken(data.accessToken);
        const me = await api.get('/users/me');
        setUser(me.data.user);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const updateUser = (changes) => {
  setUser((current) => current ? { ...current, ...changes } : current);
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    setAccessToken(null);
    setUser(null);
  };

  return (<AuthContext.Provider value={{ user, ready, login, logout, updateUser }}>{children}</AuthContext.Provider>);
}
export const useAuth = () => useContext(AuthContext);
