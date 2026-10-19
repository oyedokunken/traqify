import { sendEmail } from "../../src/config/email";

const mocked = sendEmail as jest.Mock;

export const sentMail = () => mocked.mock.calls.map(([to, subject, html]) => ({ to: to as string, subject: subject as string, html: html as string }));

/** Extracts the 6 digit code from the most recent email sent to an address. */
export function lastOtpFor(email: string): string {
  const mail = sentMail().reverse().find((m) => m.to === email);
  if (!mail) throw new Error(`No email was sent to ${email}`);
  const match = mail.html.match(/>(\d{6})</);
  if (!match) throw new Error("No 6 digit code found in the email");
  return match[1];
}
