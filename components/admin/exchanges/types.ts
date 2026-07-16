// Prisma-free type for the admin Exchange history UI (safe to import into client components).
export interface AdminExchangeRow {
  id: string;
  txnId: string;
  userName: string;
  userEmail: string;
  fromLabel: string;
  toLabel: string;
  rateLabel: string; // "1 USD = 0.96 EUR"
  createdAtLabel: string;
}
