"use client";

import type { FormEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Gender, UserDetail } from "../types";

// Mirrors the server allowlist in app/api/admin/avatar/route.ts — the route is the authority;
// this just gives an instant, friendlier rejection.
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function UserInfoTab({
  user,
  onUpdate,
  onChangeAvatar,
}: {
  user: UserDetail;
  onUpdate: (values: Partial<UserDetail>) => void;
  // Persists the new avatar URL to this user and reports success (view runs the server action).
  onChangeAvatar: (url: string) => Promise<boolean>;
}) {
  const [values, setValues] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    gender: user.gender,
    birthday: user.birthday,
    address: user.address,
  });
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<typeof values>) =>
    setValues((current) => ({ ...current, ...patch }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUpdate(values);
  }

  // Upload the chosen photo to the admin media route, then persist its URL to this user. The
  // avatar changes on its own — it isn't tied to the "Update Information" button.
  async function onAvatarSelect(file: File | undefined) {
    if (!file || uploading) return;
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
      const response = await fetch("/api/admin/avatar", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; url?: string; error?: string }
        | null;
      if (!response.ok || !data?.ok || !data.url) {
        toast.error(data?.error ?? "Upload failed.");
      } else if (await onChangeAvatar(data.url)) {
        setAvatarUrl(data.url);
      }
    } catch {
      toast.error("Network error during upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="size-20">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={user.name} />
                ) : null}
                <AvatarFallback className="text-lg">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                title="Change avatar"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -right-1 -bottom-1 size-8 rounded-full"
              >
                <Camera className="size-4" />
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  void onAvatarSelect(event.target.files?.[0]);
                  // Reset so re-picking the SAME file still fires a change event.
                  event.target.value = "";
                }}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {uploading ? "Uploading…" : "Click camera icon to change avatar. PNG, JPEG or WEBP, max 2 MB."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First Name">
              <Input
                value={values.firstName}
                onChange={(e) => set({ firstName: e.target.value })}
              />
            </Field>
            <Field label="Last Name">
              <Input
                value={values.lastName}
                onChange={(e) => set({ lastName: e.target.value })}
              />
            </Field>
            <Field label="Username">
              <Input value={user.username} readOnly disabled />
            </Field>
            <Field label="Email Address">
              <Input value={user.email} readOnly disabled />
            </Field>
            <Field label="Phone">
              <Input
                value={values.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
            </Field>
            <Field label="Gender">
              <Select
                value={values.gender}
                onValueChange={(value) => set({ gender: value as Gender })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="unspecified">Unspecified</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Birthday">
              <Input
                type="date"
                value={values.birthday}
                onChange={(e) => set({ birthday: e.target.value })}
              />
            </Field>
            <Field label="Country">
              <Input value={user.country} readOnly disabled />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={values.address}
                onChange={(e) => set({ address: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Update Information</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
