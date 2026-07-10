import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

// Sesión del administrador del panel. Solo envuelve la ruta /admin.

interface AuthContextValue {
  usuario: User | null;
  cargando: boolean;
  entrar: (correo: string, clave: string) => Promise<void>;
  salir: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  // Sin Firebase no hay nada que esperar; con Firebase esperamos la primera
  // respuesta de onAuthStateChanged antes de decidir login vs panel.
  const [cargando, setCargando] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUsuario(u);
      setCargando(false);
    });
  }, []);

  async function entrar(correo: string, clave: string) {
    if (!auth) throw new Error('Firebase no está configurado.');
    await signInWithEmailAndPassword(auth, correo, clave);
  }

  async function salir() {
    if (!auth) return;
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, entrar, salir }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return contexto;
}
