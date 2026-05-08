import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../config/database";
import { inviteStaffSchema } from "../utils/validators";
import { sendEmail } from "../config/email";
import { staffInviteEmailTemplate, accountRestrictedEmailTemplate, passwordResetByAdminEmailTemplate } from "../emails/templates";
import { createAuditLog } from "../utils/audit";
import { AuthRequest } from "../middleware/auth.middleware";

export const getInviteDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const invite = await prisma.staffInvite.findUnique({
      where: { token },
      include: { organization: { select: { name: true, logoUrl: true } } },
    });

    if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      res.status(400).json({ error: "This invitation is invalid or has expired." });
      return;
    }

    res.json({
      email: invite.email,
      role: invite.role,
      organizationName: invite.organization.name,
      organizationLogo: invite.organization.logoUrl,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch invitation details." });
  }
};

export const getStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;

    const staff = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        signInMethod: true,
        lastLoginAt: true,
        createdAt: true,
        invitedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(staff);
  } catch {
    res.status(500).json({ error: "Failed to fetch staff." });
  }
};

export const getInvites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;

    const invites = await prisma.staffInvite.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    res.json(invites);
  } catch {
    res.status(500).json({ error: "Failed to fetch invites." });
  }
};

export const inviteStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const parsed = inviteStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, role } = parsed.data;

    const existingUser = await prisma.user.findFirst({ where: { email, organizationId: orgId } });
    if (existingUser) {
      res.status(409).json({ error: "This person is already a member of your organization." });
      return;
    }

    const existingInvite = await prisma.staffInvite.findFirst({
      where: { email, organizationId: orgId, status: "PENDING", expiresAt: { gt: new Date() } },
    });
    if (existingInvite) {
      res.status(409).json({ error: "An active invitation already exists for this email." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const invite = await prisma.staffInvite.create({
      data: { email, role, token, expiresAt, organizationId: orgId, invitedById: req.user!.id },
    });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const inviteUrl = `${process.env.FRONTEND_URL}/invite/${token}`;
    await sendEmail(email, `You have been invited to join ${org?.name} on Traqify`, staffInviteEmailTemplate(org!.name, role, inviteUrl));

    await createAuditLog(req.user!.id, orgId, "CREATE", "StaffInvite", invite.id, `Invited ${email} as ${role}`, req);
    res.status(201).json({ message: `Invitation sent to ${email}.`, invite });
  } catch {
    res.status(500).json({ error: "Failed to send invitation." });
  }
};

export const updateStaffRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const orgId = req.user!.organizationId!;
    const { role } = req.body;

    if (!["MANAGER", "CASHIER", "AUDITOR"].includes(role)) {
      res.status(400).json({ error: "Invalid role." });
      return;
    }

    const member = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId } });
    if (!member) {
      res.status(404).json({ error: "Staff member not found." });
      return;
    }

    if (member.role === "OWNER") {
      res.status(403).json({ error: "You cannot change the owner's role." });
      return;
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: { role } });
    await createAuditLog(req.user!.id, orgId, "UPDATE", "User", userId, `Changed ${member.name}'s role to ${role}`, req);
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update role." });
  }
};

export const toggleStaffAccess = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const orgId = req.user!.organizationId!;

    const member = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId } });
    if (!member) {
      res.status(404).json({ error: "Staff member not found." });
      return;
    }

    if (member.role === "OWNER") {
      res.status(403).json({ error: "You cannot restrict the owner's access." });
      return;
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: { isActive: !member.isActive } });

    if (!updated.isActive && member.email) {
      await sendEmail(member.email, "Your Traqify account access has been updated", accountRestrictedEmailTemplate(member.name || "there"));
    }

    await createAuditLog(req.user!.id, orgId, "UPDATE", "User", userId, `${updated.isActive ? "Restored" : "Restricted"} access for ${member.name}`, req);
    res.json({ message: `Access ${updated.isActive ? "restored" : "restricted"} for ${member.name}.`, user: updated });
  } catch {
    res.status(500).json({ error: "Failed to update staff access." });
  }
};

export const removeStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const orgId = req.user!.organizationId!;

    if (userId === req.user!.id) {
      res.status(400).json({ error: "You cannot remove yourself." });
      return;
    }

    const member = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId } });
    if (!member) {
      res.status(404).json({ error: "Staff member not found." });
      return;
    }

    if (member.role === "OWNER") {
      res.status(403).json({ error: "You cannot remove the organization owner." });
      return;
    }

    await prisma.user.update({ where: { id: userId }, data: { organizationId: null } });
    await createAuditLog(req.user!.id, orgId, "DELETE", "User", userId, `Removed ${member.name} from the organization`, req);
    res.json({ message: `${member.name} has been removed from the organization.` });
  } catch {
    res.status(500).json({ error: "Failed to remove staff member." });
  }
};

export const resetStaffPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const orgId = req.user!.organizationId!;

    const member = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId } });
    if (!member) {
      res.status(404).json({ error: "Staff member not found." });
      return;
    }

    if (member.role === "OWNER") {
      res.status(403).json({ error: "You cannot reset the owner's password from here." });
      return;
    }

    const tempPassword = crypto.randomBytes(6).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

    if (member.email) {
      await sendEmail(member.email, "Your Traqify password has been reset", passwordResetByAdminEmailTemplate(member.name || "there", tempPassword));
    }

    await createAuditLog(req.user!.id, orgId, "UPDATE", "User", userId, `Reset password for ${member.name}`, req);
    res.json({ message: `Password reset email sent to ${member.email}.` });
  } catch {
    res.status(500).json({ error: "Failed to reset password." });
  }
};
