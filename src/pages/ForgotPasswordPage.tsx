import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword, resetPassword } from "../api/endpoints";
import { extractErrorMessage } from "../api/client";
import { ErrorText, FieldLabel, NeoButton, NeoCard, NeoInput, NeoPasswordInput, PageHeader } from "../components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setMessage("Si el correo existe, te enviamos un código para restablecer tu contraseña.");
      setStep("reset");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setMessage("Contraseña actualizada. Ya puedes iniciar sesión.");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <NeoCard className="w-full max-w-sm">
        <PageHeader title="Recuperar contraseña" />
        {step === "request" ? (
          <form onSubmit={handleRequest} className="flex flex-col gap-4">
            <div>
              <FieldLabel>Email</FieldLabel>
              <NeoInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <ErrorText message={error} />
            <NeoButton type="submit" variant="accent" disabled={loading}>
              Enviar código
            </NeoButton>
          </form>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            {message && <p className="text-sm text-[var(--text-secondary)]">{message}</p>}
            <div>
              <FieldLabel>Código recibido por correo</FieldLabel>
              <NeoInput required value={token} onChange={(e) => setToken(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Nueva contraseña</FieldLabel>
              <NeoPasswordInput
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <ErrorText message={error} />
            <NeoButton type="submit" variant="accent" disabled={loading}>
              Restablecer contraseña
            </NeoButton>
          </form>
        )}
        <div className="mt-5 text-xs text-[var(--text-secondary)]">
          <Link to="/login" className="hover:text-[var(--accent)]">
            Volver a iniciar sesión
          </Link>
        </div>
      </NeoCard>
    </div>
  );
}
