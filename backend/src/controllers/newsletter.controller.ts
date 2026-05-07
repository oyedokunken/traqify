import { Request, Response } from "express";
import prisma from "../config/database";
import { sendEmail } from "../config/email";

export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "A valid email address is required." });
      return;
    }

    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "This email is already subscribed." });
      return;
    }

    await prisma.newsletterSubscriber.create({ data: { email, name } });

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

export const getSubscribers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(subscribers);
  } catch {
    res.status(500).json({ error: "Failed to fetch subscribers." });
  }
};
