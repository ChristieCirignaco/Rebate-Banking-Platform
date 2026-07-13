"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, UserPlus } from "lucide-react";

import { createActivationCode, createUser } from "@/app/admin/users/actions";
import { toast } from "@/lib/toast";
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

const EMPTY = { name: "", email: "", password: "", role: "user" };

export function UserListActions() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  function handleCreateCode() {
    startTransition(async () => {
      const result = await createActivationCode();
      if (result.ok) {
        toast.success(`Activation code created: ${result.code}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleAddUser() {
    startTransition(async () => {
      const result = await createUser(form);
      if (result.ok) {
        toast.success("User created");
        setForm(EMPTY);
        setAddOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={handleCreateCode} disabled={isPending}>
        <Lock className="size-4" />
        Create Activation Code
      </Button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <Button>
            <UserPlus className="size-4" />
            Add New User
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new account with an initial password.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <Field label="Role">
              <Select
                value={form.role}
                onValueChange={(role) => setForm({ ...form, role })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAddUser}
              disabled={
                isPending ||
                !form.name ||
                !form.email ||
                form.password.length < 8
              }
            >
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
