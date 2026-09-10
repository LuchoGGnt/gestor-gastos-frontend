import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

export function NeoCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`neo-raised p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function NeoButton({
  children,
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "accent" | "danger" }) {
  const color =
    variant === "accent"
      ? "text-[var(--accent)] font-semibold"
      : variant === "danger"
        ? "text-[var(--danger)] font-semibold"
        : "text-[var(--text-primary)]";
  return (
    <button
      className={`neo-btn px-4 py-2.5 text-sm ${color} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function NeoInput({ className = "", onWheel, min, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const isNumber = props.type === "number";
  return (
    <input
      // Sin `min` explícito, los montos/cantidades numéricos no aceptan negativos
      // (no hay ningún caso en la app donde un monto o cantidad negativa tenga sentido).
      min={isNumber ? (min ?? 0) : min}
      onWheel={
        isNumber
          ? (e) => {
              // La rueda del mouse no debe cambiar el valor de un input numérico enfocado
              // (comportamiento nativo del navegador, no deseado en campos de montos).
              e.currentTarget.blur();
              onWheel?.(e);
            }
          : onWheel
      }
      className={`neo-input px-4 py-2.5 text-sm w-full ${className}`}
      {...props}
    />
  );
}

export function NeoPasswordInput({
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={`neo-input px-4 py-2.5 pr-11 text-sm w-full ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        tabIndex={-1}
        className="absolute right-0 top-0 h-full px-3 flex items-center text-[var(--text-secondary)]"
      >
        {visible ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.5a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function NeoSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="neo-input px-4 py-2.5 text-sm w-full" {...props} />;
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">{children}</label>;
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="text-[var(--danger)] text-sm mt-2">{message}</p>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">{title}</h1>
      {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>}
    </div>
  );
}
