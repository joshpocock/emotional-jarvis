// Real email through Resend. With no RESEND_API_KEY, emails stay in the demo outbox on the dashboard.
// EMAIL_REDIRECT_TO sends every email to that address instead, with the real recipient in the subject.
const API = "https://api.resend.com";

export const sendsForReal = () => !!process.env.RESEND_API_KEY;

export type Email = { to: string; subject: string; body: string };

// Send one email. Returns the address it actually went to.
export async function sendEmail({ to, subject, body }: Email): Promise<string> {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is missing. Add a sender on your verified Resend domain to .env.local.");
  const redirect = process.env.EMAIL_REDIRECT_TO;
  const res = await fetch(`${API}/emails`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: redirect || to,
      subject: redirect ? `[to ${to}] ${subject}` : subject,
      text: body,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return redirect || to;
}
