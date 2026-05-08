import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

transporter.verify((error) => {
  if (error) {
    console.error("[SMTP] Connection failed:", error.message);
    console.error("[SMTP] Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars");
  } else {
    console.log("[SMTP] Ready ✓ —", process.env.SMTP_USER);
  }
});

interface Attachment { filename: string; content: Buffer | string; contentType?: string; }

export const sendEmail = async (to: string, subject: string, html: string, attachments?: Attachment[]): Promise<void> => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Traqify" <noreply@traqify.com>',
      to, subject, html,
      attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
    });
    console.log(`[Email] Sent to ${to} — "${subject}" (${info.messageId})`);
  } catch (err: any) {
    console.error(`[Email] FAILED to ${to} — "${subject}":`, err.message);
    throw err;
  }
};

export default transporter;
