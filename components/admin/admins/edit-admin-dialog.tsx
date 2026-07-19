"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, ShieldAlert } from "lucide-react";

import { updateAdminInfo } from "@/app/admin/users/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type { AdminAccount } from "./types";

// Splits a single display name into first/last for editing, mirroring how
// app/admin/users/[id]/actions.ts's updateUserInfo joins them back on save.
function splitName(name: string): { firstName: string; lastName: string } {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  return { firstName: firstName ?? "", lastName: rest.join(" ") };
}

export function EditAdminDialog({ admin }: { admin: AdminAccount }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(() => ({
    ...splitName(admin.name),
    phone: admin.phone ?? "",
    gender: admin.gender || "unspecified",
    address: admin.address ?? "",
    birthday: admin.birthday ? admin.birthday.slice(0, 10) : "",
    email: admin.email,
    newPassword: "",
  }));
  const [saving, setSaving] = useState(false);

  const isSuperAdmin = admin.role === "super_admin";

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setValues({
        ...splitName(admin.name),
        phone: admin.phone ?? "",
        gender: admin.gender || "unspecified",
        address: admin.address ?? "",
        birthday: admin.birthday ? admin.birthday.slice(0, 10) : "",
        email: admin.email,
        newPassword: "",
      });
    }
  }

  function set(patch: Partial<typeof values>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  async function handleSubmit() {
    if (!values.firstName.trim()) {
      toast.error("First name is required.");
      return;
    }
    setSaving(true);
    try {
      const result = await updateAdminInfo(admin.id, {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        // Always sent, possibly empty — an empty value clears the field server-side
        // rather than being silently dropped as "unchanged".
        phone: values.phone.trim(),
        gender: values.gender,
        address: values.address.trim(),
        birthday: values.birthday,
        email: isSuperAdmin ? undefined : values.email.trim() || undefined,
        newPassword: isSuperAdmin ? undefined : values.newPassword.trim() || undefined,
      });
      if (result.ok) {
        toast.success("Admin updated.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="size-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90dvh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {admin.name}</DialogTitle>
          <DialogDescription>
            Update this admin&apos;s account information.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex flex-col gap-4 overflow-y-auto px-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-first-name">First Name</Label>
              <Input
                id="admin-first-name"
                value={values.firstName}
                onChange={(event) => set({ firstName: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-last-name">Last Name</Label>
              <Input
                id="admin-last-name"
                value={values.lastName}
                onChange={(event) => set({ lastName: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-phone">Phone</Label>
              <Input
                id="admin-phone"
                value={values.phone}
                onChange={(event) => set({ phone: event.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-gender">Gender</Label>
              <Select value={values.gender} onValueChange={(value) => set({ gender: value })}>
                <SelectTrigger id="admin-gender" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="unspecified">Unspecified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-birthday">Birthday</Label>
              <Input
                id="admin-birthday"
                type="date"
                value={values.birthday}
                onChange={(event) => set({ birthday: event.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-address">Address</Label>
            <Textarea
              id="admin-address"
              rows={2}
              value={values.address}
              onChange={(event) => set({ address: event.target.value })}
            />
          </div>

          {isSuperAdmin ? (
            <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm">
              <ShieldAlert className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <p className="text-muted-foreground">
                Email and password for a Super Admin can only be changed by that Super
                Admin from their own Profile Management panel.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={values.email}
                  onChange={(event) => set({ email: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-password">
                  New Password <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={values.newPassword}
                  onChange={(event) => set({ newPassword: event.target.value })}
                  placeholder="Leave blank to keep the current password"
                  autoComplete="new-password"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
