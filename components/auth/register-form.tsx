"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { registerUser } from "@/app/register/actions";
import { COUNTRIES, DEFAULT_COUNTRY_CODE, getCountryByCode } from "@/lib/countries";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  AUTH_FIELD_CLASS,
  AUTH_SELECT_TRIGGER_CLASS,
  AuthShell,
  AuthSubmitButton,
} from "@/components/auth/auth-shell";
import { TermsCheckbox } from "@/components/auth/terms-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "unspecified", label: "Prefer not to say" },
] as const;

type FieldErrors = Partial<
  Record<
    | "firstName"
    | "lastName"
    | "email"
    | "phone"
    | "gender"
    | "address"
    | "password"
    | "confirm"
    | "terms",
    string
  >
>;

// Public sign-up. Collects the reference-site fields (name, email, country, intl phone,
// password) plus gender + home address, and a Terms & Conditions acceptance. On submit it
// creates a `pending` account (no session) and sends a verification email; the user then
// verifies and waits for manual admin approval. `termsContent` backs the T&C dialog.
export function RegisterForm({
  logoUrl,
  termsContent,
  refCode,
}: {
  logoUrl?: string | null;
  termsContent: string;
  refCode?: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState<string>(DEFAULT_COUNTRY_CODE);
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>(DEFAULT_COUNTRY_CODE);
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<string>("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const phoneCountry = useMemo(
    () => getCountryByCode(phoneCountryCode) ?? getCountryByCode(DEFAULT_COUNTRY_CODE)!,
    [phoneCountryCode],
  );

  function clearError(key: keyof FieldErrors) {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  // Selecting the main country also moves the phone dial code to match (a sensible default the
  // user can still override with the phone's own country picker).
  function onCountryChange(code: string) {
    setCountryCode(code);
    setPhoneCountryCode(code);
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!firstName.trim()) next.firstName = "First name is required.";
    if (!lastName.trim()) next.lastName = "Last name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    if (phone.replace(/\D/g, "").length < 6) next.phone = "Enter a valid phone number.";
    if (!gender) next.gender = "Please select an option.";
    if (address.trim().length < 3) next.address = "Enter your home address.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    else if (password.length > 128) next.password = "Password must be at most 128 characters.";
    if (confirm !== password) next.confirm = "Passwords do not match.";
    if (!acceptedTerms) next.terms = "Please accept the Terms and Conditions.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading || !validate()) return;
    setIsLoading(true);

    const timezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : undefined;

    try {
      const result = await registerUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        countryCode,
        dialCode: phoneCountry.dialCode,
        phone: phone.trim(),
        gender: gender as "male" | "female" | "other" | "unspecified",
        address: address.trim(),
        timezone,
        ...(refCode ? { ref: refCode } : {}),
        acceptedTerms: true,
      });
      if (result.ok) {
        // Account created (pending, no session). Continue to the optional product-upload step;
        // a full-load navigation guarantees the continuation cookie set by the action is sent.
        window.location.href = "/register/products";
        return; // keep the spinner while the page unloads
      }
      toast.error(result.error);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setIsLoading(false);
  }

  const footer = (
    <>
      Already have an account?{" "}
      <Link href="/login" className="font-bold text-white hover:underline">
        Login Here
      </Link>
    </>
  );

  return (
    <AuthShell logoUrl={logoUrl} footer={footer}>
      <div className="mb-6 flex flex-col gap-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Create an Account</h1>
        <p className="text-muted-foreground text-sm">Join us and start your journey</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First Name" htmlFor="firstName" error={errors.firstName}>
            <Input
              id="firstName"
              autoComplete="given-name"
              placeholder="John"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                clearError("firstName");
              }}
              disabled={isLoading}
              aria-invalid={!!errors.firstName}
              className={AUTH_FIELD_CLASS}
            />
          </Field>
          <Field label="Last Name" htmlFor="lastName" error={errors.lastName}>
            <Input
              id="lastName"
              autoComplete="family-name"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                clearError("lastName");
              }}
              disabled={isLoading}
              aria-invalid={!!errors.lastName}
              className={AUTH_FIELD_CLASS}
            />
          </Field>
        </div>

        <Field label="Email Address" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            disabled={isLoading}
            aria-invalid={!!errors.email}
            className={AUTH_FIELD_CLASS}
          />
        </Field>

        <Field label="Country" htmlFor="country">
          <Select value={countryCode} onValueChange={onCountryChange} disabled={isLoading}>
            <SelectTrigger id="country" className={AUTH_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="Choose a country" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="mr-2">{c.flag}</span>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Phone Number" htmlFor="phone" error={errors.phone}>
          {/* Grouped control: dial-code picker + number share one bordered field. The wrapper
              carries the border/background/focus ring; the inner Select + Input are stripped
              bare so they read as a single input. */}
          <div
            className={cn(
              "flex h-12 items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 transition-colors",
              "focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20",
              "dark:border-slate-700 dark:bg-slate-800/40 dark:focus-within:bg-slate-800",
              isLoading && "opacity-70",
            )}
          >
            <Select
              value={phoneCountryCode}
              onValueChange={setPhoneCountryCode}
              disabled={isLoading}
            >
              <SelectTrigger
                aria-label="Phone country code"
                className="!h-12 w-auto shrink-0 gap-1 rounded-none border-0 bg-transparent pr-2 pl-3 shadow-none focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
              >
                <span className="flex items-center gap-1">
                  <span>{phoneCountry.flag}</span>
                  <span className="text-sm">{phoneCountry.dialCode}</span>
                </span>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="mr-2">{c.flag}</span>
                    {c.name} ({c.dialCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span
              aria-hidden
              className="h-6 w-px shrink-0 bg-slate-200 dark:bg-slate-700"
            />
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="0802 123 4567"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearError("phone");
              }}
              disabled={isLoading}
              aria-invalid={!!errors.phone}
              className="h-full flex-1 rounded-none border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Gender" htmlFor="gender" error={errors.gender}>
            <Select
              value={gender}
              onValueChange={(v) => {
                setGender(v);
                clearError("gender");
              }}
              disabled={isLoading}
            >
              <SelectTrigger id="gender" className={AUTH_SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Home Address" htmlFor="address" error={errors.address}>
            <Input
              id="address"
              autoComplete="street-address"
              placeholder="123 Main St, City"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                clearError("address");
              }}
              disabled={isLoading}
              aria-invalid={!!errors.address}
              className={AUTH_FIELD_CLASS}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor="password" error={errors.password}>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError("password");
                }}
                disabled={isLoading}
                aria-invalid={!!errors.password}
                className={cn(AUTH_FIELD_CLASS, "pr-11")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirm Password" htmlFor="confirm" error={errors.confirm}>
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                clearError("confirm");
              }}
              disabled={isLoading}
              aria-invalid={!!errors.confirm}
              className={AUTH_FIELD_CLASS}
            />
          </Field>
        </div>

        <TermsCheckbox
          checked={acceptedTerms}
          onCheckedChange={(v) => {
            setAcceptedTerms(v);
            clearError("terms");
          }}
          termsContent={termsContent}
          disabled={isLoading}
          error={errors.terms}
        />

        <AuthSubmitButton loading={isLoading} loadingLabel="Creating account…">
          Create Account
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
}

// Shared label + error wrapper so every field looks identical.
function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
