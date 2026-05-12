import { z } from "zod";

const DISPOSABLE_DOMAINS = [
  "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com",
  "throwaway.email", "yopmail.com", "trashmail.com", "sharklasers.com",
  "guerrillamailblock.com", "grr.la", "guerrillamail.info", "spam4.me",
  "fakeinbox.com", "dispostable.com", "maildrop.cc", "spamgourmet.com",
  "mailnull.com", "spamspot.com", "mailexpire.com", "discard.email",
];

export const isDisposableEmail = (email: string): boolean => {
  const domain = email.split("@")[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.includes(domain);
};

export const registerStep1Schema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address.")
    .refine((email) => !isDisposableEmail(email), {
      message: "Disposable email addresses are not allowed.",
    }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character."),
  name: z.string().min(2, "Name must be at least 2 characters.").max(100),
});

export const verifyOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits."),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters.").max(100),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  description: z.string().max(500).optional(),
  website: z.string().url("Please enter a valid URL.").optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character."),
});

export const inviteStaffSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address.")
    .refine((email) => !isDisposableEmail(email), {
      message: "Disposable email addresses are not allowed.",
    }),
  role: z.enum(["MANAGER", "CASHIER", "AUDITOR"]),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2).max(100),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
});

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required.").max(200),
  sku: z.string().min(1, "SKU is required.").max(50),
  description: z.string().min(1, "Description is required."),
  price: z.number().positive("Price must be a positive number."),
  comparePrice: z.number().positive().optional(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  imageUrls: z.array(z.string().url()).optional().default([]),
  status: z.string().optional().default("published"),
  isActive: z.boolean().optional().default(true),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.string().min(1),
        price: z.number().optional(),
        sku: z.string().optional(),
      })
    )
    .optional(),
  initialStock: z.number().int().min(0).optional().default(0),
  lowStockAlert: z.number().int().min(0).optional().default(10),
});

export const inventoryUpdateSchema = z.object({
  quantity: z.number().int().min(0, "Quantity cannot be negative."),
  lowStockAlert: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required.").max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const orderSchema = z.object({
  customerId: z.string().optional(),
  newCustomer: z.object({
    name: z.string().min(1, "Customer name is required."),
    email: z.string().email("A valid email address is required."),
    phone: z.string().min(6, "A phone number is required."),
    address: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  paymentMethod: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive("Quantity must be at least 1."),
      })
    )
    .min(1, "Order must contain at least one item."),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
});

export const updateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  storePublished: z.boolean().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  description: z.string().max(500).optional(),
});
