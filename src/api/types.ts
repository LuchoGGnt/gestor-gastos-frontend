export type AccountType = "personal" | "shared";
export type AccountRole = "owner" | "member";
export type Currency = "PEN" | "USD" | "CLP";
export type WalletKind = "cash" | "bank";
export type BankCode = "pe" | "cl" | "global66" | "revolut" | "other_virtual";

export type ExpenseCategory = "transporte" | "salud" | "comida" | "mercado" | "golosinas" | "servicios";

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  profile_photo_media_id: string | null;
}

export interface UserPublic {
  id: string;
  username: string;
  full_name: string;
  profile_photo_media_id: string | null;
}

export type AccountMemberStatus = "pending" | "accepted" | "rejected";

export interface AccountMember {
  id: string;
  user_id: string;
  role: AccountRole;
  status: AccountMemberStatus;
  user: UserPublic;
}

export interface Invitation {
  account_id: string;
  account_name: string;
  invited_by: UserPublic;
  role: AccountRole;
}

export interface Account {
  id: string;
  name: string;
  description: string | null;
  account_type: AccountType;
  created_by_user_id: string;
  debt_due_date: string | null;
  members: AccountMember[];
}

export interface Wallet {
  id: string;
  user_id: string;
  label: string;
  description: string | null;
  currency: Currency;
  kind: WalletKind;
  bank_code: BankCode | null;
  balance: string;
}

export interface WalletUpdate {
  label?: string;
  description?: string | null;
  bank_code?: BankCode | null;
}

export interface Subcategory {
  id: string;
  category: ExpenseCategory;
  code: string;
  name: string;
}

export interface ExpenseItemSplit {
  id: string;
  user_id: string;
  quantity: string;
  amount: string;
}

export interface ExpenseItem {
  id: string;
  product_name: string;
  unit_price: string;
  quantity: string;
  total_amount: string;
  product_photo_media_id: string | null;
  splits: ExpenseItemSplit[];
}

export interface Expense {
  id: string;
  account_id: string;
  paid_by_user_id: string;
  paid_from_wallet_id: string | null;
  category: ExpenseCategory;
  subcategory_id: string;
  description: string | null;
  expense_date: string;
  currency: Currency;
  total_amount: string;
  voucher_media_id: string | null;
  items: ExpenseItem[];
}

export interface Settlement {
  id: string;
  account_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: string;
  currency: Currency;
  settlement_date: string;
  note: string | null;
  from_wallet_id: string | null;
  to_wallet_id: string | null;
  confirmed_at: string | null;
  confirmed_by_user_id: string | null;
}

export interface DashboardSummary {
  account_id: string;
  currency: Currency;
  total_spent: string;
  by_category: { category: ExpenseCategory; total_amount: string }[];
  balances: { user_id: string; net_balance: string }[];
  monthly_trend: { month: string; total_amount: string }[];
  top_products: { product_name: string; total_amount: string }[];
  daily_average: string;
}

export type WalletTransactionType =
  | "topup"
  | "conversion_out"
  | "conversion_in"
  | "expense_payment"
  | "settlement_in"
  | "settlement_out"
  | "adjustment"
  | "manual_expense"
  | "withdrawal_out"
  | "withdrawal_in";

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  wallet_label: string;
  currency: Currency;
  transaction_type: WalletTransactionType;
  amount: string;
  note: string | null;
  related_account_name: string | null;
  related_description: string | null;
  created_at: string;
}

export interface OtherMemberBalance {
  user_id: string;
  full_name: string;
  net_balance: string;
}

export interface MyBalance {
  account_id: string;
  account_name: string;
  currency: Currency;
  net_balance: string;
  debt_due_date: string | null;
  others: OtherMemberBalance[];
}
