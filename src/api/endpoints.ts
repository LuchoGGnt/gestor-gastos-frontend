import { apiClient } from "./client";
import type {
  Account,
  AccountType,
  DashboardSummary,
  Expense,
  ExpenseCategory,
  Invitation,
  MyBalance,
  Settlement,
  Subcategory,
  User,
  Wallet,
  WalletTransaction,
} from "./types";

// --- Auth ---
export async function registerUser(payload: {
  email: string;
  username: string;
  full_name: string;
  password: string;
}): Promise<User> {
  const { data } = await apiClient.post("/auth/register", payload);
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get("/auth/me");
  return data;
}

export async function changePassword(current_password: string, new_password: string) {
  await apiClient.post("/auth/change-password", { current_password, new_password });
}

export async function uploadProfilePhoto(file: File): Promise<User> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post("/users/me/profile-photo", form);
  return data;
}

export async function deleteProfilePhoto(): Promise<User> {
  const { data } = await apiClient.delete("/users/me/profile-photo");
  return data;
}

export async function updateProfile(payload: { username?: string; full_name?: string }): Promise<User> {
  const { data } = await apiClient.patch("/users/me", payload);
  return data;
}

export async function forgotPassword(email: string) {
  await apiClient.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, new_password: string) {
  await apiClient.post("/auth/reset-password", { token, new_password });
}

// --- Accounts ---
export async function listAccounts(): Promise<Account[]> {
  const { data } = await apiClient.get("/accounts");
  return data;
}

export async function createAccount(name: string, account_type: AccountType): Promise<Account> {
  const { data } = await apiClient.post("/accounts", { name, account_type });
  return data;
}

export async function getAccount(accountId: string): Promise<Account> {
  const { data } = await apiClient.get(`/accounts/${accountId}`);
  return data;
}

export async function updateAccount(
  accountId: string,
  payload: { name?: string; description?: string | null; account_type?: AccountType },
): Promise<Account> {
  const { data } = await apiClient.patch(`/accounts/${accountId}`, payload);
  return data;
}

export async function deleteAccount(accountId: string): Promise<void> {
  await apiClient.delete(`/accounts/${accountId}`);
}

export async function addMember(accountId: string, identifier: string) {
  const { data } = await apiClient.post(`/accounts/${accountId}/members`, { identifier, role: "member" });
  return data;
}

export async function setDebtDueDate(accountId: string, dueDate: string | null): Promise<Account> {
  const { data } = await apiClient.patch(`/accounts/${accountId}/debt-due-date`, { debt_due_date: dueDate });
  return data;
}

export async function listInvitations(): Promise<Invitation[]> {
  const { data } = await apiClient.get("/accounts/invitations");
  return data;
}

export async function respondInvitation(accountId: string, accept: boolean) {
  await apiClient.post(`/accounts/invitations/${accountId}/respond`, { accept });
}

// --- Categories ---
export async function listSubcategories(): Promise<Subcategory[]> {
  const { data } = await apiClient.get("/categories/subcategories");
  return data;
}

// --- Wallets ---
export async function listWallets(): Promise<Wallet[]> {
  const { data } = await apiClient.get("/wallets");
  return data;
}

export async function createWallet(payload: {
  label: string;
  currency: string;
  kind: string;
  bank_code?: string | null;
  initial_balance?: string;
}): Promise<Wallet> {
  const { data } = await apiClient.post("/wallets", payload);
  return data;
}

export async function updateWallet(
  walletId: string,
  payload: { label?: string; description?: string | null; bank_code?: string | null },
): Promise<Wallet> {
  const { data } = await apiClient.patch(`/wallets/${walletId}`, payload);
  return data;
}

export async function deleteWallet(walletId: string): Promise<void> {
  await apiClient.delete(`/wallets/${walletId}`);
}

export async function topUpWallet(walletId: string, amount: string, note?: string) {
  const { data } = await apiClient.post(`/wallets/${walletId}/top-up`, { amount, note });
  return data;
}

export async function withdrawFromWallet(
  bankWalletId: string,
  payload: { cash_wallet_id: string; amount_withdrawn: string; amount_received: string; note?: string },
): Promise<Wallet> {
  const { data } = await apiClient.post(`/wallets/${bankWalletId}/withdraw`, payload);
  return data;
}

