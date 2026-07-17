import { useEffect, useMemo, useRef, useState } from 'react';
import type { EstadoLead, Lead, MensajeLead } from '../../types';
import {
  actualizarEstadoLead,
  enviarMensaje,
  guardarNotas,
  marcarLeido,
  suscribirseLeads,
  suscribirseMensajes,
} from '../../data/leads';

// Bandeja de leads de WhatsApp estilo CRM: lista de conversaciones a la
// izquierda, hilo del chat al centro y detalles del contacto (etapa del
// pipeline + notas) a la derecha. En móvil la lista y el chat se alternan.

const ETAPAS: { id: EstadoLead; titulo: string }[] = [
  { id: 'nuevo', titulo: 'Nuevo' },
  { id: 'contactado', titulo: 'Contactado' },
  { id: 'negociando', titulo: 'Negociando' },
  { id: 'ganado', titulo: 'Ganado' },
  { id: 'perdido', titulo: 'Perdido' },
];

function formatearHora(ts?: { toDate(): Date } | null): string {
  if (!ts) return '';
  const f = ts.toDate();
  const hoy = new Date();
  const esHoy = f.toDateString() === hoy.toDateString();
  return esHoy
    ? f.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    : f.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function inicial(lead: Lead): string {
  return (lead.nombre ?? lead.telefono).charAt(0).toUpperCase();
}

export function LeadsInbox() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'no-leidas'>('todas');

  useEffect(() => suscribirseLeads(setLeads), []);

  const visibles = useMemo(() => {
    let lista = leads;
    if (filtro === 'no-leidas') lista = lista.filter((l) => (l.no_leidos ?? 0) > 0);
    const q = busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter(
        (l) =>
          l.telefono.includes(q) ||
          (l.nombre ?? '').toLowerCase().includes(q) ||
          (l.ultimo_mensaje_texto ?? '').toLowerCase().includes(q)
      );
    }
    return lista;
  }, [leads, filtro, busqueda]);

  const noLeidas = leads.filter((l) => (l.no_leidos ?? 0) > 0).length;
  const lead = leads.find((l) => l.id === seleccionado) ?? null;

  // Hoja de detalles en móvil (en desktop el panel siempre está visible).
  const [verDetalles, setVerDetalles] = useState(false);

  function abrir(l: Lead) {
    setSeleccionado(l.id);
    setVerDetalles(false);
    if (l.no_leidos) void marcarLeido(l.id);
  }

  return (
    <div className={`inbox${lead ? ' inbox--abierto' : ''}`}>
      {/* Lista de conversaciones */}
      <section className="inbox__lista">
        <header className="inbox__lista-head">
          <h2>
            Bandeja <span className="inbox__total">{leads.length}</span>
          </h2>
        </header>
        <div className="inbox__buscar">
          <input
            type="search"
            placeholder="Buscar conversación…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="inbox__filtros">
          <button
            className={filtro === 'todas' ? 'is-active' : ''}
            onClick={() => setFiltro('todas')}
          >
            Todas <span>{leads.length}</span>
          </button>
          <button
            className={filtro === 'no-leidas' ? 'is-active' : ''}
            onClick={() => setFiltro('no-leidas')}
          >
            No leídas <span>{noLeidas}</span>
          </button>
        </div>

        <div className="inbox__items">
          {visibles.length === 0 && (
            <p className="admin-vacio">
              {leads.length === 0
                ? 'Aún no hay leads. Cuando lleguen mensajes al número de WhatsApp conectado, aparecerán aquí.'
                : 'Sin resultados.'}
            </p>
          )}
          {visibles.map((l) => (
            <button
              key={l.id}
              className={`inbox__item${l.id === seleccionado ? ' is-active' : ''}`}
              onClick={() => abrir(l)}
            >
              <span className="inbox__avatar">{inicial(l)}</span>
              <span className="inbox__item-cuerpo">
                <span className="inbox__item-top">
                  <strong>{l.nombre ?? l.telefono}</strong>
                  <time>{formatearHora(l.ultimo_mensaje_en)}</time>
                </span>
                <span className="inbox__item-preview">{l.ultimo_mensaje_texto}</span>
                <span className="inbox__item-meta">
                  <span className={`inbox__punto inbox__punto--${l.estado}`} />
                  {ETAPAS.find((e) => e.id === l.estado)?.titulo}
                  {(l.no_leidos ?? 0) > 0 && (
                    <span className="inbox__badge">{l.no_leidos}</span>
                  )}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Chat */}
      <section className="inbox__chat">
        {lead ? (
          <Conversacion
            lead={lead}
            onVolver={() => setSeleccionado(null)}
            onDetalles={() => setVerDetalles(true)}
          />
        ) : (
          <div className="inbox__vacio">
            <p>Selecciona una conversación para verla aquí.</p>
          </div>
        )}
      </section>

      {/* Detalles */}
      {lead && (
        <Detalles lead={lead} abierto={verDetalles} onCerrar={() => setVerDetalles(false)} />
      )}
    </div>
  );
}

function Conversacion({
  lead,
  onVolver,
  onDetalles,
}: {
  lead: Lead;
  onVolver: () => void;
  onDetalles: () => void;
}) {
  const [mensajes, setMensajes] = useState<MensajeLead[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => suscribirseMensajes(lead.id, setMensajes), [lead.id]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await enviarMensaje(lead.telefono, limpio);
      setTexto('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <header className="inbox__chat-head">
        <button className="inbox__volver" onClick={onVolver} aria-label="Volver a la bandeja">
          ←
        </button>
        <span className="inbox__avatar">{inicial(lead)}</span>
        <div>
          <strong>{lead.nombre ?? lead.telefono}</strong>
          {lead.nombre && <p className="inbox__sub">{lead.telefono}</p>}
        </div>
        <button className="inbox__info" onClick={onDetalles}>
          Detalles
        </button>
      </header>

      <div className="inbox__mensajes">
        {mensajes.map((m) => (
          <div
            key={m.id}
            className={`burbuja burbuja--${m.direccion}${
              m.estado_envio === 'error' ? ' burbuja--error' : ''
            }`}
          >
            <p>{m.texto}</p>
            <span className="burbuja__hora">
              {formatearHora(m.creado_en)}
              {m.estado_envio === 'error' && ' · no enviado'}
            </span>
          </div>
        ))}
        <div ref={finRef} />
      </div>

      <form className="inbox__responder" onSubmit={enviar}>
        {error && <p className="drawer__error">{error}</p>}
        <div className="drawer__input-row">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe una respuesta…"
            maxLength={4096}
          />
          <button className="btn" type="submit" disabled={enviando || !texto.trim()}>
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </>
  );
}

function Detalles({
  lead,
  abierto,
  onCerrar,
}: {
  lead: Lead;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const [notas, setNotas] = useState(lead.notas ?? '');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  // Resetear el borrador al cambiar de lead.
  useEffect(() => {
    setNotas(lead.notas ?? '');
    setGuardado(false);
  }, [lead.id, lead.notas]);

  async function cambiarEtapa(estado: EstadoLead) {
    if (estado === lead.estado) return;
    try {
      await actualizarEstadoLead(lead.id, estado);
    } catch (e) {
      console.error('No se pudo cambiar la etapa', e);
    }
  }

  async function guardar() {
    setGuardando(true);
    setGuardado(false);
    try {
      await guardarNotas(lead.id, notas.trim());
      setGuardado(true);
    } catch (e) {
      console.error('No se pudieron guardar las notas', e);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      {abierto && (
        <div className="inbox__detalles-overlay" onClick={onCerrar} aria-hidden="true" />
      )}
      <aside className={`inbox__detalles${abierto ? ' is-open' : ''}`}>
        <div className="inbox__detalles-head">
          <h3 className="inbox__detalles-titulo">Detalles</h3>
          <button className="inbox__detalles-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

      <div className="inbox__contacto">
        <span className="inbox__avatar inbox__avatar--grande">{inicial(lead)}</span>
        <div>
          <strong>{lead.nombre ?? lead.telefono}</strong>
          {lead.nombre && <p className="inbox__sub">{lead.telefono}</p>}
        </div>
      </div>

      <h4 className="inbox__seccion">Etapa del pipeline</h4>
      <div className="inbox__etapas" role="radiogroup" aria-label="Etapa del pipeline">
        {ETAPAS.map((e) => (
          <button
            key={e.id}
            role="radio"
            aria-checked={lead.estado === e.id}
            className={`inbox__etapa${lead.estado === e.id ? ' is-active' : ''}`}
            onClick={() => void cambiarEtapa(e.id)}
          >
            <span className={`inbox__punto inbox__punto--${e.id}`} />
            {e.titulo}
          </button>
        ))}
      </div>

      <h4 className="inbox__seccion">Notas</h4>
      <textarea
        className="inbox__notas"
        placeholder="Notas internas sobre este contacto…"
        value={notas}
        onChange={(e) => {
          setNotas(e.target.value);
          setGuardado(false);
        }}
        rows={5}
      />
        <button
          className="btn btn--sec inbox__guardar"
          onClick={() => void guardar()}
          disabled={guardando || notas.trim() === (lead.notas ?? '')}
        >
          {guardando ? 'Guardando…' : guardado ? 'Guardado ✓' : 'Guardar notas'}
        </button>
      </aside>
    </>
  );
}
