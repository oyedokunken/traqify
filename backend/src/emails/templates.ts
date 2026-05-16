// ============================================================
// SHARED STYLES
// ============================================================

const baseStyle = `font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f4f4f5;padding:40px 20px;`;
const cardStyle = `background:#ffffff;border-radius:10px;max-width:560px;margin:0 auto;padding:48px 40px;border-top:4px solid #DE1010;`;
const headingStyle = `font-size:22px;font-weight:700;color:#0a0a0a;margin:0 0 12px 0;`;
const bodyStyle = `font-size:15px;color:#52525b;line-height:1.7;margin:0 0 24px 0;`;
const buttonStyle = `display:inline-block;background-color:#DE1010;color:#ffffff !important;text-decoration:none;padding:13px 28px;border-radius:6px;font-weight:600;font-size:15px;margin:8px 0 24px 0;`;
const footerStyle = `margin-top:40px;padding-top:24px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;text-align:center;line-height:1.7;`;
const otpBoxStyle = `background:#f4f4f5;border-radius:8px;padding:20px;text-align:center;margin:24px 0;letter-spacing:8px;font-size:32px;font-weight:700;color:#0a0a0a;`;

// ============================================================
// TRAQIFY BRAND TEMPLATE (for all platform emails)
// Logo: text-only "Traqify" with red "ify", no rectangle
// Footer: social links + "This email was sent to [email] from Traqify"
// ============================================================

const traqifyLogoHtml = `
  <div style="margin-bottom:32px;">
    <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;display:inline-table;">
      <tr>
        <td style="vertical-align:middle;padding-right:10px;">
          <div style="width:34px;height:34px;background-color:#DE1010;border-radius:8px;display:inline-block;text-align:center;line-height:34px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;margin-top:-1px;">
              <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white"/>
              <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
              <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
              <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white"/>
            </svg>
          </div>
        </td>
        <td style="vertical-align:middle;">
          <span style="font-size:22px;font-weight:800;color:#0a0a0a;letter-spacing:-0.5px;">Traq<span style="color:#DE1010;">ify</span></span>
        </td>
      </tr>
    </table>
  </div>
`;

const traqifyFooter = (recipientEmail: string) => `
  <div style="${footerStyle}">
    <p style="margin:0 0 8px 0;">
      <a href="https://twitter.com/traqify" style="color:#a1a1aa;text-decoration:none;margin:0 6px;">Twitter</a> &middot;
      <a href="https://linkedin.com/company/traqify" style="color:#a1a1aa;text-decoration:none;margin:0 6px;">LinkedIn</a> &middot;
      <a href="https://instagram.com/traqify" style="color:#a1a1aa;text-decoration:none;margin:0 6px;">Instagram</a> &middot;
      <a href="https://github.com/oyedokunken/traqify" style="color:#a1a1aa;text-decoration:none;margin:0 6px;">GitHub</a>
    </p>
    <p style="margin:8px 0 0 0;">This email was sent to <strong>${recipientEmail}</strong> from Traqify. If you did not request this, you can safely ignore it.</p>
    <p style="margin:4px 0 0 0;font-size:11px;color:#c4c4c4;">
    Traqify is a production-deployed, multi-tenant enterprise store management platform built for retail businesses that need structure, auditability, and role-based control across their operations.
</p>
  </div>
`;

const wrapEmail = (content: string, recipientEmail = "") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Traqify</title>
</head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    ${traqifyLogoHtml}
    ${content}
    ${traqifyFooter(recipientEmail)}
  </div>
</body>
</html>
`;

// ============================================================
// STORE BRAND TEMPLATE (for customer-facing store emails)
// White background, store logo/name, Traqify-powered footer
// ============================================================

const storeCardStyle = `background:#ffffff;border-radius:10px;max-width:560px;margin:0 auto;padding:0;overflow:hidden;border:1px solid #e5e7eb;`;

