// The admin-defined custom fields shared by deposit methods (ManualMethodField) and withdrawal
// methods (WithdrawMethodField). Both areas build the same rows with the same builder component,
// so the rules for what a valid field looks like live here rather than in each admin action.

export const METHOD_FIELD_TYPES = ["input", "textarea", "file", "select"] as const;
export type MethodFieldType = (typeof METHOD_FIELD_TYPES)[number];

export type MethodFieldInput = {
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

const MAX_OPTIONS = 40;
const MAX_OPTION_LENGTH = 80;

// A select's choices: trimmed, de-duplicated, and bounded. Every other type has no choices.
export function normalizeFieldOptions(type: string, options: string[] | undefined): string[] {
  if (type !== "select") return [];
  const seen = new Set<string>();
  for (const raw of options ?? []) {
    const option = raw.trim().slice(0, MAX_OPTION_LENGTH);
    if (option) seen.add(option);
    if (seen.size >= MAX_OPTIONS) break;
  }
  return [...seen];
}

// Null when every field is usable, else the first problem — phrased for an admin toast.
export function validateMethodFields(fields: MethodFieldInput[] | undefined): string | null {
  for (const field of fields ?? []) {
    if (!field.label?.trim()) return "Each custom field needs a label.";
    if (!METHOD_FIELD_TYPES.includes(field.type as MethodFieldType)) return "Invalid field type.";
    if (field.type === "select" && normalizeFieldOptions(field.type, field.options).length === 0) {
      return `Add at least one choice to the "${field.label.trim()}" select field.`;
    }
  }
  return null;
}

// The create rows for either field model — sortOrder follows the admin's ordering.
export function methodFieldCreateData(fields: MethodFieldInput[] | undefined) {
  return (fields ?? []).map((field, index) => ({
    label: field.label.trim(),
    type: field.type,
    required: field.required,
    options: normalizeFieldOptions(field.type, field.options),
    sortOrder: index,
  }));
}
