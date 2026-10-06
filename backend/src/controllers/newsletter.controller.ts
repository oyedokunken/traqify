import { Request, Response } from "express";
import prisma from "../config/database";
import { sendEmail } from "../config/email";
import { createAuditLog } from "../utils/audit";
import { AuthRequest } from "../middleware/auth.middleware";

export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "A valid email address is required." });
      return;
    }

    // Platform newsletter (no org context): organizationId is null
    const existing = await prisma.newsletterSubscriber.findFirst({
      where: { email, organizationId: null },
    });
    if (existing) {
      res.status(409).json({ error: "This email is already subscribed." });
      return;
    }

    await prisma.newsletterSubscriber.create({ data: { email, name, organizationId: null } });

    const greeting = name ? ", " + name : "";
    const html = "<div style='font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px'>"
      + "<div style='margin-bottom:24px'><span style='background:#DE1010;color:white;padding:6px 14px;border-radius:8px;font-size:16px;font-weight:700'>Traqify</span></div>"
      + "<h2 style='font-size:22px;font-weight:700;color:#0a0a0a;margin-bottom:8px'>You are in!</h2>"
      + "<p style='color:#6b7280;font-size:14px;line-height:1.6'>Thanks for subscribing" + greeting + ". We will send you product updates, tips, and announcements straight to your inbox.</p>"
      + "<p style='color:#6b7280;font-size:12px;margin-top:32px'>You can unsubscribe at any time by replying with 'unsubscribe'.</p>"
      + "</div>";
    await sendEmail(email, "You are subscribed to Traqify updates!", html);

    res.status(201).json({ message: "Successfully subscribed!" });
  } catch {
    res.status(500).json({ error: "Failed to subscribe. Please try again." });
  }
};

export const deleteSubscriber = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const authReq = req as AuthRequest;
    const orgId = authReq.user?.organizationId ?? null;
    const subscriber = await prisma.newsletterSubscriber.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!subscriber) {
      res.status(404).json({ error: "Subscriber not found." });
      return;
    }
    await prisma.newsletterSubscriber.delete({ where: { id } });
    if (authReq.user?.id && orgId) {
      createAuditLog(authReq.user.id, orgId, "DELETE", "Newsletter", id, `Removed newsletter subscriber: ${subscriber.email}`, req).catch(() => {});
    }
    res.json({ message: "Subscriber removed." });
  } catch {
    res.status(500).json({ error: "Failed to remove subscriber." });
  }
};

export const getSubscribers = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const orgId = authReq.user?.organizationId ?? null;
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });
    if (authReq.user?.id && orgId) {
      createAuditLog(authReq.user.id, orgId, "EXPORT", "Newsletter", undefined, `Viewed newsletter subscribers (${subscribers.length} total)`, req).catch(() => {});
    }
    res.json(subscribers);
  } catch {
    res.status(500).json({ error: "Failed to fetch subscribers." });
  }
};
