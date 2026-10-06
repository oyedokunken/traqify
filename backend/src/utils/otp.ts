import crypto from "crypto";
import prisma from "../config/database";

export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

const hashOTP = (otp: string): string =>
  crypto.createHash("sha256").update(otp).digest("hex");

const MAX_OTP_ATTEMPTS = 5;

export const createOTP = async (email: string): Promise<string> => {
  await prisma.oTPVerification.deleteMany({ where: { email } });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.oTPVerification.create({
    data: { email, otp: hashOTP(otp), expiresAt },
  });

  return otp; // Return the plain OTP for delivery — only the hash is stored
};

export const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
  const record = await prisma.oTPVerification.findFirst({
    where: {
      email,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) return false;

  // Per-email brute-force protection
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.oTPVerification.update({
      where: { id: record.id },
      data: { used: true },
    });
    return false;
  }

  if (record.otp !== hashOTP(otp)) {
    await prisma.oTPVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.oTPVerification.update({
    where: { id: record.id },
    data: { used: true },
  });

  return true;
};

export const generatePasswordResetToken = async (email: string): Promise<string> => {
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt },
  });

  return token;
};

export const verifyPasswordResetToken = async (token: string): Promise<string | null> => {
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      token,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) return null;
  return record.email;
};

export const markPasswordResetTokenUsed = async (token: string): Promise<void> => {
  await prisma.passwordResetToken.updateMany({
    where: { token },
    data: { used: true },
  });
};
