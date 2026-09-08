import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAccount } from "../../api/endpoints";
import { PageHeader } from "../../components/ui";
import ExpensesTab from "./ExpensesTab";
import DashboardTab from "./DashboardTab";
import MembersTab from "./MembersTab";
import SettingsTab from "./SettingsTab";

const TABS = [
  { key: "expenses", label: "Gastos" },
  { key: "dashboard", label: "Dashboard" },
  { key: "members", label: "Miembros" },
  { key: "settings", label: "Ajustes" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AccountDetailPage() {
  const { accountId = "" } = useParams();
  const [tab, setTab] = useState<TabKey>("expenses");

  const { data: account } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => getAccount(accountId),
    enabled: !!accountId,
  });

  const isShared = account?.account_type === "shared";

  return (
    <div>
      <PageHeader
        title={account?.name ?? "Cuenta"}
        subtitle={isShared ? "Cuenta compartida" : "Cuenta personal"}
      />

      <div className="neo-flat p-1.5 flex gap-1 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded-[10px] whitespace-nowrap transition-colors ${
              tab === t.key ? "neo-pressed text-[var(--accent)] font-semibold" : "text-[var(--text-secondary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {account && tab === "expenses" && <ExpensesTab account={account} />}
      {account && tab === "dashboard" && <DashboardTab account={account} />}
      {account && tab === "members" && <MembersTab account={account} />}
      {account && tab === "settings" && <SettingsTab account={account} />}
    </div>
  );
}