const wrapStoreEmail = (
  content: string,
  orgName: string,
  orgLogoUrl: string | null,
  contact: { email: string | null; phone: string | null; address: string | null },
  recipientEmail: string
) => {
  const contactParts = [
    contact.email ? contact.email : null,
    contact.phone ? contact.phone : null,
    contact.address ? contact.address : null,
  ].filter(Boolean);
  const contactLine = contactParts.join("&nbsp;&middot;&nbsp;");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${orgName}</title>
</head>
<body style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f4f4f5;padding:40px 20px;">
  <div style="${storeCardStyle}">
    <div style="background:#ffffff;padding:28px 40px 20px;border-bottom:1px solid #f0f0f0;text-align:center;">
      ${orgLogoUrl
        ? `<img src="${orgLogoUrl}" alt="${orgName}" style="max-height:56px;max-width:180px;object-fit:contain;display:block;margin:0 auto 6px;">`
        : `<div style="display:inline-flex;width:52px;height:52px;background:#DE1010;border-radius:12px;align-items:center;justify-content:center;color:white;font-weight:700;font-size:22px;margin-bottom:6px;">${orgName[0]}</div>`
      }
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280;font-weight:600;">${orgName}</p>
    </div>
    <div style="padding:32px 40px;">
      ${content}
    </div>
    <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
      ${contactLine ? `<p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">${contactLine}</p>` : ""}
      <p style="margin:0;font-size:11px;color:#c4c4c4;">This email was sent to <strong style="color:#9ca3af;">${recipientEmail}</strong> from <strong style="color:#9ca3af;">${orgName}</strong> through <strong style="color:#DE1010;">Traqify</strong>. If you did not place an order, you can safely ignore this email.</p>
      <p>
      Traqify is a production-deployed, multi-tenant enterprise store management platform built for retail businesses that need structure, auditability, and role-based control across their operations.
      </p>
    </div>
  </div>
</body>
</html>
`;
};

// ============================================================
// TRAQIFY PLATFORM EMAIL TEMPLATES
// ============================================================

export const otpEmailTemplate = (name: string, otp: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">Verify your email address</h1>
    <p style="${bodyStyle}">Hi ${name}, thanks for signing up for Traqify. Enter the code below to verify your email address. This code expires in 10 minutes and can only be used once.</p>
    <div style="${otpBoxStyle}">${otp}</div>
    <p style="${bodyStyle}">If you did not create a Traqify account, you can safely ignore this email. No action is required on your part.</p>
  `, recipientEmail);

export const passwordResetEmailTemplate = (name: string, resetUrl: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">Reset your password</h1>
    <p style="${bodyStyle}">Hi ${name}, we received a request to reset your Traqify password. Click the button below to set a new password. This link expires in 1 hour.</p>
    <a href="${resetUrl}" style="${buttonStyle}">Reset Password</a>
    <p style="${bodyStyle}">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
  `, recipientEmail);

export const staffInviteEmailTemplate = (orgName: string, role: string, inviteUrl: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">You have been invited to join ${orgName}</h1>
    <p style="${bodyStyle}">You have been invited to join <strong>${orgName}</strong> on Traqify as a <strong>${role.charAt(0) + role.slice(1).toLowerCase()}</strong>.</p>
    <p style="${bodyStyle}">Click the button below to accept your invitation and set up your account. This invitation expires in 3 days.</p>
    <a href="${inviteUrl}" style="${buttonStyle}">Accept Invitation</a>
    <p style="${bodyStyle}">If you were not expecting this invitation, you can safely ignore it.</p>
  `, recipientEmail);

export const welcomeUserEmailTemplate = (name: string, orgName: string, dashboardUrl: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">Welcome to Traqify, ${name}</h1>
    <p style="${bodyStyle}">Your account is verified and your organization <strong>${orgName}</strong> is ready to go. You can now start adding products, inviting team members, and managing your store from your dashboard.</p>
    <a href="${dashboardUrl}" style="${buttonStyle}">Go to Dashboard</a>
    <p style="${bodyStyle}">Here is what you can do right away:</p>
    <ul style="font-size:15px;color:#52525b;line-height:1.7;padding-left:20px;margin:0 0 24px 0;">
      <li>Add your products and set up inventory alerts</li>
      <li>Invite your team with the right roles</li>
      <li>Share your public store page with customers</li>
    </ul>
    <p style="${bodyStyle}">If you have any questions, reply to this email and we will help you get sorted.</p>
  `, recipientEmail);

export const welcomeCompanyEmailTemplate = (orgName: string, ownerName: string, dashboardUrl: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">${orgName} is now live on Traqify</h1>
    <p style="${bodyStyle}">Hi ${ownerName}, your organization has been successfully created and your workspace is ready. This is a confirmation that your account setup is complete.</p>
    <table style="width:100%;background:#f4f4f5;border-radius:8px;padding:20px;margin:24px 0;border-collapse:collapse;">
      <tr><td style="padding:6px 0;font-size:14px;color:#52525b;"><strong>Organization:</strong></td><td style="padding:6px 0;font-size:14px;color:#0a0a0a;">${orgName}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#52525b;"><strong>Account owner:</strong></td><td style="padding:6px 0;font-size:14px;color:#0a0a0a;">${ownerName}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#52525b;"><strong>Role:</strong></td><td style="padding:6px 0;font-size:14px;color:#0a0a0a;">Owner</td></tr>
    </table>
    <a href="${dashboardUrl}" style="${buttonStyle}">Open Dashboard</a>
    <p style="${bodyStyle}">Keep this email for your records. You can manage your subscription, team, and store settings from your dashboard at any time.</p>
  `, recipientEmail);

