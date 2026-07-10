import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';

export function LoginForm() {
  const { entrar } = useAuth();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function manejar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await entrar(correo, clave);
    } catch {
      setError('Correo o contraseña incorrectos.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="container section admin-login">
      <form className="admin-login__card" onSubmit={manejar}>
        <img src="/logo.svg" alt="Prólogos" width="48" height="48" />
        <h1>Panel de Prólogos</h1>
        <p className="admin-login__sub">Acceso exclusivo del administrador</p>
        <label>
          Correo
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="btn btn--block" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
