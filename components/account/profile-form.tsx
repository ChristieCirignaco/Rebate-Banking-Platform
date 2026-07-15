"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";

import { updateProfile } from "@/app/account/profile/actions";
import { authClient } from "@/lib/auth-client";
import { COUNTRIES } from "@/lib/countries";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "unspecified", label: "Prefer not to say" },
] as const;

type Gender = "male" | "female" | "other" | "unspecified";

export type ProfileInitial = {
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  countryCode: string;
  phone: string;
  gender: Gender;
  address: string;
};

export function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [phone, setPhone] = useState(initial.phone);
  const [gender, setGender] = useState<Gender>(initial.gender);
  const [address, setAddress] = useState(initial.address);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required.");
      return;
    }
    if (!countryCode) {
      toast.error("Please select your country.");
      return;
    }
    setSaving(true);
    try {
      const result = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        countryCode,
        phone: phone.trim(),
        gender,
        address: address.trim(),
      });
      if (result.ok) toast.success("Profile updated");
      else toast.error(result.error);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSaving(false);
  }

  async function resendVerification() {
    if (resending) return;
    setResending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: initial.email,
        callbackURL: "/verify-email",
      });
      if (error) toast.error("Couldn't send the email. Please try again.");
      else toast.success("Verification email sent.");
    } catch {
      toast.error("Couldn't send the email. Please try again.");
    }
    setResending(false);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName" className="text-sm font-semibold">
                First Name
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName" className="text-sm font-semibold">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Email is read-only here, with a verification indicator. Being unverified never
              blocks access — it's informational, with a resend shortcut. */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="email" className="text-sm font-semibold">
                Email Address
              </Label>
              {initial.emailVerified ? (
                <Badge className="gap-1 border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  Verified
                </Badge>
              ) : (
                <Badge className="gap-1 border-transparent bg-amber-500/12 text-amber-700 dark:text-amber-400">
                  <TriangleAlert className="size-3" />
                  Unverified
                </Badge>
              )}
            </div>
            <Input id="email" value={initial.email} readOnly disabled className="opacity-80" />
            {!initial.emailVerified ? (
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground text-xs">
                  Your email isn&apos;t verified yet.
                </p>
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={resending}
                  className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60 dark:text-blue-400"
                >
                  {resending ? "Sending…" : "Resend verification email"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="country" className="text-sm font-semibold">
                Country
              </Label>
              <Select value={countryCode} onValueChange={setCountryCode} disabled={saving}>
                <SelectTrigger id="country" className="w-full">
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
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone" className="text-sm font-semibold">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gender" className="text-sm font-semibold">
                Gender
              </Label>
              <Select
                value={gender}
                onValueChange={(v) => setGender(v as Gender)}
                disabled={saving}
              >
                <SelectTrigger id="gender" className="w-full">
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
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address" className="text-sm font-semibold">
                Home Address
              </Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
