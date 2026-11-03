import { useEffect, useState } from 'react';
import {BellRing, CheckCircle2, ExternalLink, Monitor, Server, Wifi, X, AlertTriangle, Clock3, Image as ImageIcon} from 'lucide-react';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  imageUrl?: string;
  actionUrl?: string;
  sentAt?: number;
};

type AgentState = {
  serverUrl: string;
  deviceId: string;
  connected: boolean;
  notification?: Notification | null;
};

export default function App() {
  // Cada ventana de Electron carga la misma app con una ruta distinta (#/toast, #/detail, #/settings)
  return window.location.hash.includes('/detail') ? <DetailView /> : <AgentApp />;
}

const TYPE_META: Record<string, { label: string; badge: string; bar: string; Icon: typeof BellRing }> = {
  info: { label: 'Informativa', badge: 'bg-sky-100 text-sky-700', bar: 'from-sky-500 via-cyan-400 to-emerald-400', Icon: BellRing },
  reminder: { label: 'Recordatorio', badge: 'bg-amber-100 text-amber-700', bar: 'from-amber-400 to-sky-500', Icon: Clock3 },
  urgent: { label: 'Urgente', badge: 'bg-red-100 text-red-700', bar: 'from-red-500 to-orange-400', Icon: AlertTriangle },
  image: { label: 'Comunicado', badge: 'bg-emerald-100 text-emerald-700', bar: 'from-emerald-400 to-sky-500', Icon: ImageIcon },
};

function DetailView() {
  const [n, setN] = useState<Notification | null>(null);
  const [acked, setAcked] = useState(false);

  useEffect(() => {
    const show = (item: Notification | null) => {
      setN(item);
      setAcked(false);
    };

    window.g3ops.getDetail().then(show);
    window.g3ops.onDetail(show);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.g3ops.closeDetail();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!n) {
    return <div className="grid h-screen place-items-center text-slate-400">Cargando…</div>;
  }

  const meta = TYPE_META[n.type] ?? TYPE_META.info;
  const Icon = meta.Icon;
  const urgent = n.type === 'urgent';
  const date = n.sentAt
    ? new Date(n.sentAt).toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })
    : '';

  return (
    <div className="flex h-screen flex-col bg-white text-slate-800">
      <div className={`h-2 shrink-0 bg-gradient-to-r ${meta.bar}`} />

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="flex items-center gap-3">
          <span className={`grid h-11 w-11 place-items-center rounded-2xl ${meta.badge}`}>
            <Icon size={22} />
          </span>
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-500">G3 Ops</span>
            <p className="text-xs text-slate-400">{date}</p>
          </div>
          <span className={`ml-auto rounded-full px-3 py-1 text-xs font-extrabold uppercase ${meta.badge}`}>
            {meta.label}
          </span>
        </div>

        <h1 className="mt-5 text-2xl font-black leading-tight text-slate-900">{n.title}</h1>

        {n.imageUrl && (
          <img src={n.imageUrl} alt="" className="mt-5 max-h-80 w-full rounded-2xl bg-slate-50 object-contain" />
        )}

        <p className="mt-5 whitespace-pre-wrap break-words text-base leading-7 text-slate-600">{n.message}</p>
      </div>

      <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-8 py-4">
        {n.actionUrl && (
          <button
            onClick={() => window.g3ops.openAction(n.actionUrl!)}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 font-bold text-white transition hover:bg-sky-600"
          >
            <ExternalLink size={16} />
            Abrir enlace
          </button>
        )}

        {urgent && (
          <button
            disabled={acked}
            onClick={() => {
              window.g3ops.ack(n.id);
              setAcked(true);
              setTimeout(() => window.g3ops.closeDetail(), 900);
            }}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 font-bold text-white transition hover:bg-emerald-600 disabled:opacity-70"
          >
            {acked ? 'Lectura confirmada ✓' : 'Confirmar lectura'}
          </button>
        )}

        <button
          onClick={() => window.g3ops.closeDetail()}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-600 transition hover:bg-slate-100"
        >
          Cerrar
        </button>
      </footer>
    </div>
  );
}

