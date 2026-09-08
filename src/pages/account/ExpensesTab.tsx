import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteExpense, listExpenses, uploadVoucher } from "../../api/endpoints";
import type { Account, Expense } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { extractErrorMessage } from "../../api/client";
import { NeoButton } from "../../components/ui";
import NewExpenseForm from "./NewExpenseForm";

export default function ExpensesTab({ account }: { account: Account }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Si hay un borrador de gasto sin terminar para esta cuenta (p.ej. porque
  // te fuiste a revisar Cartera a mitad de carga), reabre el formulario solo.
  const [showForm, setShowForm] = useState(
    () => localStorage.getItem(`gestor_gastos_new_draft_${account.id}`) !== null,
  );
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses", account.id],
    queryFn: () => listExpenses(account.id),
  });

  const voucherInputRef = useRef<HTMLInputElement>(null);
  const [voucherTargetExpenseId, setVoucherTargetExpenseId] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: ({ expenseId, file }: { expenseId: string; file: File }) => uploadVoucher(expenseId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses", account.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (expenseId: string) => deleteExpense(expenseId),
    onSuccess: () => {
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ["expenses", account.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", account.id] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    },
    onError: (err) => setDeleteError(extractErrorMessage(err)),
  });

  function triggerVoucherUpload(expenseId: string) {
    setVoucherTargetExpenseId(expenseId);
    voucherInputRef.current?.click();
  }

  function handleVoucherSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && voucherTargetExpenseId) {
      uploadMutation.mutate({ expenseId: voucherTargetExpenseId, file });
    }
    e.target.value = "";
  }

  function handleDelete(expense: Expense) {
    if (window.confirm(`¿Eliminar el gasto de ${expense.expense_date}? Esta acción no se puede deshacer.`)) {
      deleteMutation.mutate(expense.id);
    }
  }

  const members = account.members;
  const formOpen = showForm || editingExpense !== null;

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={voucherInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleVoucherSelected}
      />

      {formOpen ? (
        <NewExpenseForm
          key={editingExpense?.id ?? "new"}
          account={account}
          editingExpense={editingExpense ?? undefined}
          onDone={() => {
            setShowForm(false);
            setEditingExpense(null);
          }}
        />
      ) : (
        <NeoButton variant="accent" onClick={() => setShowForm(true)} className="self-start">
          + Nuevo gasto
        </NeoButton>
      )}

      {deleteError && <p className="text-sm text-[var(--danger)]">{deleteError}</p>}

      {isLoading && <p className="text-sm text-[var(--text-secondary)]">Cargando...</p>}

      {expenses?.length === 0 && (
        <p className="text-sm text-[var(--text-secondary)]">Aún no hay gastos registrados.</p>
      )}

      {expenses && expenses.length > 0 && (
        <div className="flex flex-col gap-4">
          {expenses.map((expense) => {
            const canEdit = expense.paid_by_user_id === user?.id;
            return (
              <div key={expense.id} className="neo-flat overflow-hidden">
                <div className="px-4 py-3 neo-pressed flex flex-wrap justify-between items-center gap-2">
                  <p className="font-medium text-sm">
                    {expense.expense_date} — {expense.description || CATEGORY_LABEL(expense.category)}
                  </p>
                  <p className="text-sm font-semibold">
                    {expense.total_amount} {expense.currency}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-[var(--text-secondary)]">
                        <th className="px-4 py-3 whitespace-nowrap">Producto</th>
                        <th className="px-4 py-3 whitespace-nowrap text-right">Precio unit.</th>
                        <th className="px-4 py-3 whitespace-nowrap text-right">Cant.</th>
                        <th className="px-4 py-3 whitespace-nowrap text-right">Total</th>
                        {members.map((m) => (
                          <th key={m.user_id} className="px-4 py-3 whitespace-nowrap text-right" colSpan={2}>
                            {m.user_id === user?.id ? "Yo" : m.user.full_name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {expense.items.map((item, i) => (
                        <tr
                          key={item.id}
                          className={`border-t border-[var(--shadow-dark)]/25 ${i % 2 === 1 ? "bg-black/[0.02]" : ""}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">{item.product_name}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">{item.unit_price}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">{item.quantity}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">{item.total_amount}</td>
                          {members.map((m) => {
                            const split = item.splits.find((s) => s.user_id === m.user_id);
                            return (
                              <td
                                key={m.user_id}
                                className="px-4 py-3 text-right whitespace-nowrap text-[var(--text-secondary)]"
                                colSpan={2}
                              >
                                {split ? `${split.quantity} / ${split.amount}` : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-3 border-t border-[var(--shadow-dark)]/25 flex gap-5 flex-wrap items-center">
                  <button
                    type="button"
                    onClick={() => triggerVoucherUpload(expense.id)}
                    className="text-[var(--accent)] text-xs"
                  >
                    {expense.voucher_media_id ? "Reemplazar voucher" : "+ Adjuntar voucher"}
                  </button>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setEditingExpense(expense);
                        }}
                        className="text-[var(--accent)] text-xs"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(expense)}
                        className="text-[var(--danger)] text-xs"
                        disabled={deleteMutation.isPending}
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CATEGORY_LABEL(category: string): string {
  const labels: Record<string, string> = {
    transporte: "Transporte",
    salud: "Salud",
    comida: "Comida",
    mercado: "Mercado",
    golosinas: "Golosinas",
    servicios: "Servicios",
  };
  return labels[category] ?? category;
}
