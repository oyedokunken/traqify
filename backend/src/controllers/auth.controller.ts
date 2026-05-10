import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/database";
import { signToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { createOTP, verifyOTP, generatePasswordResetToken, verifyPasswordResetToken, markPasswordResetTokenUsed } from "../utils/otp";
import { sendEmail } from "../config/email";
import { otpEmailTemplate, passwordResetEmailTemplate, welcomeEmailTemplate, passwordChangedEmailTemplate, newStaffJoinedEmailTemplate } from "../emails/templates";
import {
  registerStep1Schema,
  verifyOTPSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  acceptInviteSchema,
  updateUserSchema,
} from "../utils/validators";
import { createAuditLog } from "../utils/audit";
import { generateUniqueSlug } from "../utils/slug";
import { AuthRequest } from "../middleware/auth.middleware";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = registerStep1Schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, emailVerified: true },
    });

    // Create audit log for user registration
    if (user.organizationId) {
      createAuditLog(user.id, user.organizationId, "CREATE", "User", user.id, `Registered account: ${user.name}`, req).catch(() => {});
    }

    // Return tokens for automatic login (email is pre-verified in new flow)
    const token = signToken({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId || undefined,
      role: user.role,
    });
    const refresh = signRefreshToken({ userId: user.id, email: user.email });

    res.status(201).json({
      message: "Account created successfully.",
      token,
      refreshToken: refresh,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        signInMethod: "EMAIL",
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Something went wrong during registration." });
  }
};

export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required." });
      return;
    }

    // Look up user if they exist (for personalized greeting), but don't require it
    const user = await prisma.user.findUnique({ where: { email } });
    const name = user?.name || "there";

    const otp = await createOTP(email);
    await sendEmail(email, "Your Traqify verification code", otpEmailTemplate(name, otp));

    res.json({ message: "A verification code has been sent to your email." });
  } catch {
    res.status(500).json({ error: "Failed to send verification code." });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = verifyOTPSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, otp } = parsed.data;
    const isValid = await verifyOTP(email, otp);

    if (!isValid) {
      res.status(400).json({ error: "Invalid or expired verification code." });
      return;
    }

    // Only mark emailVerified if user exists (for old flow)
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      await prisma.user.update({
        where: { email },
        data: { emailVerified: true },
      });
    }

    // If user doesn't exist (new register flow), just return success
    if (!existingUser) {
      res.json({ message: "Email verified successfully." });
      return;
    }

    const token = signToken({ userId: existingUser.id, email: existingUser.email });
    const refresh = signRefreshToken({ userId: existingUser.id, email: existingUser.email });

    res.json({
      message: "Email verified successfully.",
      token,
      refreshToken: refresh,
      user: {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        emailVerified: existingUser.emailVerified,
        organizationId: existingUser.organizationId,
        role: existingUser.role,
      },
    });
  } catch {
    res.status(500).json({ error: "Email verification failed." });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }
    if (!user.password) {
      res.status(401).json({ error: "This account uses Google Sign-In. Please use the Continue with Google button to sign in.", isGoogleAccount: true });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    if (!user.emailVerified) {
      const otp = await createOTP(email);
      await sendEmail(email, "Verify your Traqify account", otpEmailTemplate(user.name || "there", otp));
      res.status(403).json({
        error: "Please verify your email before logging in. A new code has been sent.",
        requiresVerification: true,
        email,
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Your account has been restricted. Please contact your administrator." });
      return;
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    if (user.organizationId) {
      createAuditLog(user.id, user.organizationId, "LOGIN", "User", user.id, "Logged in", req).catch(() => {});
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId || undefined,
      role: user.role,
    });
    const refresh = signRefreshToken({ userId: user.id, email: user.email });

    res.json({
      token,
      refreshToken: refresh,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        avatarUrl: user.avatarUrl,
        signInMethod: user.signInMethod || "EMAIL",
      },
    });
  } catch {
    res.status(500).json({ error: "Login failed. Please try again." });
  }
};