export async function registerManualExpense(walletId: string, amount: string, note?: string) {
  const { data } = await apiClient.post(`/wallets/${walletId}/manual-expense`, { amount, note });
  return data;
}

export async function listWalletTransactions(walletId?: string): Promise<WalletTransaction[]> {
  const { data } = await apiClient.get("/wallets/transactions", {
    params: walletId ? { wallet_id: walletId } : {},
  });
  return data;
}

// --- Expenses ---
export interface ExpenseItemSplitInput {
  user_id: string;
  quantity: string;
  amount: string;
}

export interface ExpenseItemInput {
  product_name: string;
  unit_price: string;
  quantity: string;
  total_amount: string;
  splits: ExpenseItemSplitInput[];
}

export async function createExpense(payload: {
  account_id: string;
  paid_by_user_id: string;
  paid_from_wallet_id?: string | null;
  category: ExpenseCategory;
  subcategory_id: string;
  description?: string;
  expense_date: string;
  currency: string;
  items: ExpenseItemInput[];
}): Promise<Expense> {
  const { data } = await apiClient.post("/expenses", payload);
  return data;
}

export interface ExpenseUpdateInput {
  paid_from_wallet_id?: string | null;
  category: ExpenseCategory;
  subcategory_id: string;
  description?: string;
  expense_date: string;
  currency: string;
  items: ExpenseItemInput[];
}

export async function updateExpense(expenseId: string, payload: ExpenseUpdateInput): Promise<Expense> {
  const { data } = await apiClient.put(`/expenses/${expenseId}`, payload);
  return data;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await apiClient.delete(`/expenses/${expenseId}`);
}

export async function listExpenses(
  accountId: string,
  filters: {
    date_from?: string;
    date_to?: string;
    category?: string;
    shared_with_user_id?: string;
    owner_user_id?: string;
  } = {},
): Promise<Expense[]> {
  const { data } = await apiClient.get("/expenses", { params: { account_id: accountId, ...filters } });
  return data;
}

export async function uploadVoucher(expenseId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post(`/expenses/${expenseId}/voucher`, form);
  return data;
}

// --- Settlements ---
export async function createSettlement(payload: {
  account_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: string;
  currency: string;
  settlement_date: string;
  note?: string;
  from_wallet_id?: string | null;
}): Promise<Settlement> {
  const { data } = await apiClient.post("/settlements", payload);
  return data;
}

export async function listSettlements(accountId: string): Promise<Settlement[]> {
  const { data } = await apiClient.get("/settlements", { params: { account_id: accountId } });
  return data;
}

export async function confirmSettlement(settlementId: string, toWalletId?: string | null): Promise<Settlement> {
  const { data } = await apiClient.post(`/settlements/${settlementId}/confirm`, {
    to_wallet_id: toWalletId ?? null,
  });
  return data;
}

export async function listMyBalances(): Promise<MyBalance[]> {
  const { data } = await apiClient.get("/settlements/my-balances");
  return data;
}

// --- Dashboard & reports ---
export async function getDashboard(
  accountId: string,
  currency: string,
  filters: {
    date_from?: string;
    date_to?: string;
    shared_with_user_id?: string;
    owner_user_id?: string;
    category?: string;
  } = {},
): Promise<DashboardSummary> {
  const { data } = await apiClient.get(`/dashboard/${accountId}`, { params: { currency, ...filters } });
  return data;
}

const REPORT_EXTENSIONS: Record<"csv" | "excel" | "pdf", string> = {
  csv: "csv",
  excel: "xlsx",
  pdf: "pdf",
};

export async function downloadReport(
  accountId: string,
  fmt: "csv" | "excel" | "pdf",
  filters: { date_from?: string; date_to?: string } = {},
) {
  const { data } = await apiClient.get(`/reports/${accountId}/export`, {
    params: { fmt, ...filters },
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte_gastos.${REPORT_EXTENSIONS[fmt]}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * `<img src>` no puede mandar el header Authorization, así que las imágenes
 * protegidas (fotos de perfil, vouchers) se traen como blob autenticado.
 */
export async function fetchMediaBlobUrl(mediaId: string): Promise<string> {
  const { data } = await apiClient.get(`/media/${mediaId}`, { responseType: "blob" });
  return URL.createObjectURL(data);
}
