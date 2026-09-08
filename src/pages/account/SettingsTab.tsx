import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { deleteAccount, listExpenses, updateAccount } from "../../api/endpoints";
import type { Account, AccountType } from "../../api/types";
import { extractErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ErrorText, FieldLabel, NeoButton, NeoCard, NeoInput, NeoSelect } from "../../components/ui";

export default function SettingsTab({ account }: { account: Account }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isOwner = account.members.some((m) => m.user_id === user?.id && m.role === "owner");

  const [name, setName] = useState(account.name);
  const [description, setDescription] = useState(account.description ?? "");
  const [type, setType] = useState<AccountType>(account.account_type);
  const [error, setError] = useState<string | null>(null);

  // El backend rechaza el cambio de tipo si la cuenta ya tiene gastos o pagos.
  // Traemos los gastos para deshabilitar el selector de antemano (mejor UX).
  const { data: expenses } = useQuery({
    queryKey: ["expenses", account.id],
    queryFn: () => listExpenses(account.id),
    enabled: isOwner,
  });
  const hasMovements = (expenses?.length ?? 0) > 0;

  const saveMutation = useMutation({
    mutationFn: () =>
      updateAccount(account.id, {
        name: name.trim(),
        description: description.trim() || null,
        account_type: type,
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["account", account.id] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const dirty =
    name.trim() !== account.name ||
    (description.trim() || null) !== (account.description ?? null) ||
    type !== account.account_type;

  if (!isOwner) {
    return (
      <NeoCard>
        <p className="text-sm text-[var(--text-secondary)]">
          Solo el dueño de la cuenta puede editar o borrar la cuenta.
        </p>
      </NeoCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <NeoCard>
        <p className="text-sm font-semibold mb-3">Datos de la cuenta</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            saveMutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <FieldLabel>Nombre</FieldLabel>
            <NeoInput required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Descripción / notas</FieldLabel>
            <textarea
              className="neo-input px-4 py-2.5 text-sm w-full min-h-[80px] resize-y"
              maxLength={2000}
              placeholder="Notas visibles para todos los miembros de la cuenta"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-56">
            <FieldLabel>Tipo</FieldLabel>
            <NeoSelect
              value={type}
              disabled={hasMovements}
              onChange={(e) => setType(e.target.value as AccountType)}
            >
              <option value="shared">Compartida</option>
              <option value="personal">Personal</option>
            </NeoSelect>
            {hasMovements && (
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                No se puede cambiar el tipo: la cuenta ya tiene gastos registrados.
              </p>
            )}
          </div>
          <div>
            <NeoButton type="submit" variant="accent" disabled={!dirty || saveMutation.isPending}>
              Guardar cambios
            </NeoButton>
          </div>
          <ErrorText message={error} />
        </form>
      </NeoCard>

      <DangerZone account={account} onDeleted={() => navigate("/accounts")} />
    </div>
  );
}

function DangerZone({ account, onDeleted }: { account: Account; onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(account.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onDeleted();
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const nameMatches = confirmName.trim() === account.name;

  function handleDelete() {
    // Segunda confirmación: además de escribir el nombre exacto, un diálogo final.
    if (!nameMatches) return;
    if (
      window.confirm(
        `Vas a eliminar la cuenta "${account.name}" de forma permanente. Esta acción no se puede deshacer. ¿Continuar?`,
      )
    ) {
      deleteMutation.mutate();
    }
  }

  return (
    <NeoCard className="border-l-4 border-[var(--danger)]">
      <p className="text-sm font-semibold mb-1">Eliminar cuenta</p>
      <p className="text-[11px] text-[var(--text-secondary)] mb-3">
        Solo es posible si la cuenta no tiene gastos ni pagos registrados. La eliminación es permanente.
      </p>

      {!open ? (
        <NeoButton variant="danger" onClick={() => setOpen(true)}>
          Eliminar cuenta
        </NeoButton>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <FieldLabel>
              Escribe el nombre de la cuenta (<strong>{account.name}</strong>) para confirmar
            </FieldLabel>
            <NeoInput
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={account.name}
            />
          </div>
          <div className="flex gap-3">
            <NeoButton
              variant="danger"
              disabled={!nameMatches || deleteMutation.isPending}
              onClick={handleDelete}
            >
              Confirmar eliminación
            </NeoButton>
            <NeoButton
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmName("");
                setError(null);
              }}
            >
              Cancelar
            </NeoButton>
          </div>
          <ErrorText message={error} />
        </div>
      )}
    </NeoCard>
  );
}
