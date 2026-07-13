"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
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
}: {
  user: UserDetail;
  onUpdate: (values: Partial<UserDetail>) => void;
}) {
  const [values, setValues] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    gender: user.gender,
    birthday: user.birthday,
    address: user.address,
  });

  const set = (patch: Partial<typeof values>) =>
    setValues((current) => ({ ...current, ...patch }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUpdate(values);
    toast.success("Information updated");
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="size-20">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
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
                className="absolute -right-1 -bottom-1 size-8 rounded-full"
              >
                <Camera className="size-4" />
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Click camera icon to change avatar
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
