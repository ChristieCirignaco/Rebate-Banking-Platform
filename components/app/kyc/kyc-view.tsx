"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Clock3,
  FileCheck2,
  FileUp,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";

import { submitKyc } from "@/app/(app)/kyc/actions";
import type { KycData, KycFormFieldView } from "@/lib/kyc";
import { KYC_FILE_ACCEPT } from "@/lib/kyc/files";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELD =
  "h-11 rounded-xl border-slate-200 bg-slate-50/70 px-3.5 text-base focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20";

const SELECT =
  "h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><path stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22M19 9l-7 7-7-7%22/></svg>')] bg-[length:1.15rem] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-10 text-base text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none";

type UploadResult =
  | { ok: true; key: string; token: string; name: string; contentType: string }
  | { ok: false; error: string };

// Upload one KYC document and get back its opaque storage key + the token proving this user
// uploaded it. The key is meaningless without the token — submitKyc rejects an untokened value.
async function uploadKycDocument(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch("/api/user/kyc-document", { method: "POST", body: form });
  } catch {
    return { ok: false, error: "Network error during upload." };
  }
  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; key?: string; token?: string; name?: string; contentType?: string; error?: string }
    | null;
  if (!res.ok || !data?.ok || !data.key || !data.token) {
    return { ok: false, error: data?.error ?? "Upload failed." };
  }
  return {
    ok: true,
    key: data.key,
    token: data.token,
    name: data.name ?? file.name,
    contentType: data.contentType ?? file.type,
  };
}

export function KycView({ data }: { data: KycData }) {
  const { templates, submission, kycStatus, canSubmit } = data;

  // Already verified — nothing to do.
  if (kycStatus === "approved") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div className="text-sm">
          <p className="font-semibold text-emerald-900">Your identity is verified</p>
          <p className="mt-1 text-emerald-800">
            Verification is complete — no further action is needed.
            {submission?.reviewedAt ? ` Approved on ${submission.reviewedAt}.` : ""}
          </p>
        </div>
      </div>
    );
  }

  // Under review — read-only until an admin decides.
  if (kycStatus === "pending") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <Clock3 className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="text-sm">
          <p className="font-semibold text-amber-900">Your verification is under review</p>
          <p className="mt-1 text-amber-800">
            {submission?.submittedAt
              ? `Submitted on ${submission.submittedAt}. `
              : ""}
            We&apos;ll let you know as soon as it&apos;s been reviewed.
          </p>
        </div>
      </div>
    );
  }

  // Nothing to submit against.
  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
        Identity verification isn&apos;t available yet. Please contact support if you need it
        enabled for your account.
      </div>
    );
  }

  // Defensive: getKycData already derives this from kycStatus, but never render a form the
  // server action would reject.
  if (!canSubmit) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
        You can&apos;t submit a verification right now.
      </div>
    );
  }

  return (
    <KycForm
      templates={templates}
      rejectedRemarks={kycStatus === "rejected" ? (submission?.remarks ?? null) : null}
    />
  );
}

