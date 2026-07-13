import type {
  AccountStatus,
  AdminUser,
  EmailStatus,
  KycStatus,
  SelectOption,
  UserRole,
} from "./types";

// -----------------------------------------------------------------------------
// Mock users for the list page. Replace `mockUsers` with a real query to wire the
// API; the option lists below feed the filter dropdowns.
// -----------------------------------------------------------------------------

const isoHoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 3600 * 1000).toISOString();

const NAMES = [
  "Amara Okafor",
  "Liam Brown",
  "Sofia Rossi",
  "Chen Wei",
  "Noah Smith",
  "Fatima Zahra",
  "Diego Martinez",
  "Yuki Tanaka",
  "Olivia Johnson",
  "Mohammed Al-Farsi",
  "Emma Wilson",
  "Raj Patel",
  "Isabella Garcia",
  "Kwame Mensah",
  "Hannah Lee",
  "Lucas Silva",
  "Aisha Bello",
  "Mateo Gonzalez",
  "Grace Nakamura",
  "Omar Haddad",
  "Chloe Dubois",
  "Ivan Petrov",
];

const ROLES: UserRole[] = [
  "user",
  "admin",
  "user",
  "user",
  "superadmin",
  "user",
  "user",
];
const ACCOUNT_STATUSES: AccountStatus[] = [
  "active",
  "active",
  "suspended",
  "active",
  "pending",
  "active",
];
const KYC_STATUSES: KycStatus[] = [
  "approved",
  "pending",
  "not_submitted",
  "approved",
  "rejected",
  "approved",
  "pending",
];
const EMAIL_STATUSES: EmailStatus[] = [
  "verified",
  "verified",
  "unverified",
  "verified",
  "unverified",
];
const KYC_DOCS = ["Passport", "National ID", "Driver's License"];

function toUsername(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, "_");
}

export const mockUsers: AdminUser[] = NAMES.map((name, i) => {
  const kycStatus = KYC_STATUSES[i % KYC_STATUSES.length];
  const username = toUsername(name);
  return {
    id: `usr_${(i + 1).toString().padStart(3, "0")}`,
    name,
    username,
    role: ROLES[i % ROLES.length],
    accountStatus: ACCOUNT_STATUSES[i % ACCOUNT_STATUSES.length],
    email: `${username}@example.com`,
    emailStatus: EMAIL_STATUSES[i % EMAIL_STATUSES.length],
    kycDocument:
      kycStatus === "not_submitted" ? undefined : KYC_DOCS[i % KYC_DOCS.length],
    kycStatus,
    joinedAt: isoHoursAgo(6 + i * 17),
    codeUsed:
      i % 3 === 0
        ? `RB-${(4096 + i * 137).toString(36).toUpperCase()}`
        : undefined,
    lastLogin: i % 5 === 0 ? undefined : isoHoursAgo(1 + i * 3),
    onlineStatus: i % 4 === 0 ? "online" : "offline",
  };
});

export const ROLE_OPTIONS: SelectOption[] = [
  { value: "all", label: "All roles" },
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Superadmin" },
];

export const ACCOUNT_STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "pending", label: "Pending" },
];

export const KYC_OPTIONS: SelectOption[] = [
  { value: "all", label: "All KYC" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "not_submitted", label: "Not submitted" },
  { value: "rejected", label: "Rejected" },
];

export const EMAIL_OPTIONS: SelectOption[] = [
  { value: "all", label: "All emails" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
];
