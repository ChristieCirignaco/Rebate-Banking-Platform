type SendEmailArgs = {
  to: string;
  subject: string;
  text: string;
};

// Minimal mailer. In development it logs to the server console; production wires a
// real provider (Resend) in a later phase. Callers fire-and-forget (do not await).
export async function sendEmail({
  to,
  subject,
  text,
}: SendEmailArgs): Promise<void> {
  console.info(`[email] to=${to} | ${subject}\n${text}`);
}