function AgentApp() {
  const [state, setState] = useState<AgentState | null>(null);

  const [detail, setDetail] = useState<Notification | null>(null);

  const isToast = window.location.hash.includes('/toast');

    useEffect(() => {

        if (!window.g3ops) {
            console.error('[React] window.g3ops no existe: el preload no cargó');
            return;
        }

        console.log(
            '[React] Renderer iniciado. isToast:',
            isToast
        );

        window.g3ops.getState().then((currentState) => {

            console.log(
                '[React] Estado recibido:',
                currentState
            );

            setState(currentState);

            if (currentState.notification) {
                console.log(
                    '[React] Notificación encontrada en estado:',
                    currentState.notification
                );

                setDetail(currentState.notification);
            }
        });

        window.g3ops.onDetail((notification) => {
            console.log(
                '[React] Detail recibido:',
                notification
            );

            setDetail(notification);
        });

        // El Toast recibe la notificación directamente
        if (isToast) {

            console.log(
                '[React] Registrando listener del Toast'
            );

            window.g3ops.onToast((notification) => {

                console.log(
                    '[React] 🔔 Toast recibido por IPC:',
                    notification
                );

                setDetail(notification);
            });

            return;
        }

        const timer = setInterval(() => {
            window.g3ops
            .getState()
            .then(setState);
        }, 1500);

        return () => {
            clearInterval(timer);
        };

    }, [isToast]);

  if (!window.g3ops) {
    return (
      <div style={{ padding: 12, fontFamily: 'sans-serif', color: '#b91c1c' }}>
        Error: el preload no cargó (window.g3ops no existe).
      </div>
    );
  }

  if (isToast) {
    return <Toast notification={detail} />;
  }

  return (
    <div className="
      min-h-screen
      bg-gradient-to-br
      from-sky-50
      via-white
      to-emerald-50
      p-7
      text-slate-800
    ">
      <header className="mb-7 flex items-center gap-4">

        <div className="
          grid h-14 w-14
          place-items-center
          rounded-2xl
          bg-gradient-to-br
          from-sky-500
          to-emerald-500
          text-white
          shadow-lg
        ">
          <BellRing />
        </div>

        <div>
          <h1 className="text-2xl font-black">
            G3 Ops Notify
          </h1>

          <p className="text-sm text-slate-500">
            Agente de escritorio · PoC
          </p>
        </div>

      </header>

      <div className="grid gap-4 md:grid-cols-2">

        <Info
          icon={<Monitor />}
          label="Device ID"
          value={state?.deviceId || '…'}
        />

        <Info
          icon={<Server />}
          label="Servidor"
          value={state?.serverUrl || '…'}
        />

        <Info
          icon={<Wifi />}
          label="Estado"
          value={
            state?.connected
              ? 'Conectado'
              : 'Reconectando…'
          }
          ok={state?.connected}
        />

        <Info
          icon={<CheckCircle2 />}
          label="Inicio con Windows"
          value="Activado"
          ok
        />

      </div>

      <section className="
        mt-6
        rounded-3xl
        border border-sky-100
        bg-white
        p-6
        shadow-xl
        shadow-sky-100/60
      ">

        <h2 className="font-extrabold">
          Último detalle
        </h2>

        {detail ? (
          <>
            <h3 className="
              mt-4
              text-xl
              font-black
              text-sky-700
            ">
              {detail.title}
            </h3>

            <p className="
              mt-2
              leading-7
              text-slate-600
            ">
              {detail.message}
            </p>

            {detail.imageUrl && (
              <img
                src={detail.imageUrl}
                alt="Contenido de la notificación"
                className="
                  mt-4
                  max-h-52
                  w-full
                  rounded-2xl
                  object-cover
                "
              />
            )}

            <div className="mt-5 flex gap-3">

              {detail.actionUrl && (
                <button
                  onClick={() =>
                    window.g3ops.openAction(
                      detail.actionUrl!
                    )
                  }
                  className="
                    rounded-xl
                    bg-sky-500
                    px-4 py-2
                    font-bold
                    text-white
                    transition
                    hover:bg-sky-600
                  "
                >
                  Abrir enlace
                </button>
              )}

              {detail.type === 'urgent' && (
                <button
                  onClick={() =>
                    window.g3ops.ack(detail.id)
                  }
                  className="
                    rounded-xl
                    bg-emerald-500
                    px-4 py-2
                    font-bold
                    text-white
                    transition
                    hover:bg-emerald-600
                  "
                >
                  Confirmar lectura
                </button>
              )}

            </div>
          </>
        ) : (
          <p className="mt-4 text-slate-400">
            Aún no se han recibido notificaciones.
          </p>
        )}

      </section>
    </div>
  );
}


