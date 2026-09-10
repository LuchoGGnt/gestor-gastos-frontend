import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, Outlet } from "react-router-dom";
import { getNotifications } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import AuthImage from "./AuthImage";
import {
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExchangeIcon,
  HomeIcon,
  LogoutIcon,
  UserIcon,
  WalletIcon,
} from "./icons";
import ErrorBoundary from "./ErrorBoundary";

const NAV_ITEMS = [
  { to: "/accounts", label: "Cuentas", Icon: HomeIcon },
  { to: "/wallets", label: "Cartera", Icon: WalletIcon },
  { to: "/payments", label: "Pagos", Icon: ExchangeIcon },
];

const THEME_OPTIONS: { value: "light" | "dark" | "system"; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Automático" },
];

const COLLAPSE_KEY = "gestor_gastos_sidebar_collapsed";

const MENU_WIDTH = 224; // w-56

function ProfileMenu({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8);
    setMenuPos({ top: rect.bottom + 8, left: Math.max(8, left) });
  }

  return (
    <div>
      <button
        ref={buttonRef}
        onClick={() => (menuPos ? setMenuPos(null) : openMenu())}
        className={`neo-raised w-full flex items-center gap-3 hover:opacity-90 transition-transform hover:-translate-y-0.5 ${
          // Padding más chico cuando está colapsado: con el padding normal
          // (p-4) el sidebar angosto (w-20) no alcanza a darle espacio a la
          // foto de perfil (40px) sin recortarla — se veía "distorsionada".
          collapsed ? "p-2 justify-center" : "p-4"
        }`}
      >
        <AuthImage
          mediaId={user?.profile_photo_media_id}
          alt={user?.full_name ?? ""}
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
        {!collapsed && (
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold truncate">{user?.full_name}</p>
            <p className="text-xs text-[var(--text-secondary)] truncate">@{user?.username}</p>
          </div>
        )}
      </button>

      {menuPos && (
        <>
          {/* Backdrop invisible para cerrar el menú al hacer clic afuera */}
          <div className="fixed inset-0 z-40" onClick={() => setMenuPos(null)} />
          {/* `fixed` con posición calculada del botón (no `absolute` dentro del
              aside con scroll): así el menú nunca queda recortado ni provoca
              el scrollbar horizontal del contenedor angosto del sidebar. */}
          <div
            style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
            className="fixed neo-raised p-3 z-50 flex flex-col gap-3"
          >
            <Link
              to="/settings"
              onClick={() => setMenuPos(null)}
              className="neo-btn px-3 py-2 text-sm text-left"
            >
              Ajustes
            </Link>
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-2 px-1">Tema</p>
              <div className="flex flex-col gap-1.5">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`neo-btn px-3 py-1.5 text-xs text-left ${
                      theme === opt.value ? "text-[var(--accent)] font-semibold" : ""
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationsMenu({
  variant,
}: {
  variant: { kind: "sidebar"; collapsed: boolean } | { kind: "mobile" };
}) {
  const [menuPos, setMenuPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Se calculan en vivo a partir de los settlements/balances existentes: no
  // hay estado de "leído" — se refrescan solas cada minuto.
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: 60_000,
  });

  const pendingPayments = notifications?.payments.filter((p) => p.pending_confirmation) ?? [];
  const confirmedPayments = notifications?.payments.filter((p) => !p.pending_confirmation) ?? [];
  const urgentDebts = notifications?.debts.filter((d) => d.due_status === "overdue" || d.due_status === "due_soon") ?? [];
  const badgeCount = pendingPayments.length + urgentDebts.length;

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8);
    if (variant.kind === "mobile") {
      // El nav inferior está pegado al borde de la pantalla: el panel se abre
      // hacia arriba (anclado por `bottom`), no hacia abajo.
      setMenuPos({ bottom: window.innerHeight - rect.top + 8, left: Math.max(8, left) });
    } else {
      setMenuPos({ top: Math.min(rect.bottom + 8, window.innerHeight - 8), left: Math.max(8, left) });
    }
  }

  const badge = badgeCount > 0 && (
    <span className="absolute -top-1.5 -right-1.5 min-w-[1rem] h-4 px-1 rounded-full bg-[var(--danger)] text-white text-[10px] leading-4 text-center">
      {badgeCount}
    </span>
  );

  return (
    <div>
      {variant.kind === "mobile" ? (
        <button
          ref={buttonRef}
          onClick={() => (menuPos ? setMenuPos(null) : openMenu())}
          title="Notificaciones"
          aria-label="Notificaciones"
          className="flex flex-col items-center text-xs px-3 py-1.5 rounded-xl text-[var(--text-secondary)]"
        >
          <span className="relative">
            <BellIcon className="w-5 h-5" />
            {badge}
          </span>
          Avisos
        </button>
      ) : (
        <button
          ref={buttonRef}
          onClick={() => (menuPos ? setMenuPos(null) : openMenu())}
          title="Notificaciones"
          aria-label="Notificaciones"
          className={`neo-btn relative px-4 py-3 text-sm flex items-center gap-3 w-full ${
            variant.collapsed ? "justify-center" : ""
          }`}
        >
          <span className="relative shrink-0">
            <BellIcon className="w-5 h-5" />
            {badge}
          </span>
          {!variant.collapsed && "Notificaciones"}
        </button>
      )}

      {menuPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuPos(null)} />
          <div
            style={{ top: menuPos.top, bottom: menuPos.bottom, left: menuPos.left, width: MENU_WIDTH }}
            className="fixed neo-raised p-3 z-50 flex flex-col gap-3 max-h-[70vh] overflow-y-auto"
          >
            <div>
              <p className="text-xs font-semibold mb-2 px-1">Deudas pendientes</p>
              {(notifications?.debts.length ?? 0) === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] px-1">No debes nada por ahora.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {notifications?.debts.map((d) => (
                    <Link
                      key={`${d.account_id}-${d.currency}`}
                      to="/payments"
                      onClick={() => setMenuPos(null)}
                      className="neo-flat px-3 py-2 text-xs text-left"
                    >
                      <p>
                        Debes{" "}
                        <span className="font-semibold text-[var(--danger)]">
                          {d.amount} {d.currency}
                        </span>{" "}
                        · {d.account_name}
                      </p>
                      {d.due_status === "overdue" && (
                        <p className="text-[var(--danger)] font-semibold mt-0.5">¡Fecha límite vencida!</p>
                      )}
                      {d.due_status === "due_soon" && (
                        <p className="text-[var(--danger)] font-semibold mt-0.5">
                          Vence pronto ({d.debt_due_date})
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold mb-2 px-1">Pagos recibidos</p>
              {(notifications?.payments.length ?? 0) === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] px-1">Nadie te ha pagado todavía.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {[...pendingPayments, ...confirmedPayments].map((p) => (
                    <Link
                      key={p.settlement_id}
                      to={`/payments?tab=register&account=${p.account_id}`}
                      onClick={() => setMenuPos(null)}
                      className="neo-flat px-3 py-2 text-xs text-left"
                    >
                      <p>
                        <span className="font-semibold">{p.from_user_name}</span> te pagó{" "}
                        <span className="font-semibold text-[var(--success)]">
                          {p.amount} {p.currency}
                        </span>{" "}
                        · {p.account_name}
                      </p>
                      {p.pending_confirmation && (
                        <p className="text-[var(--accent)] font-semibold mt-0.5">Pendiente de confirmar</p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Layout() {
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");

  function handleLogout() {
    if (window.confirm("¿Seguro que quieres cerrar sesión?")) {
      logout();
    }
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    // pt-[env(safe-area-inset-top)] evita que el contenido quede debajo de la
    // barra de notificaciones/hora en celulares con notch o pantalla curva.
    <div className="min-h-screen flex flex-col sm:flex-row pt-[env(safe-area-inset-top)]">
      {/* El wrapper (no el <aside>) es lo que debe ser sticky: así el botón de
          colapso, posicionado absolute respecto a este wrapper, se queda fijo
          junto con el sidebar en vez de desplazarse con el scroll de <main>. */}
      <div className="hidden sm:block relative shrink-0 sticky top-0 h-screen">
        <aside
          className={`flex flex-col gap-4 h-full overflow-y-auto overflow-x-hidden border-r border-[var(--shadow-dark)] transition-[width] duration-150 ${
            collapsed ? "w-20 px-2 py-5" : "w-56 p-5"
          }`}
        >
          <ProfileMenu collapsed={collapsed} />
          <NotificationsMenu variant={{ kind: "sidebar", collapsed }} />

          <nav className="flex flex-col gap-2">
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `neo-btn px-4 py-3 text-sm flex items-center gap-3 ${collapsed ? "justify-center" : ""} ${
                    isActive ? "text-[var(--accent)] font-semibold" : ""
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && label}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            title={collapsed ? "Cerrar sesión" : undefined}
            className={`neo-btn px-4 py-3 text-sm mt-auto text-[var(--danger)] flex items-center gap-3 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogoutIcon className="w-5 h-5 shrink-0" />
            {!collapsed && "Cerrar sesión"}
          </button>
        </aside>

        {/* Pestaña de colapso a caballo entre el sidebar y el contenido */}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="neo-btn absolute top-8 -right-3 w-7 h-7 rounded-full flex items-center justify-center z-10"
        >
          {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
        </button>
      </div>

      {/* pb-[calc(5rem_+_env(safe-area-inset-bottom))]: dejar espacio para el
          nav inferior fijo MÁS la barra de gestos del sistema (celulares sin
          botón físico de inicio), no solo para el nav. */}
      <main className="flex-1 p-4 sm:p-8 pb-[calc(5rem_+_env(safe-area-inset-bottom))] sm:pb-8 max-w-5xl w-full mx-auto">
        <ErrorBoundary key={typeof window !== "undefined" ? window.location.pathname : undefined}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <nav className="sm:hidden fixed inset-x-0 bottom-0 z-50 neo-raised rounded-none border-t border-[var(--shadow-dark)] flex justify-around pt-2 pb-[calc(0.5rem_+_env(safe-area-inset-bottom))] px-2">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center text-xs px-3 py-1.5 rounded-xl ${
                isActive ? "text-[var(--accent)] font-semibold" : "text-[var(--text-secondary)]"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
        <NotificationsMenu variant={{ kind: "mobile" }} />
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center text-xs px-3 py-1.5 rounded-xl ${
              isActive ? "text-[var(--accent)] font-semibold" : "text-[var(--text-secondary)]"
            }`
          }
        >
          <UserIcon className="w-5 h-5" />
          Perfil
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center text-xs px-3 py-1.5 text-[var(--danger)]"
        >
          <LogoutIcon className="w-5 h-5" />
          Salir
        </button>
      </nav>
    </div>
  );
}
