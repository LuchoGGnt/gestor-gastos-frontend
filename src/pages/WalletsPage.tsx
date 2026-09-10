import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWallet,
  deleteWallet,
  listWalletTransactions,
  listWallets,
  registerManualExpense,
  topUpWallet,
  updateWallet,
} from "../api/endpoints";
import type { BankCode, Currency, Wallet, WalletKind, WalletTransactionType } from "../api/types";
import { extractErrorMessage } from "../api/client";
import { ErrorText, FieldLabel, NeoButton, NeoCard, NeoInput, NeoSelect, PageHeader } from "../components/ui";
import { PencilIcon, TrashIcon } from "../components/icons";

// Ya no se listan bancos individuales de Perú/Chile: el banco concreto
// (BCP, BancoEstado, etc.) se escribe en el nombre o la descripción de la
// cartera. Global66/Revolut y similares no están atados a un país (manejan
// varias divisas), así que van en su propia categoría.
const BANKS: { value: BankCode; label: string }[] = [
  { value: "pe", label: "Perú" },
  { value: "cl", label: "Chile" },
  { value: "global66", label: "Global66" },
  { value: "revolut", label: "Revolut" },
  { value: "other_virtual", label: "Otro banco virtual (multi-moneda)" },
];

// Agrupa un banco por país (o "virtual" para los multi-moneda) para restringir
// a qué bancos se puede cambiar al editar una cartera: no tiene sentido dejar
// que una cartera de un país "pase" a otro con solo cambiar el banco.
const VIRTUAL_BANKS = new Set<BankCode>(["global66", "revolut", "other_virtual"]);

function bankGroup(code: BankCode): string {
  return VIRTUAL_BANKS.has(code) ? "virtual" : code;
}

const TRANSACTION_LABELS: Record<WalletTransactionType, string> = {
  topup: "Ingreso",
  conversion_in: "Conversión (entrada)",
  conversion_out: "Conversión (salida)",
  expense_payment: "Pago de gasto",
  settlement_in: "Pago recibido",
  settlement_out: "Pago enviado",
  adjustment: "Ajuste",
  manual_expense: "Gasto manual",
};

const INCOME_TYPES = new Set<WalletTransactionType>(["topup", "settlement_in", "conversion_in"]);
const EXPENSE_TYPES = new Set<WalletTransactionType>([
  "expense_payment",
  "settlement_out",
  "conversion_out",
  "manual_expense",
]);

function isIncome(type: WalletTransactionType): boolean {
  return INCOME_TYPES.has(type);
}
function isExpenseType(type: WalletTransactionType): boolean {
  return EXPENSE_TYPES.has(type);
}

