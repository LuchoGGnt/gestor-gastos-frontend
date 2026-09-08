import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createAccount, listAccounts, listInvitations, respondInvitation } from "../api/endpoints";
import type { AccountType } from "../api/types";
import { extractErrorMessage } from "../api/client";
import { ErrorText, FieldLabel, NeoButton, NeoCard, NeoInput, NeoSelect, PageHeader } from "../components/ui";

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const { data: accounts, isLoading } = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });
  const { data: invitations } = useQuery({ queryKey: ["invitations"], queryFn: listInvitations });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("shared");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createAccount(name, type),
    onSuccess: () => {
      setName("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const respondMutation = useMutation({
    mutationFn: ({ accountId, accept }: { accountId: string; accept: boolean }) =>
      respondInvitation(accountId, accept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  return (
    <div>
      <PageHeader title="Mis cuentas" subtitle="Personales y compartidas" />

      {invitations && invitations.length > 0 && (
        <div className="flex flex-col gap-3 mb-6">
          {invitations.map((inv) => (
            <NeoCard key={inv.account_id} className="border-l-4 border-[var(--accent)]">
              <p className="text-sm">
                <strong>{inv.invited_by.full_name}</strong> te invitó a la cuenta compartida{" "}
                <strong>{inv.account_name}</strong>.
              </p>
              <div className="flex gap-3 mt-3">
                <NeoButton
                  variant="accent"
                  disabled={respondMutation.isPending}
                  onClick={() => respondMutation.mutate({ accountId: inv.account_id, accept: true })}
                >
                  Aceptar
                </NeoButton>
                <NeoButton
                  variant="danger"
                  disabled={respondMutation.isPending}
                  onClick={() => respondMutation.mutate({ accountId: inv.account_id, accept: false })}
                >
                  Rechazar
                </NeoButton>
              </div>
            </NeoCard>
          ))}
        </div>
      )}

      {!showForm ? (
        <NeoButton variant="accent" onClick={() => setShowForm(true)} className="mb-6">
          + Nueva cuenta
        </NeoButton>
      ) : (
        <NeoCard className="mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              mutation.mutate();
            }}
            className="flex flex-col sm:flex-row gap-3 items-end"
          >
            <div className="flex-1 w-full">
              <FieldLabel>Nombre de la cuenta</FieldLabel>
              <NeoInput
                required
                placeholder="Casa Chile"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-40">
              <FieldLabel>Tipo</FieldLabel>
              <NeoSelect value={type} onChange={(e) => setType(e.target.value as AccountType)}>
                <option value="shared">Compartida</option>
                <option value="personal">Personal</option>
              </NeoSelect>
            </div>
            <NeoButton type="submit" variant="accent" disabled={mutation.isPending}>
              Crear cuenta
            </NeoButton>
            <NeoButton type="button" onClick={() => setShowForm(false)}>
              Cancelar
            </NeoButton>
          </form>
          <ErrorText message={error} />
        </NeoCard>
      )}

      {isLoading && <p className="text-sm text-[var(--text-secondary)]">Cargando...</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        {accounts?.map((account) => (
          <Link key={account.id} to={`/accounts/${account.id}`}>
            <NeoCard className="hover:scale-[1.01] transition-transform">
              <p className="font-semibold">{account.name}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {account.account_type === "shared" ? "Compartida" : "Personal"} ·{" "}
                {account.members.length} miembro(s)
              </p>
            </NeoCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