export const googleRedirect = (_req: Request, res: Response): void => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: `${process.env.API_URL || "http://localhost:5000"}/api/auth/google-callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  try {
    const { code } = req.query;
    if (!code || typeof code !== "string") {
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
      return;
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${process.env.API_URL || "http://localhost:5000"}/api/auth/google-callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) {
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
      return;
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json() as any;

    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
      include: { organization: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          emailVerified: true,
          signInMethod: "GOOGLE",
        },
        include: { organization: { select: { id: true, name: true, slug: true, logoUrl: true } } },
      }) as any;
    } else if (user.password && !user.avatarUrl?.includes("google")) {
      res.redirect(`${frontendUrl}/login?error=email_account`);
      return;
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), avatarUrl: googleUser.picture || user.avatarUrl },
        include: { organization: { select: { id: true, name: true, slug: true, logoUrl: true } } },
      }) as any;
    }

    const token = signToken({
      userId: user!.id,
      email: user!.email,
      organizationId: user!.organizationId || undefined,
      role: user!.role,
    });
    const refresh = signRefreshToken({ userId: user!.id, email: user!.email });

    const userData = {
      id: user!.id,
      email: user!.email,
      name: user!.name,
      role: user!.role,
      organizationId: user!.organizationId,
      avatarUrl: user!.avatarUrl,
      organization: (user as any).organization || null,
    };

    const params = new URLSearchParams({
      token,
      refreshToken: refresh,
      user: encodeURIComponent(JSON.stringify(userData)),
    });

    res.redirect(`${frontendUrl}/auth-callback?${params.toString()}`);
  } catch {
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) { res.status(401).json({ error: "Authentication required." }); return; }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current and new password are required." });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: authReq.user.id } });
    if (!user || !user.password) {
      res.status(400).json({ error: "Password change not available for this account." });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) { res.status(400).json({ error: "Current password is incorrect." }); return; }
    if (newPassword.length < 8) { res.status(400).json({ error: "New password must be at least 8 characters." }); return; }
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
    await createAuditLog(user.id, user.organizationId || "", "UPDATE", "USER", user.id, "Changed account password");
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    await sendEmail(user.email, "Your Traqify password was changed", passwordChangedEmailTemplate(user.name || "there", `${frontendUrl}/login`)).catch(() => {});
    res.json({ message: "Password updated successfully." });
  } catch {
    res.status(500).json({ error: "Failed to change password." });
  }
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, avatarUrl, googleId } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required." });
      return;
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatarUrl,
          emailVerified: true,
          signInMethod: "GOOGLE",
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), avatarUrl: avatarUrl || user.avatarUrl },
      });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId || undefined,
      role: user.role,
    });
    const refresh = signRefreshToken({ userId: user.id, email: user.email });

    res.json({
      token,
      refreshToken: refresh,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch {
    res.status(500).json({ error: "Google authentication failed." });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(404).json({ error: "No account found with that email address." });
      return;
    }

    const token = await generatePasswordResetToken(email);
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail(email, "Reset your Traqify password", passwordResetEmailTemplate(user.name || "there", resetUrl));

    res.json({ message: "Password reset link sent. Check your inbox." });
  } catch {
    res.status(500).json({ error: "Failed to process password reset request." });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { token, password } = parsed.data;
    const email = await verifyPasswordResetToken(token);

    if (!email) {
      res.status(400).json({ error: "This reset link is invalid or has expired." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { email }, data: { password: hashedPassword } });
    await markPasswordResetTokenUsed(token);

    res.json({ message: "Your password has been reset successfully." });
  } catch {
    res.status(500).json({ error: "Failed to reset password." });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: "Refresh token is required." });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user) {
      res.status(401).json({ error: "Invalid refresh token." });
      return;
    }

    const newToken = signToken({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId || undefined,
      role: user.role,
    });

    res.json({ token: newToken });
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token." });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            industry: true,
            size: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      signInMethod: user.signInMethod,
      organizationId: user.organizationId,
      organization: user.organization,
      lastLoginAt: user.lastLoginAt,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch profile." });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: parsed.data,
      select: { id: true, name: true, phone: true, avatarUrl: true, email: true },
    });

    if (req.user?.organizationId) {
      await createAuditLog(req.user.id, req.user.organizationId, "UPDATE", "User", req.user.id, "Updated profile", req);
    }

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update profile." });
  }
};

export const acceptInvite = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = acceptInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { token, name, password } = parsed.data;

    const invite = await prisma.staffInvite.findUnique({ where: { token } });
    if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      res.status(400).json({ error: "This invitation is invalid or has expired." });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existingUser) {
      res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const org = await prisma.organization.findUnique({ where: { id: invite.organizationId } });

    const user = await prisma.user.create({
      data: {
        email: invite.email,
        name,
        password: hashedPassword,
        emailVerified: true,
        organizationId: invite.organizationId,
        role: invite.role,
        invitedById: invite.invitedById,
      },
    });

    await prisma.staffInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
    await createAuditLog(user.id, invite.organizationId, "CREATE", "User", user.id, `${name} accepted invitation and joined as ${invite.role}`);

    const owner = await prisma.user.findFirst({ where: { organizationId: invite.organizationId, role: "OWNER" }, select: { email: true, name: true } });
    if (owner && org) {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      sendEmail(
        owner.email,
        `New team member joined: ${name} (${org.name})`,
        newStaffJoinedEmailTemplate(owner.name || "there", name, invite.email, invite.role, org.name, `${frontendUrl}/dashboard/${org.slug}/staff`)
      ).catch(() => {});
    }

    const authToken = signToken({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId || undefined,
      role: user.role,
    });
    const refresh = signRefreshToken({ userId: user.id, email: user.email });

    res.status(201).json({
      message: "Invitation accepted. Welcome to the team.",
      token: authToken,
      refreshToken: refresh,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
      orgSlug: org?.slug,
    });
  } catch {
    res.status(500).json({ error: "Failed to accept invitation." });
  }
};
