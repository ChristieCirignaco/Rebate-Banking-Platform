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

// Auth policy (2FA, password rules, session lifetime, login throttling) lives in Better
// Auth config / its built-in rate limiter. What the app enforces itself: the admin Screen
// Lock and the "email OTP on login" gate (when on, every regular user must enter an emailed
// code after password sign-in before their dashboard unlocks).
export interface SecuritySettings {
  emailOtpOnLogin: boolean;
  screenLockEnabled: boolean;
  screenLockIdleValue: number;
  screenLockIdleUnit: ScreenLockUnit;
}

export type KycLevel = "basic" | "full";

export interface LimitsSettings {
  kycRequiredForWithdrawal: boolean;
  // Global equivalent of the per-user `kyc_verification` control: when on, EVERY user must hold
  // an approved KYC before any money action (deposit/send/exchange/request/voucher/withdraw).
  kycRequiredForTransactions: boolean;
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
  socialWhatsapp: string;
  socialTelegram: string;
}

export type ReferralTrigger = "signup" | "first_deposit";
export type ReferralRewardType = "fixed" | "percent";

export interface ReferralSettings {
  trigger: ReferralTrigger; // when an earning is created for the referrer
  rewardType: ReferralRewardType; // fixed amount, or a percent of the first deposit
  rewardAmount: number; // fixed: major-unit amount; percent: e.g. 5 = 5%
  rewardCurrency: string; // currency for a fixed reward
  allowedRules: string; // one rule per line — informational, admin-configurable
  prohibitedRules: string; // one rule per line
}

export interface SettingsGroups {
  general: GeneralSettings;
  branding: BrandingSettings;
  plugins: PluginsSettings;
  security: SecuritySettings;
  limits: LimitsSettings;
  legal: LegalSettings;
  referrals: ReferralSettings;
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
    emailOtpOnLogin: false,
    screenLockEnabled: false,
    screenLockIdleValue: 15,
    screenLockIdleUnit: "minutes",
  },
  limits: {
    kycRequiredForWithdrawal: false,
    kycRequiredForTransactions: false,
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
    socialWhatsapp: "",
    socialTelegram: "",
  },
  referrals: {
    trigger: "first_deposit",
    rewardType: "fixed",
    rewardAmount: 5,
    rewardCurrency: "USD",
    allowedRules:
      "Share your link on social media, blogs, and messaging apps.\nPromote it through your own marketing channels.\nInvite friends and family who will genuinely use the service.",
    prohibitedRules:
      "Creating multiple accounts on the same device to self-refer.\nBot-driven, fake, or incentivized-only signups.\nSpam or misleading promotion of your link.",
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
