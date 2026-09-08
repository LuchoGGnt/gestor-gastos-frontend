import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  createExpense,
  listSubcategories,
  listWallets,
  updateExpense,
  uploadVoucher,
} from "../../api/endpoints";
import type { ExpenseItemInput } from "../../api/endpoints";
import type { Account, Currency, Expense, ExpenseCategory } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { extractErrorMessage } from "../../api/client";
import { ErrorText, FieldLabel, NeoButton, NeoCard, NeoInput, NeoSelect } from "../../components/ui";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transporte: "Transporte",
  salud: "Salud",
  comida: "Comida",
  mercado: "Mercado",
  golosinas: "Golosinas",
  servicios: "Servicios",
};

type Zone = "equitable" | "custom";

interface ProductDraft {
  clientId: string;
  product_name: string;
  unit_price: string;
  quantity: string;
  zone: Zone;
  /** solo aplica en zona "custom": monto que paga cada miembro (puede ser uno solo) */
  customAmounts: Record<string, string>;
}

let nextClientId = 1;
function newClientId(): string {
  return `p${nextClientId++}`;
}

function round2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function emptyProduct(): ProductDraft {
  return {
    clientId: newClientId(),
    product_name: "",
    unit_price: "0",
    quantity: "1",
    zone: "equitable",
    customAmounts: {},
  };
}

function productsFromExpense(expense: Expense, allMemberIds: string[]): ProductDraft[] {
  return expense.items.map((item) => {
    const totalAmount = parseFloat(item.total_amount) || 0;
    const evenShare = allMemberIds.length > 0 ? totalAmount / allMemberIds.length : 0;
    const looksEquitable =
      item.splits.length === allMemberIds.length &&
      item.splits.every((s) => Math.abs(parseFloat(s.amount) - evenShare) <= 0.02);

    if (looksEquitable) {
      return {
        clientId: newClientId(),
        product_name: item.product_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        zone: "equitable" as Zone,
        customAmounts: {},
      };
    }
    const customAmounts: Record<string, string> = {};
    for (const split of item.splits) {
      customAmounts[split.user_id] = split.amount;
    }
    return {
      clientId: newClientId(),
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      zone: "custom" as Zone,
      customAmounts,
    };
  });
}

function productTotal(p: ProductDraft): number {
  return (parseFloat(p.unit_price) || 0) * (parseFloat(p.quantity) || 0);
}

/** Evita que un producto nuevo reciba un clientId ya usado por uno restaurado
 * de un borrador guardado (el contador es de módulo: sobrevive a la
 * navegación entre pestañas dentro de la misma sesión, pero no a un F5). */
function bumpClientIdCounterPast(products: ProductDraft[]) {
  for (const p of products) {
    const n = parseInt(p.clientId.replace(/^p/, ""), 10);
    if (!Number.isNaN(n) && n >= nextClientId) nextClientId = n + 1;
  }
}

interface DraftShape {
  category: ExpenseCategory;
  subcategoryId: string;
  description: string;
  expenseDate: string;
  currency: Currency;
  paidFromWalletId: string;
  products: ProductDraft[];
}

function draftKeyFor(accountId: string, editingExpenseId?: string): string {
  return editingExpenseId
    ? `gestor_gastos_edit_draft_${editingExpenseId}`
    : `gestor_gastos_new_draft_${accountId}`;
}

function loadDraft(key: string): DraftShape | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftShape;
    bumpClientIdCounterPast(parsed.products);
    return parsed;
  } catch {
    return null;
  }
}