function KycForm({
  templates,
  rejectedRemarks,
}: {
  templates: KycData["templates"];
  rejectedRemarks: string | null;
}) {
  const router = useRouter();
  // An admin can run several verification types at once; the user picks which to submit. With
  // only one active there is nothing to choose, so the picker is hidden rather than shown as a
  // single-option select.
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const template = templates.find((t) => t.id === templateId) ?? templates[0];
  const [values, setValues] = useState<Record<string, string>>({}); // field id -> value / storage key
  const [tokens, setTokens] = useState<Record<string, string>>({}); // file field id -> upload token
  const [fileNames, setFileNames] = useState<Record<string, string>>({}); // file field id -> display name
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  const anyUploading = Object.values(uploading).some(Boolean);

  async function onFileSelect(fieldId: string, file: File | undefined) {
    if (!file) return;
    setUploading((p) => ({ ...p, [fieldId]: true }));
    try {
      const result = await uploadKycDocument(file);
      if (result.ok) {
        setValues((p) => ({ ...p, [fieldId]: result.key }));
        setTokens((p) => ({ ...p, [fieldId]: result.token }));
        setFileNames((p) => ({ ...p, [fieldId]: result.name }));
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Couldn't upload the file. Please try again.");
    } finally {
      setUploading((p) => ({ ...p, [fieldId]: false }));
    }
  }

  function removeFile(fieldId: string) {
    const drop = (prev: Record<string, string>) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    };
    setValues(drop);
    setTokens(drop);
    setFileNames(drop);
  }

  function validate(): string | null {
    for (const field of template.fields) {
      const value = (values[field.id] ?? "").trim();
      if (field.required && !value) {
        return field.type === "file" ? `Upload ${field.label}.` : `${field.label} is required.`;
      }
      if (field.type === "number" && value && !Number.isFinite(Number(value))) {
        return `${field.label} must be a number.`;
      }
    }
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (anyUploading) {
      toast.error("Please wait for the upload to finish.");
      return;
    }
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const result = await submitKyc({
        templateId: template.id,
        fields: values,
        tokens,
        note: note.trim() || undefined,
      });
      if (result.ok) {
        toast.success("Verification submitted for review.");
        router.refresh(); // re-renders the page into the "under review" panel
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    } catch {
      const message = "Could not submit your verification. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {rejectedRemarks !== null ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">
              Your previous submission was rejected
            </p>
            <p className="mt-1 text-amber-800">
              {rejectedRemarks || "Please review your details and submit again."}
            </p>
          </div>
        </div>
      ) : null}

      {templates.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kyc-template" className="text-sm font-semibold">
            Verification type
          </Label>
          <select
            id="kyc-template"
            value={templateId}
            onChange={(e) => {
              setTemplateId(e.target.value);
              // Field ids belong to a template, so carrying values across would post ids the
              // new one doesn't have.
              setValues({});
              setTokens({});
              setFileNames({});
              setError(null);
            }}
            className={SELECT}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {template.description ? (
        <p className="text-sm text-slate-500">{template.description}</p>
      ) : null}

      {template.fields.map((field) => (
        <KycField
          key={field.id}
          field={field}
          value={values[field.id] ?? ""}
          fileName={fileNames[field.id]}
          uploading={!!uploading[field.id]}
          onChange={(value) => setValues((p) => ({ ...p, [field.id]: value }))}
          onFileSelect={(file) => void onFileSelect(field.id, file)}
          onFileRemove={() => removeFile(field.id)}
        />
      ))}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kyc-note" className="text-sm font-semibold">
          Note
          <span className="ml-1 font-normal text-slate-400">(optional)</span>
        </Label>
        <Textarea
          id="kyc-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Anything the reviewer should know."
          className="rounded-xl border-slate-200 bg-slate-50/70 text-base"
        />
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={saving || anyUploading}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Submit for verification
      </button>
    </form>
  );
}

function KycField({
  field,
  value,
  fileName,
  uploading,
  onChange,
  onFileSelect,
  onFileRemove,
}: {
  field: KycFormFieldView;
  value: string;
  fileName: string | undefined;
  uploading: boolean;
  onChange: (value: string) => void;
  onFileSelect: (file: File | undefined) => void;
  onFileRemove: () => void;
}) {
  const id = `kyc-${field.id}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-semibold">
        {field.label}
        {field.required ? null : <span className="ml-1 font-normal text-slate-400">(optional)</span>}
      </Label>

      {field.type === "file" ? (
        value ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-sm">
            <FileCheck2 className="size-4 shrink-0 text-emerald-600" />
            <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
              {fileName ?? "File uploaded"}
            </span>
            <button
              type="button"
              onClick={onFileRemove}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-red-600"
            >
              <X className="size-3.5" />
              Remove
            </button>
          </div>
        ) : (
          <label
            className={cn(
              "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600",
              uploading && "pointer-events-none opacity-60",
            )}
          >
            <input
              type="file"
              accept={KYC_FILE_ACCEPT}
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                onFileSelect(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <FileUp className="size-4" />
                Upload file
              </>
            )}
          </label>
        )
      ) : (
        <Input
          id={id}
          type={field.type === "number" ? "number" : "text"}
          inputMode={field.type === "number" ? "decimal" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={FIELD}
        />
      )}
    </div>
  );
}
