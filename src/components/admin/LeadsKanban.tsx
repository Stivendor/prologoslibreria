import { useEffect, useRef, useState } from 'react';
import type { EstadoLead, Lead, MensajeLead } from '../../types';
import {
  actualizarEstadoLead,
  enviarMensaje,
  marcarLeido,
  suscribirseLeads,
  suscribirseMensajes,
} from '../../data/leads';

// Tablero Kanban de leads de WhatsApp. Drag-and-drop nativo HTML5 entre
// columnas, con <select> de estado en cada tarjeta como fallback accesible.
// Clic en una tarjeta abre el drawer de conversación.

const COLUMNAS: { id: EstadoLead; titulo: string }[] = [
  { id: 'nuevo', titulo: 'Nuevos' },
  { id: 'contactado', titulo: 'Contactados' },
  { id: 'negociando', titulo: 'Negociando' },
  { id: 'ganado', titulo: 'Ganados' },
  { id: 'perdido', titulo: 'Perdidos' },
];

function formatearHora(ts?: { toDate(): Date } | null): string {
  if (!ts) return '';
  return ts.toDate().toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LeadsKanban() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [abierto, setAbierto] = useState<Lead | null>(null);
  const [sobreColumna, setSobreColumna] = useState<EstadoLead | null>(null);

  useEffect(() => suscribirseLeads(setLeads), []);

  // Mantener el drawer sincronizado si el lead cambia (p. ej. mensaje nuevo).
  const leadAbierto = abierto ? (leads.find((l) => l.id === abierto.id) ?? abierto) : null;

  async function mover(lead: Lead, estado: EstadoLead) {
    if (lead.estado === estado) return;
    try {
      await actualizarEstadoLead(lead.id, estado);
    } catch (e) {
      console.error('No se pudo cambiar el estado del lead', e);
    }
  }

  function alSoltar(e: React.DragEvent, estado: EstadoLead) {
    e.preventDefault();
    setSobreColumna(null);
    const id = e.dataTransfer.getData('text/plain');
    const lead = leads.find((l) => l.id === id);
    if (lead) void mover(lead, estado);
  }

  function abrirLead(lead: Lead) {
    setAbierto(lead);
    if (lead.no_leidos) void marcarLeido(lead.id);
  }

  if (leads.length === 0) {
    return (
      <div className="admin-vacio">
        <p>
          Aún no hay leads. Cuando lleguen mensajes al número de WhatsApp
          conectado, aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="kanban">
        {COLUMNAS.map((col) => {
          const delEstado = leads.filter((l) => l.estado === col.id);
          return (
            <section
              key={col.id}
              className={`kanban__col${sobreColumna === col.id ? ' is-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setSobreColumna(col.id);
              }}
              onDragLeave={() => setSobreColumna(null)}
              onDrop={(e) => alSoltar(e, col.id)}
            >
              <header className="kanban__col-head">
                <h3>{col.titulo}</h3>
                <span className="kanban__count">{delEstado.length}</span>
              </header>
              <div className="kanban__cards">
                {delEstado.map((lead) => (
                  <article
                    key={lead.id}
                    className="kanban__card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', lead.id)}
                    onClick={() => abrirLead(lead)}
                  >
                    <div className="kanban__card-top">
                      <strong>{lead.nombre ?? lead.telefono}</strong>
                      {lead.no_leidos ? (
                        <span className="kanban__badge">{lead.no_leidos}</span>
                      ) : null}
                    </div>
                    {lead.nombre && <p className="kanban__tel">{lead.telefono}</p>}
                    {lead.ultimo_mensaje_texto && (
                      <p className="kanban__ultimo">{lead.ultimo_mensaje_texto}</p>
                    )}
                    <div className="kanban__card-foot">
                      <span>{formatearHora(lead.ultimo_mensaje_en)}</span>
                      <select
                        value={lead.estado}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => void mover(lead, e.target.value as EstadoLead)}
                        aria-label={`Estado de ${lead.nombre ?? lead.telefono}`}
                      >
                        {COLUMNAS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.titulo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {leadAbierto && (
        <ConversacionDrawer lead={leadAbierto} onCerrar={() => setAbierto(null)} />
      )}
    </>
  );
}

function ConversacionDrawer({ lead, onCerrar }: { lead: Lead; onCerrar: () => void }) {
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
      <div className="drawer__overlay" onClick={onCerrar} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-label="Conversación">
        <header className="drawer__head">
          <div>
            <strong>{lead.nombre ?? lead.telefono}</strong>
            {lead.nombre && <p className="kanban__tel">{lead.telefono}</p>}
          </div>
          <button className="drawer__cerrar" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="drawer__mensajes">
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

        <form className="drawer__responder" onSubmit={enviar}>
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
      </aside>
    </>
  );
}
