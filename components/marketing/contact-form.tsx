"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { toast } from "@/lib/toast";
import { submitContactMessage } from "@/app/(marketing)/contact/actions";

const EMPTY = { fullName: "", email: "", subject: "", message: "" };

export function ContactForm() {
  const [values, setValues] = useState(EMPTY);
  const [pending, setPending] = useState(false);

  function update(field: keyof typeof EMPTY) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setValues((v) => ({ ...v, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const res = await submitContactMessage(values);
      if (res.ok) {
        toast.success("Message sent! Our team will get back to you soon.");
        setValues(EMPTY);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const labelClass =
    "text-xs font-semibold uppercase tracking-wide text-[var(--trb-dark)]";
  const fieldClass =
    "w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[var(--trb-dark)] outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--trb-blue)] focus:bg-white focus:ring-2 focus:ring-[var(--trb-blue)]/20 disabled:opacity-60";

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
      <div className="space-y-2">
        <label htmlFor="fullName" className={labelClass}>
          Full Name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="John Doe"
          value={values.fullName}
          onChange={update("fullName")}
          disabled={pending}
          required
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className={labelClass}>
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="john@example.com"
          value={values.email}
          onChange={update("email")}
          disabled={pending}
          required
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="subject" className={labelClass}>
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          placeholder="Product Verification"
          value={values.subject}
          onChange={update("subject")}
          disabled={pending}
          required
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className={labelClass}>
          Your Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="How can we help you today?"
          value={values.message}
          onChange={update("message")}
          disabled={pending}
          required
          className={`${fieldClass} resize-y`}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--trb-blue)] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--trb-blue-2)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          "Sending…"
        ) : (
          <>
            <Send className="h-4 w-4" /> Send Message
          </>
        )}
      </button>
    </form>
  );
}