export default function WalletsPage() {
  const queryClient = useQueryClient();
  const { data: wallets } = useQuery({ queryKey: ["wallets"], queryFn: listWallets });

  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const { data: transactions, isLoading: loadingHistory } = useQuery({
    queryKey: ["wallet-transactions", selectedWalletId],
    queryFn: () => listWalletTransactions(selectedWalletId || undefined),
  });

  // Un solo formulario abierto a la vez: no tiene sentido crear una cartera y
  // registrar un ingreso/gasto al mismo tiempo.
  const [activeForm, setActiveForm] = useState<"create" | "topup" | "expense" | null>(null);

  const [label, setLabel] = useState("");
  const [currency, setCurrency] = useState<Currency>("PEN");
  const [kind, setKind] = useState<WalletKind>("cash");
  const [bankCode, setBankCode] = useState<BankCode | "">("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createWallet({ label, currency, kind, bank_code: kind === "bank" ? bankCode || null : null }),
    onSuccess: () => {
      setLabel("");
      setBankCode("");
      setActiveForm(null);
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const [topUpTarget, setTopUpTarget] = useState<string>("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpNote, setTopUpNote] = useState("");
  const topUpMutation = useMutation({
    mutationFn: () => topUpWallet(topUpTarget, topUpAmount, topUpNote || undefined),
    onSuccess: () => {
      setTopUpAmount("");
      setTopUpNote("");
      setActiveForm(null);
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });

  const [expenseTarget, setExpenseTarget] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const manualExpenseMutation = useMutation({
    mutationFn: () => registerManualExpense(expenseTarget, expenseAmount, expenseNote || undefined),
    onSuccess: () => {
      setExpenseAmount("");
      setExpenseNote("");
      setActiveForm(null);
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
    onError: (err) => setExpenseError(extractErrorMessage(err)),
  });

  // La selección (para filtrar el historial) es independiente de "gestionar"
  // una cartera (editar/eliminar): un click en la card ya no abre esos
  // paneles, solo lo hacen los íconos de lápiz/tacho de cada card.
  const [managing, setManaging] = useState<{ id: string; mode: "edit" | "delete" } | null>(null);
  const managedWallet = managing ? wallets?.find((w) => w.id === managing.id) ?? null : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mi cartera" subtitle="Efectivo y digital en soles, dólares y pesos chilenos" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets?.map((w) => (
          <NeoCard
            key={w.id}
            // El click en cualquier parte de la card (no solo el texto) filtra
            // el historial; los íconos paran la propagación para no disparar
            // esto también.
            onClick={() => setSelectedWalletId((prev) => (prev === w.id ? "" : w.id))}
            className={`relative cursor-pointer ${
              selectedWalletId === w.id ? "outline outline-2 outline-[var(--accent)]" : ""
            }`}
          >
            <p className="text-xs text-[var(--text-secondary)]">
              {w.kind === "cash" ? "Efectivo" : BANKS.find((b) => b.value === w.bank_code)?.label ?? "Banco"}
            </p>
            <p className="font-semibold pr-14">{w.label}</p>
            <p className="text-2xl font-semibold mt-2">
              {w.balance} <span className="text-sm text-[var(--text-secondary)]">{w.currency}</span>
            </p>
            <div className="absolute bottom-3 right-3 flex gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setManaging({ id: w.id, mode: "edit" });
                }}
                title="Editar cartera"
                aria-label="Editar cartera"
                className="neo-btn w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 hover:text-[var(--accent)]"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setManaging({ id: w.id, mode: "delete" });
                }}
                title="Eliminar cartera"
                aria-label="Eliminar cartera"
                className="neo-btn w-8 h-8 rounded-full flex items-center justify-center text-[var(--danger)] cursor-pointer transition-transform hover:scale-110"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </NeoCard>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <NeoButton
          onClick={() => setActiveForm((v) => (v === "create" ? null : "create"))}
          variant={activeForm === "create" ? "accent" : "default"}
        >
          + Agregar cartera
        </NeoButton>
        <NeoButton
          onClick={() => setActiveForm((v) => (v === "topup" ? null : "topup"))}
          variant={activeForm === "topup" ? "accent" : "default"}
        >
          + Registrar ingreso
        </NeoButton>
        <NeoButton
          onClick={() => setActiveForm((v) => (v === "expense" ? null : "expense"))}
          variant={activeForm === "expense" ? "accent" : "default"}
        >
          + Registrar gasto
        </NeoButton>
      </div>

      {managedWallet && managing?.mode === "edit" && (
        <WalletEditForm wallet={managedWallet} onClose={() => setManaging(null)} />
      )}
      {managedWallet && managing?.mode === "delete" && (
        <WalletDangerZone
          wallet={managedWallet}
          onClose={() => setManaging(null)}
          onDeleted={() => {
            setManaging(null);
            if (selectedWalletId === managedWallet.id) setSelectedWalletId("");
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
          }}
        />
      )}

      {activeForm === "create" && (
        <NeoCard>
          <p className="text-sm font-semibold mb-3">Agregar cartera</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              createMutation.mutate();
            }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
          >
            <div>
              <FieldLabel>Nombre</FieldLabel>
              <NeoInput
                required
                placeholder="Efectivo soles"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Moneda</FieldLabel>
              <NeoSelect value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                <option value="PEN">PEN (soles)</option>
                <option value="USD">USD (dólares)</option>
                <option value="CLP">CLP (pesos chilenos)</option>
              </NeoSelect>
            </div>
            <div>
              <FieldLabel>Tipo</FieldLabel>
              <NeoSelect value={kind} onChange={(e) => setKind(e.target.value as WalletKind)}>
                <option value="cash">Efectivo</option>
                <option value="bank">Cuenta bancaria</option>
              </NeoSelect>
            </div>
            {/* Siempre se reserva este slot del grid (aunque esté vacío en
                "efectivo") para que el resto de campos no se reacomode al
                cambiar el tipo de cartera. */}
            <div className={kind === "bank" ? undefined : "invisible"} aria-hidden={kind !== "bank"}>
              <FieldLabel>País de origen</FieldLabel>
              <NeoSelect
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value as BankCode)}
                required={kind === "bank"}
                disabled={kind !== "bank"}
              >
                <option value="">Selecciona...</option>
                {BANKS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </NeoSelect>
            </div>
            <div className="flex gap-2">
              <NeoButton type="submit" variant="accent" disabled={createMutation.isPending}>
                Crear
              </NeoButton>
              <NeoButton type="button" onClick={() => setActiveForm(null)}>
                Cancelar
              </NeoButton>
            </div>
          </form>
          <ErrorText message={error} />
        </NeoCard>
      )}

      {activeForm === "topup" && (
        <NeoCard>
          <p className="text-sm font-semibold mb-1">Registrar ingreso</p>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Dinero que entra a una cartera sin venir de un gasto de cuenta (recarga, pago recibido, etc.).
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              topUpMutation.mutate();
            }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
          >
            <div>
              <FieldLabel>Cartera</FieldLabel>
              <NeoSelect value={topUpTarget} onChange={(e) => setTopUpTarget(e.target.value)} required>
                <option value="">Selecciona...</option>
                {wallets?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label} ({w.currency})
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
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Nota (opcional)</FieldLabel>
              <NeoInput value={topUpNote} onChange={(e) => setTopUpNote(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <NeoButton type="submit" variant="accent" disabled={topUpMutation.isPending}>
                Registrar
              </NeoButton>
              <NeoButton type="button" onClick={() => setActiveForm(null)}>
                Cancelar
              </NeoButton>
            </div>
          </form>
        </NeoCard>
      )}

      {activeForm === "expense" && (
        <NeoCard>
          <p className="text-sm font-semibold mb-1">Registrar gasto</p>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Dinero que sale de una cartera sin ser un gasto de cuenta — por ejemplo, para reflejar una
            conversión de moneda que ya hiciste fuera de la app (soles → pesos vía Global66) sin tener que
            ingresar la tasa: registra el gasto acá en la cartera de origen y un ingreso en la de destino.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setExpenseError(null);
              manualExpenseMutation.mutate();
            }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
          >
            <div>
              <FieldLabel>Cartera</FieldLabel>
              <NeoSelect value={expenseTarget} onChange={(e) => setExpenseTarget(e.target.value)} required>
                <option value="">Selecciona...</option>
                {wallets?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label} ({w.currency} {w.balance})
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
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Nota (opcional)</FieldLabel>
              <NeoInput value={expenseNote} onChange={(e) => setExpenseNote(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <NeoButton type="submit" variant="accent" disabled={manualExpenseMutation.isPending}>
                Registrar
              </NeoButton>
              <NeoButton type="button" onClick={() => setActiveForm(null)}>
                Cancelar
              </NeoButton>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <ErrorText message={expenseError} />
            </div>
          </form>
        </NeoCard>
      )}

      <NeoCard>
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold">
            Historial de movimientos
            {selectedWalletId && wallets && (
              <span className="text-[var(--text-secondary)] font-normal">
                {" "}
                — {wallets.find((w) => w.id === selectedWalletId)?.label}
              </span>
            )}
          </p>
          {selectedWalletId && (
            <button onClick={() => setSelectedWalletId("")} className="text-xs text-[var(--accent)]">
              Ver todas
            </button>
          )}
        </div>

        {loadingHistory && <p className="text-sm text-[var(--text-secondary)]">Cargando...</p>}
        {transactions?.length === 0 && (
          <p className="text-sm text-[var(--text-secondary)]">Aún no hay movimientos.</p>
        )}

        <div className="flex flex-col gap-2">
          {transactions?.map((tx) => {
            const income = isIncome(tx.transaction_type);
            const expense = isExpenseType(tx.transaction_type);
            const sign = income ? "+" : expense ? "−" : "";
            const colorClass = income
              ? "text-[var(--success)]"
              : expense
                ? "text-[var(--danger)]"
                : "text-[var(--text-primary)]";
            return (
              <div key={tx.id} className="neo-flat px-4 py-3 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className="text-sm truncate">
                    {TRANSACTION_LABELS[tx.transaction_type]} · {tx.wallet_label}
                    {tx.related_account_name && (
                      <span className="text-[var(--text-secondary)]"> · {tx.related_account_name}</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {new Date(tx.created_at).toLocaleString()}
                    {tx.related_description && ` · ${tx.related_description}`}
                    {tx.note && ` · ${tx.note}`}
                  </p>
                </div>
                <p className={`text-sm font-semibold whitespace-nowrap ${colorClass}`}>
                  {sign}
                  {tx.amount} {tx.currency}
                </p>
              </div>
            );
          })}
        </div>
      </NeoCard>
    </div>
  );
}

function WalletEditForm({ wallet, onClose }: { wallet: Wallet; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState(wallet.label);
  const [description, setDescription] = useState(wallet.description ?? "");
  const [bankCode, setBankCode] = useState<BankCode | "">(wallet.bank_code ?? "");
  const [error, setError] = useState<string | null>(null);

  const sameGroupBanks =
    wallet.kind === "bank" && wallet.bank_code
      ? BANKS.filter((b) => bankGroup(b.value) === bankGroup(wallet.bank_code as BankCode))
      : [];

  const saveMutation = useMutation({
    mutationFn: () =>
      updateWallet(wallet.id, {
        label: label.trim(),
        description: description.trim() || null,
        ...(wallet.kind === "bank" ? { bank_code: bankCode || null } : {}),
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const dirty =
    label.trim() !== wallet.label ||
    (description.trim() || null) !== (wallet.description ?? null) ||
    (wallet.kind === "bank" && bankCode !== (wallet.bank_code ?? ""));

  return (
    <NeoCard>
      <p className="text-sm font-semibold mb-3">Editar cartera</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          saveMutation.mutate();
        }}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
      >
        <div>
          <FieldLabel>Nombre</FieldLabel>
          <NeoInput required maxLength={100} value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="lg:col-span-2">
          <FieldLabel>Descripción (opcional)</FieldLabel>
          <NeoInput
            maxLength={255}
            placeholder="De dónde viene este dinero, notas, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {wallet.kind === "bank" && (
          <div>
            <FieldLabel>País de origen</FieldLabel>
            <NeoSelect value={bankCode} onChange={(e) => setBankCode(e.target.value as BankCode)}>
              {sameGroupBanks.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </NeoSelect>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Solo se puede cambiar dentro del mismo país, o entre bancos multi-moneda.
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <NeoButton type="submit" variant="accent" disabled={!dirty || saveMutation.isPending}>
            Guardar cambios
          </NeoButton>
          <NeoButton type="button" onClick={onClose}>
            Cerrar
          </NeoButton>
        </div>
      </form>
      <ErrorText message={error} />
    </NeoCard>
  );
}

function WalletDangerZone({
  wallet,
  onDeleted,
  onClose,
}: {
  wallet: Wallet;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmLabel, setConfirmLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasBalance = Number(wallet.balance) !== 0;

  const deleteMutation = useMutation({
    mutationFn: () => deleteWallet(wallet.id),
    onSuccess: () => onDeleted(),
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const labelMatches = confirmLabel.trim() === wallet.label;

  function handleDelete() {
    // Segunda confirmación: además de escribir el nombre exacto, un diálogo final.
    if (!labelMatches) return;
    if (
      window.confirm(
        `Vas a eliminar la cartera "${wallet.label}" de forma permanente. Esta acción no se puede deshacer. ¿Continuar?`,
      )
    ) {
      deleteMutation.mutate();
    }
  }

  return (
    <NeoCard className="border-l-4 border-[var(--danger)]">
      <p className="text-sm font-semibold mb-1">Eliminar cartera "{wallet.label}"</p>
      <p className="text-[11px] text-[var(--text-secondary)] mb-3">
        Solo es posible si la cartera no tiene saldo (0 {wallet.currency}). La eliminación es permanente.
      </p>

      {hasBalance ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--danger)]">
            Esta cartera tiene saldo ({wallet.balance} {wallet.currency}). Retira o transfiere el dinero
            antes de poder eliminarla.
          </p>
          <NeoButton type="button" onClick={onClose} className="self-start">
            Cerrar
          </NeoButton>
        </div>
      ) : !open ? (
        <div className="flex gap-3">
          <NeoButton variant="danger" onClick={() => setOpen(true)}>
            Eliminar cartera
          </NeoButton>
          <NeoButton type="button" onClick={onClose}>
            Cerrar
          </NeoButton>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <FieldLabel>
              Escribe el nombre de la cartera (<strong>{wallet.label}</strong>) para confirmar
            </FieldLabel>
            <NeoInput
              value={confirmLabel}
              onChange={(e) => setConfirmLabel(e.target.value)}
              placeholder={wallet.label}
            />
          </div>
          <div className="flex gap-3">
            <NeoButton
              variant="danger"
              disabled={!labelMatches || deleteMutation.isPending}
              onClick={handleDelete}
            >
              Confirmar eliminación
            </NeoButton>
            <NeoButton type="button" onClick={onClose}>
              Cancelar
            </NeoButton>
          </div>
          <ErrorText message={error} />
        </div>
      )}
    </NeoCard>
  );
}
