import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { esAdmin } from '../config';
import { crearPerfil, obtenerCuenta } from '../data/usuarios';

// Sesión única de la app: la comparten la tienda (cuentas de cliente en
// /cuenta) y el panel /admin. Se monta UNA vez en App.tsx.

interface AuthContextValue {
  usuario: User | null;
  cargando: boolean;
  /* true cuando Firebase Auth rechazó la sesión porque la cuenta está
     desactivada desde el panel; sirve para mostrar el aviso en /cuenta. */
  cuentaDesactivada: boolean;
  entrar: (correo: string, clave: string) => Promise<void>;
  registrarse: (correo: string, clave: string) => Promise<void>;
  restablecerClave: (correo: string) => Promise<void>;
  salir: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  // Sin Firebase no hay nada que esperar; con Firebase esperamos la primera
  // respuesta de onAuthStateChanged antes de decidir login vs panel.
  const [cargando, setCargando] = useState(Boolean(auth));
  const [cuentaDesactivada, setCuentaDesactivada] = useState(false);

  useEffect(() => {
    // Copia local: el narrowing de `auth` (nullable) no atraviesa closures.
    const instancia = auth;
    if (!instancia) return;
    return onAuthStateChanged(instancia, (u) => {
      setUsuario(u);
      setCargando(false);
      if (!u) return;
      // El administrador no tiene documento en usuarios/ (no es un cliente).
      if (esAdmin(u.uid)) return;
      // Auto-sanación: si el registro no llegó a crear el documento, aquí se
      // crea; y si el panel marcó la cuenta como inactiva, se cierra sesión.
      (async () => {
        try {
          const cuenta = await obtenerCuenta(u.uid);
          if (!cuenta) {
            await crearPerfil(u.uid, u.email ?? '');
          } else if (cuenta.activo === false) {
            setCuentaDesactivada(true);
            await signOut(instancia);
          }
        } catch (e) {
          console.error('No se pudo verificar el estado de la cuenta', e);
        }
      })();
    });
  }, []);

  async function entrar(correo: string, clave: string) {
    if (!auth) throw new Error('Firebase no está configurado.');
    setCuentaDesactivada(false);
    await signInWithEmailAndPassword(auth, correo, clave);
  }

  async function registrarse(correo: string, clave: string) {
    if (!auth) throw new Error('Firebase no está configurado.');
    setCuentaDesactivada(false);
    const cred = await createUserWithEmailAndPassword(auth, correo, clave);
    await crearPerfil(cred.user.uid, cred.user.email ?? correo);
  }

  async function restablecerClave(correo: string) {
    if (!auth) throw new Error('Firebase no está configurado.');
    await sendPasswordResetEmail(auth, correo);
  }

  async function salir() {
    if (!auth) return;
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ usuario, cargando, cuentaDesactivada, entrar, registrarse, restablecerClave, salir }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return contexto;
}