function ProductChip({ clientId, label, amount }: { clientId: string; label: string; amount: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: clientId });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`neo-btn px-3 py-2 text-xs cursor-grab active:cursor-grabbing select-none touch-none ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <span className="font-medium">{label || "(sin nombre)"}</span>
      <span className="text-[var(--text-secondary)]"> · {amount}</span>
    </div>
  );
}

function DropZone({
  dropId,
  title,
  subtitle,
  children,
}: {
  dropId: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  return (
    <div
      ref={setNodeRef}
      className={`neo-pressed p-3 min-h-[90px] transition-shadow ${isOver ? "outline outline-2 outline-[var(--accent)]" : ""}`}
    >
      <p className="text-xs font-medium mb-0.5">{title}</p>
      <p className="text-[10px] text-[var(--text-secondary)] mb-2">{subtitle}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function NewExpenseForm({
  account,
  onDone,
  editingExpense,
}: {
  account: Account;
  onDone: () => void;
  editingExpense?: Expense;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isShared = account.account_type === "shared";
  const payerId = editingExpense?.paid_by_user_id ?? user?.id ?? "";
  const allMemberIds = account.members.map((m) => m.user_id);
  const isEditing = !!editingExpense;

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));

  const { data: subcategories } = useQuery({ queryKey: ["subcategories"], queryFn: listSubcategories });
  const { data: wallets } = useQuery({ queryKey: ["wallets"], queryFn: listWallets });

  const draftKey = draftKeyFor(account.id, editingExpense?.id);
  const [draft] = useState<DraftShape | null>(() => loadDraft(draftKey));

  const [category, setCategory] = useState<ExpenseCategory>(
    draft?.category ?? editingExpense?.category ?? "mercado",
  );
  const [subcategoryId, setSubcategoryId] = useState(draft?.subcategoryId ?? editingExpense?.subcategory_id ?? "");
  const [description, setDescription] = useState(draft?.description ?? editingExpense?.description ?? "");
  const [expenseDate, setExpenseDate] = useState(
    draft?.expenseDate ?? editingExpense?.expense_date ?? (() => new Date().toISOString().slice(0, 10))(),
  );
  const [currency, setCurrency] = useState<Currency>(draft?.currency ?? editingExpense?.currency ?? "CLP");
  const [paidFromWalletId, setPaidFromWalletId] = useState(
    draft?.paidFromWalletId ?? editingExpense?.paid_from_wallet_id ?? "",
  );
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [products, setProducts] = useState<ProductDraft[]>(() => {
    if (draft) return draft.products;
    return editingExpense ? productsFromExpense(editingExpense, allMemberIds) : [emptyProduct()];
  });
  const [error, setError] = useState<string | null>(null);

  // Autoguarda el progreso para que no se pierda si cambias de pestaña (Cartera, Pagos, etc.)
  // y vuelves — por ejemplo, si te quedaste sin saldo y necesitas revisar la cartera a mitad de carga.
  useEffect(() => {
    const snapshot: DraftShape = {
      category,
      subcategoryId,
      description,
      expenseDate,
      currency,
      paidFromWalletId,
      products,
    };
    localStorage.setItem(draftKey, JSON.stringify(snapshot));
  }, [draftKey, category, subcategoryId, description, expenseDate, currency, paidFromWalletId, products]);

  function clearDraft() {
    localStorage.removeItem(draftKey);
  }

  const categorySubcats = subcategories?.filter((s) => s.category === category) ?? [];
  const hasValidProducts = products.some((p) => p.product_name.trim() !== "");

  function memberLabel(userId: string): string {
    if (userId === user?.id) return "Yo";
    return account.members.find((m) => m.user_id === userId)?.user.full_name ?? "Miembro";
  }

  function updateProduct(clientId: string, patch: Partial<ProductDraft>) {
    setProducts((prev) => prev.map((p) => (p.clientId === clientId ? { ...p, ...patch } : p)));
  }

  function addProduct() {
    setProducts((prev) => [...prev, emptyProduct()]);
  }

  function removeProduct(clientId: string) {
    setProducts((prev) => prev.filter((p) => p.clientId !== clientId));
  }

  function updateCustomAmount(clientId: string, userId: string, value: string) {
    setProducts((prev) =>
      prev.map((p) =>
        p.clientId !== clientId ? p : { ...p, customAmounts: { ...p.customAmounts, [userId]: value } },
      ),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const clientId = String(active.id);
    const targetZone = String(over.id) as Zone;
    setProducts((prev) =>
      prev.map((p) => (p.clientId === clientId ? { ...p, zone: targetZone } : p)),
    );
  }

  function buildItemsPayload(): ExpenseItemInput[] {
    return products
      .filter((p) => p.product_name.trim() !== "")
      .map((p) => {
        const qty = parseFloat(p.quantity) || 0;
        const total = productTotal(p);

        if (!isShared) {
          return {
            product_name: p.product_name,
            unit_price: p.unit_price,
            quantity: p.quantity,
            total_amount: round2(total),
            splits: [{ user_id: payerId, quantity: p.quantity, amount: round2(total) }],
          };
        }

        let splits;
        if (p.zone === "equitable") {
          const n = allMemberIds.length;
          const shareQty = n > 0 ? qty / n : 0;
          const shareAmount = n > 0 ? total / n : 0;
          splits = allMemberIds.map((uid) => ({
            user_id: uid,
            quantity: round2(shareQty),
            amount: round2(shareAmount),
          }));
        } else {
          splits = Object.entries(p.customAmounts)
            .filter(([, amount]) => (parseFloat(amount) || 0) > 0)
            .map(([userId, amount]) => {
              const amt = parseFloat(amount) || 0;
              const proportion = total > 0 ? amt / total : 0;
              return {
                user_id: userId,
                quantity: round2(qty * proportion),
                amount: round2(amt),
              };
            });
        }

        return {
          product_name: p.product_name,
          unit_price: p.unit_price,
          quantity: p.quantity,
          total_amount: round2(total),
          splits,
        };
      });
  }

  function validateProducts(): string | null {
    if (!isShared) return null;
    for (const p of products) {
      if (p.product_name.trim() === "") continue;
      if (p.zone !== "custom") continue;
      const total = productTotal(p);
      const sum = Object.values(p.customAmounts).reduce((s, a) => s + (parseFloat(a) || 0), 0);
      if (Math.abs(sum - total) > 0.02) {
        return `"${p.product_name}": lo asignado (${round2(sum)}) no coincide con el total del producto (${round2(total)}).`;
      }
    }
    return null;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const expense = editingExpense
        ? await updateExpense(editingExpense.id, {
            paid_from_wallet_id: paidFromWalletId || null,
            category,
            subcategory_id: subcategoryId,
            description: description || undefined,
            expense_date: expenseDate,
            currency,
            items: buildItemsPayload(),
          })
        : await createExpense({
            account_id: account.id,
            paid_by_user_id: user!.id,
            paid_from_wallet_id: paidFromWalletId || null,
            category,
            subcategory_id: subcategoryId,
            description: description || undefined,
            expense_date: expenseDate,
            currency,
            items: buildItemsPayload(),
          });
      if (voucherFile) {
        await uploadVoucher(expense.id, voucherFile);
      }
      return expense;
    },
    onSuccess: () => {
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ["expenses", account.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", account.id] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      onDone();
    },
    onError: (err) => setError(extractErrorMessage(err)),
  });

  const equitableProducts = products.filter((p) => p.zone === "equitable" && p.product_name.trim() !== "");
  const customProducts = products.filter((p) => p.zone === "custom" && p.product_name.trim() !== "");

  return (
    <NeoCard>
      <p className="text-sm font-semibold mb-4">{isEditing ? "Editar gasto" : "Nuevo gasto"}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (!subcategoryId) {
            setError("Selecciona una subcategoría");
            return;
          }
          const validationError = validateProducts();
          if (validationError) {
            setError(validationError);
            return;
          }
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <FieldLabel>Fecha</FieldLabel>
            <NeoInput
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Categoría</FieldLabel>
            <NeoSelect
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as ExpenseCategory);
                setSubcategoryId("");
              }}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NeoSelect>
          </div>
          <div>
            <FieldLabel>Subcategoría</FieldLabel>
            <NeoSelect value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} required>
              <option value="">Selecciona...</option>
              {categorySubcats.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NeoSelect>
          </div>
          <div>
            <FieldLabel>Moneda</FieldLabel>
            <NeoSelect
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value as Currency);
                setPaidFromWalletId("");
              }}
            >
              <option value="CLP">CLP</option>
              <option value="PEN">PEN</option>
              <option value="USD">USD</option>
            </NeoSelect>
          </div>
        </div>

        <div>
          <FieldLabel>Descripción (opcional)</FieldLabel>
          <NeoInput value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Pagado desde (opcional)</FieldLabel>
            <NeoSelect value={paidFromWalletId} onChange={(e) => setPaidFromWalletId(e.target.value)}>
              <option value="">No descontar de ninguna cartera</option>
              {wallets?.filter((w) => w.currency === currency).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label} ({w.currency} {w.balance})
                </option>
              ))}
            </NeoSelect>
          </div>
          <div>
            <FieldLabel>Voucher / comprobante (opcional)</FieldLabel>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setVoucherFile(e.target.files?.[0] ?? null)}
              className="neo-input px-3 py-2 text-xs w-full file:mr-3 file:rounded-md file:border-0 file:bg-transparent file:text-[var(--accent)]"
            />
          </div>
        </div>

        {/* Paso 1: productos, entrada rápida sin reparto */}
        <div>
          <p className="text-sm font-semibold mb-2">Productos</p>
          <div className="flex flex-col gap-2">
            {products.map((p) => (
              <div
                key={p.clientId}
                className="neo-flat p-3 grid grid-cols-2 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-end"
              >
                <div className="col-span-2 sm:col-span-1">
                  <FieldLabel>Producto</FieldLabel>
                  <NeoInput
                    required
                    value={p.product_name}
                    onChange={(e) => updateProduct(p.clientId, { product_name: e.target.value })}
                  />
                </div>
                <div className="w-24">
                  <FieldLabel>Precio unit.</FieldLabel>
                  <NeoInput
                    type="number"
                    step="0.01"
                    required
                    value={p.unit_price}
                    onChange={(e) => updateProduct(p.clientId, { unit_price: e.target.value })}
                  />
                </div>
                <div className="w-20">
                  <FieldLabel>Cant.</FieldLabel>
                  <NeoInput
                    type="number"
                    step="0.01"
                    required
                    value={p.quantity}
                    onChange={(e) => updateProduct(p.clientId, { quantity: e.target.value })}
                  />
                </div>
                <div className="w-24">
                  <FieldLabel>Total</FieldLabel>
                  <div className="neo-pressed px-3 py-2.5 text-sm text-center">{round2(productTotal(p))}</div>
                </div>
                {products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(p.clientId)}
                    className="text-xs text-[var(--danger)] pb-2.5"
                  >
                    Quitar
                  </button>
                )}
              </div>
            ))}
          </div>
          <NeoButton type="button" onClick={addProduct} className="mt-3">
            + Agregar producto
          </NeoButton>
        </div>

        {/* Paso 2: reparto, aparece una vez que hay productos cargados */}
        {isShared && hasValidProducts && (
          <div>
            <p className="text-sm font-semibold mb-1">Reparto</p>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Arrastra cada producto a cómo se reparte. Lo "personalizado" puede pagarlo uno solo, varios o
              todos, tú decides el monto de cada quien.
            </p>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="grid sm:grid-cols-2 gap-3">
                <DropZone
                  dropId="equitable"
                  title="Repartir equitativamente"
                  subtitle={`Se divide en partes iguales entre los ${allMemberIds.length} miembros`}
                >
                  {equitableProducts.map((p) => (
                    <ProductChip
                      key={p.clientId}
                      clientId={p.clientId}
                      label={p.product_name}
                      amount={round2(productTotal(p))}
                    />
                  ))}
                </DropZone>
                <DropZone dropId="custom" title="Personalizado" subtitle="Tú decides cuánto paga cada quien">
                  {customProducts.map((p) => (
                    <ProductChip
                      key={p.clientId}
                      clientId={p.clientId}
                      label={p.product_name}
                      amount={round2(productTotal(p))}
                    />
                  ))}
                </DropZone>
              </div>
            </DndContext>

            {customProducts.length > 0 && (
              <div className="flex flex-col gap-3 mt-3">
                {customProducts.map((p) => {
                  const total = productTotal(p);
                  const sum = Object.values(p.customAmounts).reduce((s, a) => s + (parseFloat(a) || 0), 0);
                  return (
                    <div key={p.clientId} className="neo-flat p-3">
                      <p className="text-xs font-medium mb-2">
                        {p.product_name} — total {round2(total)}
                      </p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {account.members.map((m) => (
                          <div key={m.user_id} className="flex items-center gap-2">
                            <span className="text-xs w-20 truncate">{memberLabel(m.user_id)}</span>
                            <NeoInput
                              type="number"
                              step="0.01"
                              placeholder="0"
                              value={p.customAmounts[m.user_id] ?? ""}
                              onChange={(e) => updateCustomAmount(p.clientId, m.user_id, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                      <p
                        className={`text-[11px] mt-2 ${
                          Math.abs(sum - total) > 0.02 ? "text-[var(--danger)]" : "text-[var(--success)]"
                        }`}
                      >
                        Asignado: {round2(sum)} / {round2(total)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <ErrorText message={error} />
        <div className="flex gap-3">
          <NeoButton type="submit" variant="accent" disabled={mutation.isPending}>
            {isEditing ? "Guardar cambios" : "Guardar gasto"}
          </NeoButton>
          <NeoButton
            type="button"
            onClick={() => {
              clearDraft();
              onDone();
            }}
          >
            Cancelar
          </NeoButton>
        </div>
      </form>
    </NeoCard>
  );
}
