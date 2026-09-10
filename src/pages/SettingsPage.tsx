import { useRef, useState } from "react";
import {
  changePassword,
  deleteProfilePhoto,
  updateProfile,
  uploadProfilePhoto,
} from "../api/endpoints";
import { extractErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import AuthImage from "../components/AuthImage";
import { ErrorText, FieldLabel, NeoButton, NeoInput, NeoPasswordInput, PageHeader } from "../components/ui";

const THEME_OPTIONS: { value: "light" | "dark" | "system"; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Automático" },
];

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfileError(null);
    setProfileSuccess(false);
    setProfileLoading(true);
    try {
      const payload: { username?: string; full_name?: string } = {};
      if (fullName !== user.full_name) payload.full_name = fullName;
      if (username !== user.username) payload.username = username;
      const updated = await updateProfile(payload);
      setUser(updated);
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(extractErrorMessage(err));
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setPhotoLoading(true);
    try {
      const updated = await uploadProfilePhoto(file);
      setUser(updated);
    } catch (err) {
      setPhotoError(extractErrorMessage(err));
    } finally {
      setPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handlePhotoDelete() {
    setPhotoError(null);
    setPhotoLoading(true);
    try {
      const updated = await deleteProfilePhoto();
      setUser(updated);
    } catch (err) {
      setPhotoError(extractErrorMessage(err));
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordSuccess(true);
    } catch (err) {
      setPasswordError(extractErrorMessage(err));
    } finally {
      setPasswordLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div>
      <PageHeader title="Ajustes" />

      <div className="neo-raised p-5 sm:p-6 flex flex-col gap-8">
        {/* Perfil */}
        <section>
          <p className="text-sm font-semibold mb-3">Perfil</p>
          <div className="flex items-center gap-4 mb-4">
            <AuthImage
              mediaId={user.profile_photo_media_id}
              alt={user.full_name}
              className="w-16 h-16 rounded-full object-cover neo-flat shrink-0"
            />
            <div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[var(--accent)]"
                  disabled={photoLoading}
                >
                  {photoLoading ? "Procesando..." : "Cambiar foto"}
                </button>
                {user.profile_photo_media_id && (
                  <button
                    type="button"
                    onClick={handlePhotoDelete}
                    className="text-xs text-[var(--danger)]"
                    disabled={photoLoading}
                  >
                    Quitar foto
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <ErrorText message={photoError} />
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4 max-w-sm">
            <div>
              <FieldLabel>Nombre completo</FieldLabel>
              <NeoInput required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Usuario</FieldLabel>
              <NeoInput required value={username} onChange={(e) => setUsername(e.target.value)} />
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                Solo puedes cambiar tu usuario una vez cada 14 días.
              </p>
            </div>
            <ErrorText message={profileError} />
            {profileSuccess && <p className="text-[var(--success)] text-sm">Perfil actualizado.</p>}
            <NeoButton type="submit" variant="accent" disabled={profileLoading} className="self-start">
              {profileLoading ? "Guardando..." : "Guardar cambios"}
            </NeoButton>
          </form>
        </section>

        <div className="border-t border-[var(--shadow-dark)]/30" />

        {/* Apariencia */}
        <section>
          <p className="text-sm font-semibold mb-3">Apariencia</p>
          <div className="flex gap-2">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`neo-btn px-4 py-2 text-sm ${
                  theme === opt.value ? "text-[var(--accent)] font-semibold" : ""
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <div className="border-t border-[var(--shadow-dark)]/30" />

        {/* Contraseña */}
        <section>
          <p className="text-sm font-semibold mb-3">Cambiar contraseña</p>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 max-w-sm">
            <div>
              <FieldLabel>Contraseña actual</FieldLabel>
              <NeoPasswordInput
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Contraseña nueva</FieldLabel>
              <NeoPasswordInput
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                Mínimo 10 caracteres, con mayúscula, minúscula y número.
              </p>
            </div>
            <ErrorText message={passwordError} />
            {passwordSuccess && (
              <p className="text-[var(--success)] text-sm">
                Contraseña actualizada. Te enviamos un correo de confirmación.
              </p>
            )}
            <NeoButton type="submit" variant="accent" disabled={passwordLoading} className="self-start">
              {passwordLoading ? "Guardando..." : "Guardar"}
            </NeoButton>
          </form>
        </section>
      </div>
    </div>
  );
}
