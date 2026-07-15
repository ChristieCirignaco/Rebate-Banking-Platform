// Client-safe settings definitions: types, defaults, option lists, and the secret-field
// registry. No server imports here so forms can pull types/options. The DB read/write and
// secret encryption live in lib/settings/store.ts ("server-only").

export interface GeneralSettings {
  siteTitle: string;
  brandName: string;
  description: string;
  seoKeywords: string[];
  siteUrl: string;
  timezone: string;
  defaultCurrency: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  footerText: string;
}

export interface BrandingSettings {
  logoLight: string | null;
  logoDark: string | null;
  favicon: string | null;
  ogImage: string | null;
}

export type RecaptchaVersion = "v2" | "v3";
export type ChatProvider =
  | ""
  | "tawk"
  | "tidio"
  | "jivo"
  | "smartsupp"
  | "livechat"
  | "chatwoot";
export type AnalyticsProvider = "" | "ga4" | "gtm";

export interface PluginsSettings {
  recaptchaEnabled: boolean;
  recaptchaVersion: RecaptchaVersion;
  recaptchaSiteKey: string;
  recaptchaSecretKey: string; // secret (encrypted at rest)
  chatEnabled: boolean;
  chatProvider: ChatProvider;
  chatPropertyId: string;
  ipinfoEnabled: boolean;
  ipinfoToken: string; // secret (encrypted at rest)
  analyticsEnabled: boolean;
  analyticsProvider: AnalyticsProvider;
  analyticsMeasurementId: string;
}

export type ScreenLockUnit = "seconds" | "minutes" | "hours";

export interface SecuritySettings {
  require2faAdmins: boolean;
  require2faWithdrawals: boolean;
  forceEmailVerification: boolean;
  sessionLifetimeMinutes: number;
  passwordMinLength: number;
  passwordRequireMixedCase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  loginMaxAttempts: number;
  loginLockoutMinutes: number;
  screenLockEnabled: boolean;
  screenLockIdleValue: number;
  screenLockIdleUnit: ScreenLockUnit;
}

export type KycLevel = "basic" | "full";

export interface LimitsSettings {
  kycRequiredForWithdrawal: boolean;
  minKycLevel: KycLevel;
  withdrawalMin: number;
  withdrawalMax: number;
  withdrawalDailyLimit: number;
  depositMin: number;
  depositMax: number;
  makerCheckerThreshold: number;
}

export interface LegalSettings {
  termsUrl: string;
  privacyUrl: string;
  termsContent: string;
  privacyContent: string;
  socialFacebook: string;
  socialX: string;
  socialInstagram: string;
  socialLinkedin: string;
  socialYoutube: string;
  socialTiktok: string;
}

export interface SettingsGroups {
  general: GeneralSettings;
  branding: BrandingSettings;
  plugins: PluginsSettings;
  security: SecuritySettings;
  limits: LimitsSettings;
  legal: LegalSettings;
}

export type SettingsGroupKey = keyof SettingsGroups;

export const SETTINGS_DEFAULTS: SettingsGroups = {
  general: {
    siteTitle: "Rebate Bank",
    brandName: "Rebate Bank",
    description: "Turn everyday purchases into wallet cash.",
    seoKeywords: [],
    siteUrl: "",
    timezone: "UTC",
    defaultCurrency: "USD",
    supportEmail: "",
    supportPhone: "",
    address: "",
    fromName: "Rebate Bank",
    fromEmail: "",
    replyTo: "",
    footerText: "",
  },
  branding: { logoLight: null, logoDark: null, favicon: null, ogImage: null },
  plugins: {
    recaptchaEnabled: false,
    recaptchaVersion: "v2",
    recaptchaSiteKey: "",
    recaptchaSecretKey: "",
    chatEnabled: false,
    chatProvider: "",
    chatPropertyId: "",
    ipinfoEnabled: false,
    ipinfoToken: "",
    analyticsEnabled: false,
    analyticsProvider: "",
    analyticsMeasurementId: "",
  },
  security: {
    require2faAdmins: false,
    require2faWithdrawals: false,
    forceEmailVerification: false,
    sessionLifetimeMinutes: 60 * 24 * 7, // 7 days
    passwordMinLength: 8,
    passwordRequireMixedCase: false,
    passwordRequireNumber: false,
    passwordRequireSymbol: false,
    loginMaxAttempts: 5,
    loginLockoutMinutes: 15,
    screenLockEnabled: false,
    screenLockIdleValue: 15,
    screenLockIdleUnit: "minutes",
  },
  limits: {
    kycRequiredForWithdrawal: false,
    minKycLevel: "basic",
    withdrawalMin: 0,
    withdrawalMax: 0,
    withdrawalDailyLimit: 0,
    depositMin: 0,
    depositMax: 0,
    makerCheckerThreshold: 0,
  },
  legal: {
    termsUrl: "",
    privacyUrl: "",
    termsContent: "",
    privacyContent: "",
    socialFacebook: "",
    socialX: "",
    socialInstagram: "",
    socialLinkedin: "",
    socialYoutube: "",
    socialTiktok: "",
  },
};

// Fields whose stored value is encrypted at rest and never sent to the client in the clear.
export const SETTINGS_SECRET_FIELDS: Partial<Record<SettingsGroupKey, string[]>> = {
  plugins: ["recaptchaSecretKey", "ipinfoToken"],
};

// Live-chat providers offered in the Plugins tab.
export const CHAT_PROVIDERS: { value: ChatProvider; label: string }[] = [
  { value: "tawk", label: "Tawk.to" },
  { value: "tidio", label: "Tidio" },
  { value: "jivo", label: "JivoChat" },
  { value: "smartsupp", label: "Smartsupp" },
  { value: "livechat", label: "LiveChat" },
  { value: "chatwoot", label: "Chatwoot" },
];

export const SCREEN_LOCK_UNITS: { value: ScreenLockUnit; label: string }[] = [
  { value: "seconds", label: "Seconds" },
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
];

// Convert a screen-lock duration into milliseconds, clamped to [5s, 24h]. The floor stops
// a mis-set 0 locking on every event; the ceiling keeps the value inside setTimeout's
// 32-bit range (a larger delay would overflow and fire immediately).
export function screenLockMs(value: number, unit: ScreenLockUnit): number {
  const factor = unit === "hours" ? 3_600_000 : unit === "minutes" ? 60_000 : 1_000;
  const ms = Number.isFinite(value) ? Math.round(value * factor) : 0;
  return Math.min(24 * 3_600_000, Math.max(5_000, ms));
}