export const welcomeEmailTemplate = welcomeUserEmailTemplate;

export const newProductEmailTemplate = (orgName: string, productName: string, sku: string, price: number, dashboardUrl: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">New product added to ${orgName}</h1>
    <p style="${bodyStyle}">A new product has been added to your Traqify catalog. Here are the details:</p>
    <table style="width:100%;background:#f4f4f5;border-radius:8px;padding:20px;margin:24px 0;border-collapse:collapse;">
      <tr><td style="padding:6px 0;font-size:14px;color:#52525b;"><strong>Product name:</strong></td><td style="padding:6px 0;font-size:14px;color:#0a0a0a;">${productName}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#52525b;"><strong>SKU:</strong></td><td style="padding:6px 0;font-size:14px;color:#0a0a0a;">${sku}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#52525b;"><strong>Price:</strong></td><td style="padding:6px 0;font-size:14px;color:#0a0a0a;">NGN ${price.toLocaleString()}</td></tr>
    </table>
    <a href="${dashboardUrl}" style="${buttonStyle}">View in Dashboard</a>
  `, recipientEmail);

export const newOrderEmailTemplate = (
  orgName: string,
  orderId: string,
  customerName: string,
  totalAmount: number,
  items: { name: string; qty: number; subtotal: number }[],
  dashboardUrl: string,
  recipientEmail = ""
): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">New order received</h1>
    <p style="${bodyStyle}">A new order has been placed on ${orgName}. Here is a summary:</p>
    <table style="width:100%;background:#f4f4f5;border-radius:8px;padding:20px;margin:24px 0;border-collapse:collapse;">
      <tr><td style="padding:6px 0;font-size:14px;color:#52525b;"><strong>Order ID:</strong></td><td style="padding:6px 0;font-size:14px;color:#0a0a0a;">#${orderId.slice(-8).toUpperCase()}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#52525b;"><strong>Customer:</strong></td><td style="padding:6px 0;font-size:14px;color:#0a0a0a;">${customerName}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#52525b;"><strong>Items:</strong></td><td style="padding:6px 0;font-size:14px;color:#0a0a0a;">${items.length}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#52525b;"><strong>Total:</strong></td><td style="padding:6px 0;font-size:14px;color:#DE1010;font-weight:700;">NGN ${totalAmount.toLocaleString()}</td></tr>
    </table>
    <p style="font-size:14px;font-weight:600;color:#0a0a0a;margin:0 0 8px 0;">Products ordered</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px 0;font-size:14px;">
      <thead><tr style="background:#f4f4f5;">
        <th style="text-align:left;padding:8px 12px;color:#52525b;font-size:13px;">Product</th>
        <th style="text-align:center;padding:8px 12px;color:#52525b;font-size:13px;">Qty</th>
        <th style="text-align:right;padding:8px 12px;color:#52525b;font-size:13px;">Subtotal</th>
      </tr></thead>
      <tbody>
        ${items.map((i) => `<tr style="border-bottom:1px solid #f4f4f5;"><td style="padding:8px 12px;color:#0a0a0a;">${i.name}</td><td style="padding:8px 12px;text-align:center;color:#52525b;">&times; ${i.qty}</td><td style="padding:8px 12px;text-align:right;font-weight:600;color:#0a0a0a;">NGN ${i.subtotal.toLocaleString()}</td></tr>`).join("")}
      </tbody>
    </table>
    <a href="${dashboardUrl}" style="${buttonStyle}">View Order</a>
    <p style="${bodyStyle}">Log in to your dashboard to review, process, or update the order status.</p>
  `, recipientEmail);

