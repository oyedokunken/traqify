import { z } from "zod";
import { roundMoney } from "./money";

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
  emailVerificationToken: z.string().min(1, "Please verify your email address before creating an account."),
});

export const sendOTPSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
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
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character."),
});

export const changePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character."),
});

/** A price: positive, finite, capped, and rounded to two decimals. */
export const moneySchema = z.number().positive("Price must be a positive number.").finite().max(1_000_000_000).transform(roundMoney);

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required.").max(200),
  sku: z.string().min(1, "SKU is required.").max(50),
  description: z.string().min(1, "Description is required."),
  price: moneySchema,
  comparePrice: moneySchema.optional(),
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

/**
 * Fields a product update may change. Anything else in the request body is
 * dropped, so ownership and identity fields can never be written by a client.
 */
export const productUpdateSchema = z
  .object({
    name: z.string().min(1, "Product name is required.").max(200),
    sku: z.string().min(1, "SKU is required.").max(50),
    description: z.string().max(10000),
    price: moneySchema,
    comparePrice: moneySchema.nullable(),
    categoryId: z.preprocess((value) => (value === "" ? null : value), z.string().nullable()),
    imageUrl: z.string().url().or(z.literal("")).nullable(),
    imageUrls: z.array(z.string().url()).max(20),
    status: z.string().max(30),
    productType: z.enum(["SIMPLE", "DOWNLOADABLE", "VARIABLE"]),
    downloadUrl: z.string().url().nullable(),
    isActive: z.boolean(),
  })
  .partial();

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

export const customerUpdateSchema = customerSchema.partial();

export const MAX_ORDER_ITEMS = 50;
export const MAX_ITEM_QUANTITY = 100;

/** Line items shared by the dashboard and storefront order paths. */
export const orderItemsSchema = z
  .array(
    z.object({
      productId: z.string().min(1),
      quantity: z
        .number({ invalid_type_error: "Quantity must be a number." })
        .int("Quantity must be a whole number.")
        .min(1, "Quantity must be at least 1.")
        .max(MAX_ITEM_QUANTITY, `Quantity cannot exceed ${MAX_ITEM_QUANTITY} per item.`),
    })
  )
  .min(1, "Order must contain at least one item.")
  .max(MAX_ORDER_ITEMS, `An order cannot contain more than ${MAX_ORDER_ITEMS} items.`)
  .refine((items) => new Set(items.map((i) => i.productId)).size === items.length, {
    message: "Each product may appear only once per order.",
  });

export const orderSchema = z.object({
  customerId: z.string().optional(),
  newCustomer: z.object({
    name: z.string().min(1, "Customer name is required.").max(200),
    email: z.string().email("A valid email address is required."),
    phone: z.string().min(6, "A phone number is required.").max(30),
    address: z.string().max(500).optional(),
  }).optional(),
  notes: z.string().max(1000).optional(),
  paymentMethod: z.string().max(50).optional(),
  items: orderItemsSchema,
});

/** Paystack references are generated by the client, so only safe characters are accepted. */
export const paystackReferenceSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9._=-]+$/, "Invalid payment reference.");

export const storeCheckoutSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(200),
    email: z.string().trim().email("A valid email address is required.").max(254),
    phone: z.string().max(30).optional(),
    address: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
    items: orderItemsSchema,
    paymentMethod: z.enum(["PAYSTACK", "TRANSFER"]).default("TRANSFER"),
    paystackReference: paystackReferenceSchema.optional(),
  })
  .refine((v) => v.paymentMethod !== "PAYSTACK" || !!v.paystackReference, {
    message: "A payment reference is required for Paystack payments.",
    path: ["paystackReference"],
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
