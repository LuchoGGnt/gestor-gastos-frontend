import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmSettlement, createSettlement, listSettlements, listWallets } from "../../api/endpoints";
import type { Account, Currency } from "../../api/types";
import { extractErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ErrorText, FieldLabel, NeoButton, NeoCard, NeoInput, NeoSelect } from "../../components/ui";

export default function SettlementsTab({ account }: { account: Account }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: settlements } = useQuery({
    queryKey: ["settlements", account.id],
    queryFn: () => listSettlements(account.id),
  });
  const { data: myWallets } = useQuery({ queryKey: ["wallets"], queryFn: listWallets });

  function memberName(userId: string): string {
    if (userId === user?.id) return "Yo";
    return account.members.find((m) => m.user_id === userId)?.user.full_name ?? "Miembro";
  }

  const [fromUser, setFromUser] = useState(account.members[0]?.user_id ?? "");
  const [toUser, setToUser] = useState(account.members[1]?.user_id ?? account.members[0]?.user_id ?? "");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("CLP");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [fromWalletId, setFromWalletId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const iAmPayer = fromUser === user?.id;

  const mutation = useMutation({
    mutationFn: () =>
      createSettlement({
        account_id: account.id,
        from_user_id: fromUser,
        to_user_id: toUser,
        amount,
        currency,
        settlement_date: date,
        note: note || undefined,
        from_wallet_id: iAmPayer && fromWalletId ? fromWalletId : undefined,
      }),
    onSuccess: () => {
      setAmount("");
      setNote("");
      setFromWalletId("");
      queryClient.invalidateQueries({ queryKey: ["settlements", account.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", account.id] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  return (
    <div className="flex flex-col gap-4">
      <NeoCard>
        <p className="text-sm font-semibold mb-3">Registrar pago / devolución</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="grid sm:grid-cols-2 gap-3"
        >
          <div>
            <FieldLabel>Quién paga</FieldLabel>
            <NeoSelect value={fromUser} onChange={(e) => setFromUser(e.target.value)}>
              {account.members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {memberName(m.user_id)}
                </option>
              ))}
            </NeoSelect>
          </div>
          <div>
            <FieldLabel>Quién recibe</FieldLabel>
            <NeoSelect value={toUser} onChange={(e) => setToUser(e.target.value)}>
              {account.members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {memberName(m.user_id)}
                </option>
              ))}
            </NeoSelect>
          </div>
          <div>
            <FieldLabel>Monto</FieldLabel>
            <NeoInput
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Moneda</FieldLabel>
            <NeoSelect
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value as Currency);
                setFromWalletId("");
              }}
            >
              <option value="CLP">CLP</option>
              <option value="PEN">PEN</option>
              <option value="USD">USD</option>
            </NeoSelect>
          </div>
          <div>
            <FieldLabel>Fecha</FieldLabel>
            <NeoInput type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Nota (opcional)</FieldLabel>
            <NeoInput value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {iAmPayer && (
            <div className="sm:col-span-2">
              <FieldLabel>Desde mi cartera (opcional)</FieldLabel>
              <NeoSelect value={fromWalletId} onChange={(e) => setFromWalletId(e.target.value)}>
                <option value="">No descontar de ninguna cartera</option>
                {myWallets?.filter((w) => w.currency === currency).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label} ({w.currency} {w.balance})
                  </option>
                ))}
              </NeoSelect>
            </div>
          )}
          <div className="sm:col-span-2">
            <ErrorText message={error} />
            <NeoButton type="submit" variant="accent" disabled={mutation.isPending} className="mt-2">
              Registrar
            </NeoButton>
          </div>
        </form>
      </NeoCard>

      <NeoCard>
        <p className="text-sm font-semibold mb-3">Historial de pagos</p>
        <div className="flex flex-col gap-2">
          {settlements?.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">Aún no hay pagos registrados.</p>
          )}
          {settlements?.map((s) => (
            <SettlementRow key={s.id} settlement={s} account={account} memberName={memberName} />
          ))}
        </div>
      </NeoCard>
    </div>
  );
}

function SettlementRow({
  settlement: s,
  account,
  memberName,
}: {
  settlement: import("../../api/types").Settlement;
  account: Account;
  memberName: (userId: string) => string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: myWallets } = useQuery({ queryKey: ["wallets"], queryFn: listWallets });
  const [toWalletId, setToWalletId] = useState("");
  const [showConfirmForm, setShowConfirmForm] = useState(false);

  const iAmCreditor = s.to_user_id === user?.id;
  const isPending = !s.confirmed_at;

  const confirmMutation = useMutation({
    mutationFn: () => confirmSettlement(s.id, toWalletId || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements", account.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", account.id] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      setShowConfirmForm(false);
    },
  });

  return (
    <div className="neo-flat px-4 py-3 text-sm">
      <div className="flex justify-between items-center">
        <div>
          <p>
            {memberName(s.from_user_id)} → {memberName(s.to_user_id)}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {s.settlement_date} {s.note ? `· ${s.note}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold">
            {s.amount} {s.currency}
          </span>
          <span
            className={`text-[10px] px-2 py-1 rounded-full ${
              isPending
                ? "bg-[var(--danger)]/15 text-[var(--danger)]"
                : "bg-[var(--success)]/15 text-[var(--success)]"
            }`}
          >
            {isPending ? "Pendiente de confirmación" : "Confirmado"}
          </span>
        </div>
      </div>

      {isPending && iAmCreditor && (
        <div className="mt-3 border-t border-[var(--shadow-dark)]/30 pt-3">
          {!showConfirmForm ? (
            <NeoButton onClick={() => setShowConfirmForm(true)} variant="accent">
              Confirmar recepción
            </NeoButton>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1 w-full">
                <FieldLabel>Acreditar en mi cartera (opcional)</FieldLabel>
                <NeoSelect value={toWalletId} onChange={(e) => setToWalletId(e.target.value)}>
                  <option value="">No acreditar en ninguna cartera</option>
                  {myWallets?.filter((w) => w.currency === s.currency).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label} ({w.currency} {w.balance})
                    </option>
                  ))}
                </NeoSelect>
              </div>
              <NeoButton
                variant="accent"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
              >
                Confirmar
              </NeoButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