export const lowStockAlertEmailTemplate = (orgName: string, products: { name: string; sku: string; quantity: number; threshold: number }[], dashboardUrl: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">Low stock alert for ${orgName}</h1>
    <p style="${bodyStyle}">The following products in your Traqify inventory have fallen at or below their low-stock threshold. Please restock soon to avoid running out.</p>
    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <thead><tr style="background:#f4f4f5;">
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#52525b;">Product</th>
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#52525b;">SKU</th>
        <th style="padding:10px 12px;text-align:right;font-size:13px;color:#52525b;">In stock</th>
        <th style="padding:10px 12px;text-align:right;font-size:13px;color:#52525b;">Threshold</th>
      </tr></thead>
      <tbody>
        ${products.map((p) => `<tr style="border-bottom:1px solid #f4f4f5;"><td style="padding:10px 12px;font-size:14px;color:#0a0a0a;">${p.name}</td><td style="padding:10px 12px;font-size:14px;color:#52525b;">${p.sku}</td><td style="padding:10px 12px;font-size:14px;color:#DE1010;text-align:right;font-weight:600;">${p.quantity}</td><td style="padding:10px 12px;font-size:14px;color:#52525b;text-align:right;">${p.threshold}</td></tr>`).join("")}
      </tbody>
    </table>
    <a href="${dashboardUrl}" style="${buttonStyle}">Review Inventory</a>
  `, recipientEmail);

export const accountRestrictedEmailTemplate = (name: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">Account access restricted</h1>
    <p style="${bodyStyle}">Hi ${name}, your account access on Traqify has been restricted by your organization administrator. If you believe this is a mistake, please contact your organization admin.</p>
  `, recipientEmail);

export const passwordResetByAdminEmailTemplate = (name: string, tempPassword: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">Your password has been reset</h1>
    <p style="${bodyStyle}">Hi ${name}, your Traqify password has been reset by your organization administrator. Your temporary password is:</p>
    <div style="${otpBoxStyle}">${tempPassword}</div>
    <p style="${bodyStyle}">Please log in and change your password immediately. For security reasons, do not share this password with anyone.</p>
  `, recipientEmail);

export const staffRemovedEmailTemplate = (name: string, orgName: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">You have been removed from ${orgName}</h1>
    <p style="${bodyStyle}">Hi ${name}, your account has been removed from <strong>${orgName}</strong> on Traqify by an administrator. You can no longer access this organization's dashboard.</p>
    <p style="${bodyStyle}">If you believe this was done in error, please contact your organization administrator directly.</p>
  `, recipientEmail);

export const passwordChangedEmailTemplate = (name: string, loginUrl: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">Your password was changed</h1>
    <p style="${bodyStyle}">Hi ${name}, your Traqify account password was just changed. If you made this change, no further action is needed.</p>
    <p style="${bodyStyle}">If you did not make this change, please reset your password immediately and contact support.</p>
    <a href="${loginUrl}" style="${buttonStyle}">Go to Login</a>
    <p style="${bodyStyle}">This is an automated security notification.</p>
  `, recipientEmail);

export const storeStatusEmailTemplate = (orgName: string, published: boolean, storeUrl: string, dashboardUrl: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">Your store is now ${published ? "live" : "offline"}</h1>
    <p style="${bodyStyle}">Your store for <strong>${orgName}</strong> has been ${published ? "published and is now visible to customers" : "taken offline and is no longer accessible to customers"}.</p>
    ${published ? `<p style="${bodyStyle}">Customers can now browse and purchase from your store at the link below.</p><a href="${storeUrl}" style="${buttonStyle}">View Store</a>` : `<p style="${bodyStyle}">You can republish your store at any time from the Store section of your dashboard.</p><a href="${dashboardUrl}" style="${buttonStyle}">Go to Dashboard</a>`}
  `, recipientEmail);

