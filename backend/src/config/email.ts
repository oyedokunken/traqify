import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface Attachment { filename: string; content: Buffer | string; contentType?: string; }

export const sendEmail = async (to: string, subject: string, html: string, attachments?: Attachment[]): Promise<void> => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Traqify" <noreply@traqify.com>',
    to, subject, html,
    attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
  });
};

export default transporter;
