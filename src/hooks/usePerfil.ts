import { useCallback, useEffect, useState } from 'react';
import type { Perfil } from '../types';
import { guardarPerfil, suscribirsePerfil } from '../data/usuarios';

interface EstadoPerfil {
  perfil: Perfil | null;
  cargando: boolean;
  guardando: boolean;
  error: string | null;
  guardar: (datos: Perfil) => Promise<boolean>;
}

// Suscripción a los datos de envío de una cuenta y helper para guardarlos.
// Es una suscripción (onSnapshot) y no una consulta: si el cliente guarda su
// perfil en /cuenta, el checkout que ya tenía la sesión abierta se actualiza
// solo. Sin uid (invitado o sin Firebase) no consulta nada.
export function usePerfil(uid: string | null | undefined): EstadoPerfil {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(Boolean(uid));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setPerfil(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    return suscribirsePerfil(
      uid,
      (p) => {
        setPerfil(p);
        setCargando(false);
        setError(null);
      },
      (e) => {
        setError(e.message);
        setCargando(false);
      }
    );
  }, [uid]);

  const guardar = useCallback(
    async (datos: Perfil) => {
      if (!uid) return false;
      setGuardando(true);
      setError(null);
      try {
        await guardarPerfil(uid, datos);
        // El estado se actualiza solo vía suscripción; esto solo cierra el
        // indicador de guardado y marca éxito.
        return true;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'No se pudo guardar tu perfil.');
        return false;
      } finally {
        setGuardando(false);
      }
    },
    [uid]
  );

  return { perfil, cargando, guardando, error, guardar };
}
