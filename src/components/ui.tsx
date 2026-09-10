import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

export const NeoCard = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>
>(function NeoCard({ children, className = "", ...props }, ref) {
  return (
    <div ref={ref} className={`neo-raised p-5 sm:p-6 ${className}`} {...props}>
      {children}
    </div>
  );
});

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

export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <>
      {/* Fondo borroso: concentra toda la atención en la alerta, típico para
          acciones destructivas (borrar). Clic afuera también cierra. */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">{title}</h1>
      {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>}
    </div>
  );
}
