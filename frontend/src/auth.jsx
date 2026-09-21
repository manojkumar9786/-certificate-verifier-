import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api('/auth/me', { token })
      .then((d) => setUser(d.user))
      .catch((e) => {
        if (e.status === 401) logout();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function login(newToken, newUser) {
    localStorage.setItem('token', newToken);
    setUser(newUser);
    setToken(newToken);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ token, user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
