"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";

import { updateProfile } from "@/app/(app)/account/profile/actions";
import { authClient } from "@/lib/auth-client";
import { COUNTRIES } from "@/lib/countries";
import { toast } from "@/lib/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/account/settings-card";
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

// Mirrors the server's allowlist in app/api/user/avatar/route.ts — the route is the authority,
// this just gives an instant, friendlier rejection.
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export type ProfileInitial = {
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  countryCode: string;
  phone: string;
  gender: Gender;
  address: string;
  username: string;
  birthday: string; // yyyy-mm-dd, or "" when unset
  image: string; // served avatar URL, or "" when unset
};

function initials(first: string, last: string): string {
  const letters =
    `${first.trim()[0] ?? ""}${last.trim()[0] ?? ""}`.toUpperCase();
  return letters || "U";
}

export function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [countryCode, setCountryCode] = useState(initial.countryCode);
  const [phone, setPhone] = useState(initial.phone);
  const [gender, setGender] = useState<Gender>(initial.gender);
  const [address, setAddress] = useState(initial.address);
  const [username, setUsername] = useState(initial.username);
  const [birthday, setBirthday] = useState(initial.birthday);
  const [image, setImage] = useState(initial.image);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resending, setResending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
        username: username.trim().toLowerCase(),
        birthday,
        image,
      });
      if (result.ok) toast.success("Profile updated");
      else toast.error(result.error);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSaving(false);
  }

  // Upload the photo immediately (so the user sees it right away) but only stage the URL —
  // "Save changes" is what actually writes User.image, keeping every profile field on one
  // action behind one gate.
  async function onAvatarSelect(file: File | undefined) {
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      toast.error("Only PNG, JPEG or WEBP images are allowed.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be 2 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body,
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        url?: string;
        error?: string;
      } | null;
      if (!response.ok || !data?.ok || !data.url) {
        toast.error(data?.error ?? "Upload failed.");
      } else {
        setImage(data.url);
        toast.success("Photo uploaded. Save to apply.");
      }
    } catch {
      toast.error("Network error during upload.");
    }
    setUploading(false);
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
    <SettingsCard>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {/* Avatar — uploads on select, persists on save. */}
        <div className="flex items-center gap-4">
          <Avatar size="lg" className="size-16">
            {image ? <AvatarImage src={image} alt="" /> : null}
            <AvatarFallback className="bg-blue-600 text-sm font-semibold text-white">
              {initials(firstName, lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={saving || uploading}
              >
                {uploading
                  ? "Uploading…"
                  : image
                    ? "Change photo"
                    : "Upload photo"}
              </Button>
              {image ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setImage("")}
                  disabled={saving || uploading}
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              PNG, JPEG or WEBP. Max 2 MB.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                void onAvatarSelect(e.target.files?.[0]);
                // Reset so picking the SAME file again still fires a change event.
                e.target.value = "";
              }}
            />
          </div>
        </div>

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
          <Input
            id="email"
            value={initial.email}
            readOnly
            disabled
            className="opacity-80"
          />
          {!initial.emailVerified ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
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
            <Label htmlFor="username" className="text-sm font-semibold">
              Username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              autoComplete="username"
              spellCheck={false}
              disabled={saving}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              3–20 characters: lowercase letters, numbers or underscores.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="birthday" className="text-sm font-semibold">
              Date of Birth
            </Label>
            <Input
              id="birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country" className="text-sm font-semibold">
              Country
            </Label>
            <Select
              value={countryCode}
              onValueChange={setCountryCode}
              disabled={saving}
            >
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
    </SettingsCard>
  );
}