export const newStaffJoinedEmailTemplate = (ownerName: string, newStaffName: string, newStaffEmail: string, newStaffRole: string, orgName: string, dashboardUrl: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">A new team member has joined ${orgName}</h1>
    <p style="${bodyStyle}">Hi ${ownerName}, a staff member you invited has accepted their invitation and joined your organization on Traqify.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;width:100px">Name</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;color:#0a0a0a">${newStaffName}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px">Email</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#0a0a0a">${newStaffEmail}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Role</td><td style="padding:8px 0;font-size:13px;font-weight:600;color:#DE1010">${newStaffRole}</td></tr>
    </table>
    <p style="${bodyStyle}">You can manage team access, roles, and permissions from the Staff section of your dashboard.</p>
    <a href="${dashboardUrl}" style="${buttonStyle}">View Staff</a>
  `, recipientEmail);

export const reportEmailTemplate = (orgName: string, reportLabel: string, dateFrom: string, dateTo: string, dashboardUrl: string, recipientEmail = ""): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">${reportLabel}</h1>
    <p style="${bodyStyle}">Please find attached the <strong>${reportLabel}</strong> for <strong>${orgName}</strong> covering the period <strong>${dateFrom}</strong> to <strong>${dateTo}</strong>.</p>
    <p style="${bodyStyle}">This report was generated automatically from your Traqify dashboard. The attached PDF contains the full data for the selected period.</p>
    <a href="${dashboardUrl}" style="${buttonStyle}">Go to Dashboard</a>
  `, recipientEmail);

// ============================================================
// STORE EMAIL TEMPLATES (customer-facing, use wrapStoreEmail)
// ============================================================