function Info({
  icon,
  label,
  value,
  ok
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok?: boolean;
}) {

  return (
    <div className="
      rounded-2xl
      border border-white
      bg-white/80
      p-4
      shadow-md
    ">

      <div className="flex items-center gap-3">

        <span
          className={`
            grid
            h-10 w-10
            place-items-center
            rounded-xl
            ${
              ok
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-sky-100 text-sky-600'
            }
          `}
        >
          {icon}
        </span>

        <div className="min-w-0">

          <small className="
            font-bold
            uppercase
            tracking-wider
            text-slate-400
          ">
            {label}
          </small>

          <p className="truncate font-bold">
            {value}
          </p>

        </div>

      </div>
    </div>
  );
}


function Toast({
  notification
}: {
  notification: Notification | null;
}) {

  if (!notification) {
    return null;
  }

  const urgent = notification.type === 'urgent';

  const reminder = notification.type === 'reminder';

  return (
    <div className="toast-wrapper">

      <div
        onClick={() =>
          window.g3ops.openDetail()
        }
        className={`
          toast-enter
          relative
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
          shadow-slate-900/20
          ${urgent ? 'ring-2 ring-red-400' : ''}
        `}
      >

        {/* Barra superior */}

        <div
          className={`
            h-1.5
            ${
              urgent
                ? 'bg-gradient-to-r from-red-500 to-orange-400'
                : reminder
                ? 'bg-gradient-to-r from-amber-400 to-sky-500'
                : 'bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400'
            }
          `}
        />

        {/* Imagen */}

        {notification.imageUrl && (
          <img
            src={notification.imageUrl}
            alt=""
            className="
              h-20
              w-full
              object-cover
            "
          />
        )}

        <div className="p-4">

          <div className="flex gap-3">

            {/* Icono */}

            <span
              className={`
                grid
                h-11 w-11
                shrink-0
                place-items-center
                rounded-2xl

                ${
                  urgent
                    ? 'bg-red-50 text-red-500'
                    : reminder
                    ? 'bg-amber-50 text-amber-500'
                    : 'bg-sky-100 text-sky-600'
                }
              `}
            >

              {urgent ? (
                <AlertTriangle size={21} />
              ) : reminder ? (
                <Clock3 size={21} />
              ) : (
                <BellRing size={21} />
              )}

            </span>

            {/* Contenido */}

            <div className="min-w-0 flex-1">

              <div className="
                flex
                items-start
                justify-between
                gap-2
              ">

                <div className="min-w-0">

                  <span className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.18em]
                    text-sky-500
                  ">
                    G3 OPS
                  </span>

                  <h3 className="
                    truncate
                    text-[15px]
                    font-extrabold
                    text-slate-900
                  ">
                    {notification.title}
                  </h3>

                </div>

                <button
                  type="button"
                  aria-label="Cerrar notificación"
                  onClick={(event) => {
                    event.stopPropagation();
                    window.g3ops.closeToast();
                  }}
                  className="
                    rounded-lg
                    p-1
                    text-slate-400
                    transition
                    hover:bg-slate-100
                    hover:text-slate-700
                  "
                >
                  <X size={18} />
                </button>

              </div>

              <p className="
                mt-1
                line-clamp-2
                text-sm
                leading-5
                text-slate-500
              ">
                {notification.message}
              </p>

              <div className="
                mt-2
                flex
                items-center
                gap-1.5
                text-xs
                font-bold
                text-sky-600
              ">

                Ver detalle

                <ExternalLink size={13} />

                {urgent && (
                  <span className="
                    ml-auto
                    rounded-full
                    bg-red-50
                    px-2 py-1
                    text-[10px]
                    font-extrabold
                    uppercase
                    text-red-600
                  ">
                    Requiere confirmación
                  </span>
                )}

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

