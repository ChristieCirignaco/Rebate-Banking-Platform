export type ActivationCodeType = "admin_created" | "user_entered";
export type ActivationCodeStatus = "active" | "suspended";

export interface ActivationCodeListItem {
  id: string;
  code: string;
  type: ActivationCodeType;
  status: ActivationCodeStatus;
  usageCount: number;
  createdByName: string | null; // null -> shown as "System"
  notes: string | null;
  createdAt: string;
}

export interface ActivationCodeListResult {
  rows: ActivationCodeListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActivationCodeListParams {
  status?: ActivationCodeStatus | "all";
  type?: ActivationCodeType | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ActivationCodeRecentUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  usedAt: string;
}

export interface ActivationCodeDetail {
  id: string;
  code: string;
  type: ActivationCodeType;
  status: ActivationCodeStatus;
  usageCount: number;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  recentUsers: ActivationCodeRecentUser[];
}

export interface CreateActivationCodePayload {
  code: string;
  status: ActivationCodeStatus;
  notes?: string;
}
