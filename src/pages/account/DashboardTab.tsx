import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { downloadReport, getDashboard } from "../../api/endpoints";
import type { Account, Currency, ExpenseCategory } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { FieldLabel, NeoButton, NeoCard, NeoInput, NeoSelect, PageHeader } from "../../components/ui";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transporte: "Transporte",
  salud: "Salud",
  comida: "Comida",
  mercado: "Mercado",
  golosinas: "Golosinas",
  servicios: "Servicios",
};

export default function DashboardTab({ account }: { account: Account }) {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<Currency>("CLP");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sharedWith, setSharedWith] = useState("");
  const [owner, setOwner] = useState("");
  const [category, setCategory] = useState("");

  const filters = {
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    shared_with_user_id: sharedWith || undefined,
    owner_user_id: owner || undefined,
    category: category || undefined,
  };

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard", account.id, currency, filters],
    queryFn: () => getDashboard(account.id, currency, filters),
  });

  const chartData =
    summary?.by_category.map((c) => ({
      category: CATEGORY_LABELS[c.category],
      total: parseFloat(c.total_amount),
    })) ?? [];

  const trendData =
    summary?.monthly_trend.map((m) => ({ month: m.month, total: parseFloat(m.total_amount) })) ?? [];

  function memberName(userId: string): string {
    if (userId === user?.id) return "Yo";
    return account.members.find((m) => m.user_id === userId)?.user.full_name ?? "Miembro";
  }

  return (
    <div className="flex flex-col gap-4">
      <NeoCard>
        <p className="text-sm font-semibold mb-3">Filtros</p>
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <FieldLabel>Moneda</FieldLabel>
            <NeoSelect value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              <option value="CLP">CLP</option>
              <option value="PEN">PEN</option>
              <option value="USD">USD</option>
            </NeoSelect>
          </div>
          <div>
            <FieldLabel>Desde</FieldLabel>
            <NeoInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Hasta</FieldLabel>
            <NeoInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Compartido con</FieldLabel>
            <NeoSelect value={sharedWith} onChange={(e) => setSharedWith(e.target.value)}>
              <option value="">Todos</option>
              {account.members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {memberName(m.user_id)}
                </option>
              ))}
            </NeoSelect>
          </div>
          <div>
            <FieldLabel>Dueño del gasto</FieldLabel>
            <NeoSelect value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">Todos</option>
              {account.members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {memberName(m.user_id)}
                </option>
              ))}
            </NeoSelect>
          </div>
          <div className="sm:col-span-3 lg:col-span-2">
            <FieldLabel>Categoría</FieldLabel>
            <NeoSelect value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NeoSelect>
          </div>
        </div>
      </NeoCard>

      {isLoading && <p className="text-sm text-[var(--text-secondary)]">Cargando...</p>}

      {summary && (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <NeoCard>
              <p className="text-xs text-[var(--text-secondary)]">Total gastado</p>
              <p className="text-2xl font-semibold mt-1">
                {summary.total_spent} {currency}
              </p>
            </NeoCard>
            <NeoCard>
              <p className="text-xs text-[var(--text-secondary)]">Promedio diario</p>
              <p className="text-2xl font-semibold mt-1">
                {summary.daily_average} {currency}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                Sobre el rango de fechas filtrado (o el rango real de los gastos si no filtraste fechas).
              </p>
            </NeoCard>
            <NeoCard>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Saldo neto</p>
              <p className="text-[11px] text-[var(--text-secondary)] mb-2">
                Lo que cada quien debe o le deben dentro de esta cuenta, después de restar los pagos ya
                confirmados por quien los recibió.
              </p>
              {summary.balances.map((b) => (
                <p key={b.user_id} className="text-sm">
                  {memberName(b.user_id)}:{" "}
                  <span className={parseFloat(b.net_balance) >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                    {parseFloat(b.net_balance) >= 0 ? "le deben " : "debe "}
                    {Math.abs(parseFloat(b.net_balance)).toFixed(2)}
                  </span>
                </p>
              ))}
            </NeoCard>
          </div>

          <NeoCard>
            <p className="text-sm font-semibold mb-4">Gasto por categoría</p>
            {chartData.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Sin datos para este filtro.</p>
            ) : (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--shadow-dark)" />
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        background: "var(--surface)",
                        border: "none",
                        borderRadius: 12,
                        color: "var(--text-primary)",
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="var(--accent)"
                      radius={[8, 8, 0, 0]}
                      activeBar={{ fill: "var(--accent-soft)" }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </NeoCard>

          <NeoCard>
            <p className="text-sm font-semibold mb-1">Tendencia mensual</p>
            <p className="text-[11px] text-[var(--text-secondary)] mb-4">
              Últimos 12 meses (según los filtros de compartido/dueño/categoría, sin importar el rango de
              fechas elegido arriba).
            </p>
            {trendData.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Sin datos.</p>
            ) : (
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--shadow-dark)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                    <Tooltip
                      cursor={{ stroke: "var(--accent-soft)" }}
                      contentStyle={{
                        background: "var(--surface)",
                        border: "none",
                        borderRadius: 12,
                        color: "var(--text-primary)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={{ fill: "var(--accent)", r: 3 }}
                      activeDot={{ fill: "var(--accent-soft)", r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </NeoCard>

          <NeoCard>
            <p className="text-sm font-semibold mb-4">Top productos</p>
            {summary.top_products.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Sin datos para este filtro.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {summary.top_products.map((p, i) => (
                  <li key={p.product_name} className="neo-flat px-4 py-2.5 text-sm flex justify-between">
                    <span>
                      <span className="text-[var(--text-secondary)] mr-2">#{i + 1}</span>
                      {p.product_name}
                    </span>
                    <span className="font-semibold">
                      {p.total_amount} {currency}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </NeoCard>

          <NeoCard>
            <PageHeader title="Exportar reporte" />
            <div className="flex gap-3 flex-wrap">
              <NeoButton onClick={() => downloadReport(account.id, "excel", filters)}>Excel</NeoButton>
              <NeoButton onClick={() => downloadReport(account.id, "csv", filters)}>CSV</NeoButton>
              <NeoButton onClick={() => downloadReport(account.id, "pdf", filters)}>PDF</NeoButton>
            </div>
          </NeoCard>
        </>
      )}
    </div>
  );
}