export const storeOrderConfirmationEmailTemplate = (
  customerName: string,
  orderNumber: string,
  orgName: string,
  totalAmount: number,
  items: { name: string; qty: number; subtotal: number }[],
  contact: { email: string | null; phone: string | null; address: string | null },
  orgLogoUrl: string | null,
  paymentMethod = "Bank Transfer"
): string =>
  wrapStoreEmail(`
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:24px;display:flex;align-items:flex-start;gap:12px;">
      <span style="font-size:20px;color:#16a34a;flex-shrink:0;">&#10003;</span>
      <div>
        <p style="margin:0;font-weight:700;color:#166534;font-size:15px;">Order confirmed</p>
        <p style="margin:4px 0 0;color:#166534;font-size:13px;">Hi ${customerName}, we have received your order and it is being processed.</p>
      </div>
    </div>
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;text-transform:uppercase;letter-spacing:.5px;">Order number</p>
      <p style="font-size:20px;font-weight:700;color:#0a0a0a;margin:0;">${orderNumber}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <tr style="border-bottom:2px solid #f0f0f0;">
        <th style="text-align:left;padding:8px 0;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Item</th>
        <th style="text-align:right;padding:8px 0;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;">Amount</th>
      </tr>
      ${items.map((i) => `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:10px 0;color:#0a0a0a;">${i.name} &times; ${i.qty}</td><td style="padding:10px 0;text-align:right;font-weight:600;color:#0a0a0a;">&#8358;${i.subtotal.toLocaleString()}</td></tr>`).join("")}
      <tr><td style="padding:12px 0;font-weight:700;border-top:2px solid #f0f0f0;">Total</td><td style="padding:12px 0;font-weight:700;text-align:right;color:#DE1010;border-top:2px solid #f0f0f0;">&#8358;${totalAmount.toLocaleString()}</td></tr>
    </table>
    <div style="background:#fef9f0;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:8px;">
      <p style="margin:0;font-size:13px;color:#92400e;"><strong>Payment method:</strong> ${paymentMethod}. Our team will be in touch with payment and delivery details shortly.</p>
    </div>
  `, orgName, orgLogoUrl, contact, customerName);

export const orderApprovedEmailTemplate = (
  customerName: string,
  orderNumber: string,
  orgName: string,
  totalAmount: number,
  items: { name: string; qty: number; subtotal: number }[],
  orgLogoUrl: string | null = null,
  contact: { email: string | null; phone: string | null; address: string | null } = { email: null, phone: null, address: null },
  customerEmail = ""
): string =>
  wrapStoreEmail(`
    <h2 style="font-size:20px;font-weight:700;color:#0a0a0a;margin:0 0 12px 0;">Your order has been approved</h2>
    <p style="font-size:15px;color:#52525b;line-height:1.7;margin:0 0 20px 0;">Hi ${customerName}, your order <strong>${orderNumber}</strong> has been approved and is now being processed. We will notify you once it is on its way.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px 0;">
      <tr style="background:#f4f4f5;"><th style="text-align:left;padding:10px 12px;font-size:12px;color:#52525b;">Item</th><th style="text-align:right;padding:10px 12px;font-size:12px;color:#52525b;">Amount</th></tr>
      ${items.map((i) => `<tr style="border-bottom:1px solid #f4f4f5;"><td style="padding:10px 12px;color:#0a0a0a;">${i.name} &times; ${i.qty}</td><td style="padding:10px 12px;text-align:right;font-weight:600;color:#0a0a0a;">&#8358;${i.subtotal.toLocaleString()}</td></tr>`).join("")}
      <tr><td style="padding:12px;font-weight:700;border-top:2px solid #f0f0f0;">Total</td><td style="padding:12px;font-weight:700;text-align:right;color:#DE1010;border-top:2px solid #f0f0f0;">&#8358;${totalAmount.toLocaleString()}</td></tr>
    </table>
    <p style="font-size:14px;color:#52525b;">Order reference: <strong>${orderNumber}</strong></p>
  `, orgName, orgLogoUrl, contact, customerEmail);

export const orderCompletedEmailTemplate = (
  customerName: string,
  orderNumber: string,
  orgName: string,
  totalAmount: number,
  orgLogoUrl: string | null = null,
  contact: { email: string | null; phone: string | null; address: string | null } = { email: null, phone: null, address: null },
  customerEmail = "",
  downloadableItems: { name: string; downloadUrl: string }[] = []
): string =>
  wrapStoreEmail(`
    <h2 style="font-size:20px;font-weight:700;color:#0a0a0a;margin:0 0 12px 0;">Your order has been delivered</h2>
    <p style="font-size:15px;color:#52525b;line-height:1.7;margin:0 0 20px 0;">Hi ${customerName}, your order <strong>${orderNumber}</strong> (&#8358;${totalAmount.toLocaleString()}) has been marked as delivered. Thank you for shopping with <strong>${orgName}</strong>.</p>
    ${downloadableItems.length > 0 ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 12px;font-weight:700;color:#166534;font-size:15px;">Your downloads</p>
      ${downloadableItems.map((item) => `
      <div style="margin-bottom:12px;">
        <p style="margin:0 0 6px;font-size:14px;color:#0a0a0a;font-weight:600;">${item.name}</p>
        <a href="${item.downloadUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600;">Download</a>
      </div>
      `).join("")}
    </div>
    ` : ""}
    <p style="font-size:15px;color:#52525b;line-height:1.7;margin:0 0 16px 0;">If you have any questions or concerns about your order, please reach out to us directly.</p>
    <p style="font-size:15px;color:#52525b;margin:0;">We hope to see you again soon.</p>
  `, orgName, orgLogoUrl, contact, customerEmail);

export const wishlistReminderTemplate = (
  orgName: string,
  orgLogoUrl: string | null,
  storeUrl: string,
  productNames: string[],
  delayLabel: string,
  contact: { email: string | null; phone: string | null; address: string | null } = { email: null, phone: null, address: null },
  recipientEmail = ""
): string =>
  wrapStoreEmail(`
    <h2 style="font-size:20px;font-weight:700;color:#0a0a0a;margin:0 0 12px 0;">Your wishlist is waiting for you</h2>
    <p style="font-size:15px;color:#52525b;line-height:1.7;margin:0 0 16px 0;">You saved some items in your wishlist ${delayLabel}. They are still available now.</p>
    <div style="background:#f9fafb;border-radius:10px;padding:16px;margin:0 0 20px 0;">
      ${productNames.map((n) => `<p style="margin:4px 0;font-size:14px;color:#0a0a0a;">- ${n}</p>`).join("")}
    </div>
    <p style="font-size:15px;color:#52525b;line-height:1.7;margin:0 0 20px 0;">Do not miss out. Head back to the store to complete your purchase.</p>
    <a href="${storeUrl}" style="${buttonStyle}">Back to Store</a>
  `, orgName, orgLogoUrl, contact, recipientEmail);
