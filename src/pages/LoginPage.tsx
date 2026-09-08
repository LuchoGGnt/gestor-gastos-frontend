import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../api/client";
import { ErrorText, FieldLabel, NeoButton, NeoCard, NeoInput, PageHeader } from "../components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/accounts");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <NeoCard className="w-full max-w-sm">
        <PageHeader title="Iniciar sesión" subtitle="Controla tus gastos personales y compartidos" />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <FieldLabel>Email</FieldLabel>
            <NeoInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Contraseña</FieldLabel>
            <NeoInput
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <ErrorText message={error} />
          <NeoButton type="submit" variant="accent" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </NeoButton>
        </form>
        <div className="flex justify-between mt-5 text-xs text-[var(--text-secondary)]">
          <Link to="/register" className="hover:text-[var(--accent)]">
            Crear cuenta
          </Link>
          <Link to="/forgot-password" className="hover:text-[var(--accent)]">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </NeoCard>
    </div>
  );
}
