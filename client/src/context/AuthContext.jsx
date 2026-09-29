import { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  function saveSession({ token, user }) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    return saveSession(data);
  }

  async function register(form) {
    const { data } = await api.post('/auth/register', form);
    return saveSession(data);
  }

  function updateUser(updated) {
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Where each role lands after logging in
export const homeFor = (user) => (user?.role === 'admin' ? '/admin' : '/complaints');
