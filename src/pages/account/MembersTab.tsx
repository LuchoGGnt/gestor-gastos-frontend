import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addMember } from "../../api/endpoints";
import type { Account } from "../../api/types";
import { extractErrorMessage } from "../../api/client";
import { ErrorText, FieldLabel, NeoButton, NeoCard, NeoInput } from "../../components/ui";
import AuthImage from "../../components/AuthImage";
import { useAuth } from "../../context/AuthContext";

export default function MembersTab({ account }: { account: Account }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => addMember(account.id, identifier),
    onSuccess: () => {
      setIdentifier("");
      queryClient.invalidateQueries({ queryKey: ["account", account.id] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  return (
    <div className="flex flex-col gap-4">
      <NeoCard>
        <p className="text-sm font-semibold mb-3">Miembros actuales</p>
        <ul className="flex flex-col gap-2">
          {account.members.map((m) => (
            <li key={m.id} className="neo-flat px-4 py-2.5 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AuthImage
                  mediaId={m.user.profile_photo_media_id}
                  alt={m.user.full_name}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <span>{m.user_id === user?.id ? "Yo" : m.user.full_name}</span>
              </div>
              <span className="text-[var(--text-secondary)]">
                {m.role === "owner" ? "Dueño (acreedor por defecto)" : "Miembro"}
              </span>
            </li>
          ))}
        </ul>
      </NeoCard>

      {account.account_type === "shared" && (
        <NeoCard>
          <p className="text-sm font-semibold mb-3">Agregar a un usuario</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              mutation.mutate();
            }}
            className="flex flex-col sm:flex-row gap-3 items-end"
          >
            <div className="flex-1 w-full">
              <FieldLabel>Usuario o email</FieldLabel>
              <NeoInput required value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            </div>
            <NeoButton type="submit" variant="accent" disabled={mutation.isPending}>
              Agregar
            </NeoButton>
          </form>
          <ErrorText message={error} />
        </NeoCard>
      )}
    </div>
  );
}
