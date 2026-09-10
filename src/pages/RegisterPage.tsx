import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../api/client";
import { ErrorText, FieldLabel, NeoButton, NeoCard, NeoInput, NeoPasswordInput, PageHeader } from "../components/ui";

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", username: "", full_name: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerUser(form);
      await login(form.email, form.password);
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
        <PageHeader
          title="Crear cuenta"
          subtitle="Recibirás un correo de bienvenida con tu usuario"
        />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <FieldLabel>Nombre completo</FieldLabel>
            <NeoInput required value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Usuario</FieldLabel>
            <NeoInput required value={form.username} onChange={(e) => update("username", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <NeoInput
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Contraseña</FieldLabel>
            <NeoPasswordInput
              required
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Mínimo 10 caracteres, con mayúscula, minúscula y número.
            </p>
          </div>
          <ErrorText message={error} />
          <NeoButton type="submit" variant="accent" disabled={loading}>
            {loading ? "Creando..." : "Crear cuenta"}
          </NeoButton>
        </form>
        <div className="mt-5 text-xs text-[var(--text-secondary)]">
          <Link to="/login" className="hover:text-[var(--accent)]">
            Ya tengo cuenta, iniciar sesión
          </Link>
        </div>
      </NeoCard>
    </div>
  );
}
