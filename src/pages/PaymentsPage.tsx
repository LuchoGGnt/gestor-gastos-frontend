import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { getAccount, listAccounts, listMyBalances, setDebtDueDate } from "../api/endpoints";
import type { Account, MyBalance } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { NeoButton, NeoCard, NeoInput, PageHeader } from "../components/ui";
import SettlementsTab from "./account/SettlementsTab";

const SUB_TABS = [
  { key: "balances", label: "Saldos" },
  { key: "register", label: "Registrar pago" },
] as const;
type SubTab = (typeof SUB_TABS)[number]["key"];

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dateStr}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function DueDateBadge({ dueDate }: { dueDate: string }) {
  const days = daysUntil(dueDate);
  if (days < 0) {
    return (
      <p className="text-xs font-semibold text-[var(--danger)] mt-1">
        ¡Venció hace {Math.abs(days)} día(s)! ({dueDate})
      </p>
    );
  }
  if (days <= 3) {
    return (
      <p className="text-xs font-semibold text-[var(--danger)] mt-1">
        Vence en {days} día(s) ({dueDate})
      </p>
    );
  }
  return (
    <p className="text-xs text-[var(--text-secondary)] mt-1">
      Fecha límite: {dueDate} ({days} días)
    </p>
  );
}

function BalanceTile({ balance, isOwner }: { balance: MyBalance; isOwner: boolean }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState(balance.debt_due_date ?? "");

  const dueDateMutation = useMutation({
    mutationFn: (value: string) => setDebtDueDate(balance.account_id, value || null),
    onSuccess: () => {
      setEditingDate(false);
      queryClient.invalidateQueries({ queryKey: ["my-balances"] });
    },
  });

  const positive = parseFloat(balance.net_balance) >= 0;

  return (
    <div className="neo-flat p-4">
      <p className="text-xs text-[var(--text-secondary)]">{balance.account_name}</p>
      <p className={`text-xl font-semibold mt-1 ${positive ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
        {positive ? "Te deben " : "Debes "}
        {Math.abs(parseFloat(balance.net_balance)).toFixed(2)} {balance.currency}
      </p>

      {(balance.others ?? []).length > 0 && (
        <ul className="mt-2 flex flex-col gap-0.5">
          {balance.others.map((o) => {
            const otherOwesMe = parseFloat(o.net_balance) < 0; // su saldo negativo = me debe a mí
            return (
              <li key={o.user_id} className="text-xs text-[var(--text-secondary)]">
                {o.user_id === user?.id ? "Yo" : o.full_name}:{" "}
                <span className={otherOwesMe ? "text-[var(--danger)]" : "text-[var(--success)]"}>
                  {otherOwesMe ? "debe " : "le deben "}
                  {Math.abs(parseFloat(o.net_balance)).toFixed(2)} {balance.currency}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {balance.debt_due_date && !editingDate && <DueDateBadge dueDate={balance.debt_due_date} />}

      {isOwner && (
        <>
          {editingDate ? (
            <div className="flex items-center gap-2 mt-2">
              <NeoInput type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} />
              <NeoButton
                type="button"
                variant="accent"
                onClick={() => dueDateMutation.mutate(dateValue)}
                disabled={dueDateMutation.isPending}
              >
                OK
              </NeoButton>
              <NeoButton type="button" onClick={() => setEditingDate(false)}>
                X
              </NeoButton>
            </div>
          ) : (
            <button
              onClick={() => setEditingDate(true)}
              className="text-xs text-[var(--accent)] mt-2 block"
            >
              {balance.debt_due_date ? "Cambiar fecha límite" : "+ Poner fecha límite"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  // Las notificaciones de pagos enlazan acá con ?tab=register&account=<id>
  // para llevar directo a la cuenta donde hay que confirmar la recepción,
  // en vez de dejar al usuario en "Saldos" sin cuenta elegida.
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "register" ? "register" : "balances";
  const initialAccountId = searchParams.get("account") ?? "";

  const [subTab, setSubTab] = useState<SubTab>(initialTab);
  const [balancesFilterId, setBalancesFilterId] = useState(""); // "" = todas
  const [registerAccountId, setRegisterAccountId] = useState(initialAccountId);
  const { user } = useAuth();

  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });
  const sharedAccounts = accounts?.filter((a) => a.account_type === "shared") ?? [];

  function isOwnerOf(accountId: string): boolean {
    const account = sharedAccounts.find((a) => a.id === accountId);
    return account?.members.some((m) => m.user_id === user?.id && m.role === "owner") ?? false;
  }

  const { data: balances, isLoading: loadingBalances } = useQuery({
    queryKey: ["my-balances"],
    queryFn: listMyBalances,
  });
  const visibleBalances = balancesFilterId
    ? balances?.filter((b) => b.account_id === balancesFilterId)
    : balances;

  const { data: registerAccount } = useQuery<Account>({
    queryKey: ["account", registerAccountId],
    queryFn: () => getAccount(registerAccountId),
    enabled: registerAccountId !== "",
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pagos" subtitle="Deuda y devoluciones entre miembros de tus cuentas compartidas" />

      <div className="neo-flat p-1.5 flex gap-1 w-fit">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 text-sm rounded-[10px] whitespace-nowrap transition-colors ${
              subTab === t.key ? "neo-pressed text-[var(--accent)] font-semibold" : "text-[var(--text-secondary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "balances" && (
        <>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setBalancesFilterId("")}
              className={`neo-btn px-4 py-2 text-sm ${
                balancesFilterId === "" ? "text-[var(--accent)] font-semibold" : ""
              }`}
            >
              Todas
            </button>
            {sharedAccounts.map((a) => (
              <button
                key={a.id}
                onClick={() => setBalancesFilterId(a.id)}
                className={`neo-btn px-4 py-2 text-sm ${
                  balancesFilterId === a.id ? "text-[var(--accent)] font-semibold" : ""
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>

          <NeoCard>
            <p className="text-sm font-semibold mb-3">Saldo (agrupado por moneda)</p>
            {loadingBalances && <p className="text-sm text-[var(--text-secondary)]">Cargando...</p>}
            {visibleBalances?.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">No tienes saldos pendientes aquí.</p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleBalances?.map((b) => (
                <BalanceTile key={`${b.account_id}-${b.currency}`} balance={b} isOwner={isOwnerOf(b.account_id)} />
              ))}
            </div>
          </NeoCard>
        </>
      )}

      {subTab === "register" && (
        <>
          <div className="flex gap-2 flex-wrap">
            {sharedAccounts.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">No tienes cuentas compartidas todavía.</p>
            )}
            {sharedAccounts.map((a) => (
              <button
                key={a.id}
                onClick={() => setRegisterAccountId(a.id)}
                className={`neo-btn px-4 py-2 text-sm ${
                  registerAccountId === a.id ? "text-[var(--accent)] font-semibold" : ""
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>

          {registerAccountId === "" ? (
            <NeoCard>
              <p className="text-sm text-[var(--text-secondary)]">
                Selecciona una cuenta compartida arriba para registrar un pago o ver su historial.
              </p>
            </NeoCard>
          ) : (
            registerAccount && <SettlementsTab account={registerAccount} />
          )}
        </>
      )}
    </div>
  );
}
