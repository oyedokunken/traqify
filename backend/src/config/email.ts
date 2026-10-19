import nodemailer from "nodemailer";

const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);

// Certificates are always verified. Port 465 uses implicit TLS; any other port must upgrade with STARTTLS
// before credentials are sent, otherwise the connection is refused.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: smtpPort,
  secure: smtpPort === 465,
  requireTLS: smtpPort !== 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface Attachment { filename: string; content: Buffer | string; contentType?: string; }

export const sendEmail = async (to: string, subject: string, html: string, attachments?: Attachment[]): Promise<void> => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Traqify" <noreply@traqify.com>',
      to, subject, html,
      attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
    });
    console.log(`[Email] Sent to ${to}  -  "${subject}" (${info.messageId})`);
  } catch (err: any) {
    console.error(`[Email] FAILED to ${to}  -  "${subject}":`, err.message);
    throw err;
  }
};

export default transporter;
