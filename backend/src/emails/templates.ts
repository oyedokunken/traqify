const baseStyle = `
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background-color: #f4f4f5;
  padding: 40px 20px;
`;

const cardStyle = `
  background: #ffffff;
  border-radius: 8px;
  max-width: 560px;
  margin: 0 auto;
  padding: 48px 40px;
  border-top: 4px solid #DE1010;
`;

const logoHtml = `
  <div style="margin-bottom: 32px; display: flex; align-items: center; gap: 8px;">
    <div style="background: #DE1010; width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white"/>
        <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
        <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.7"/>
        <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white"/>
      </svg>
    </div>
    <span style="font-size: 20px; font-weight: 700; color: #0a0a0a; letter-spacing: -0.5px; vertical-align: middle;">Traq<span style="color:#DE1010;">ify</span></span>
  </div>
`;

const headingStyle = `
  font-size: 22px;
  font-weight: 700;
  color: #0a0a0a;
  margin: 0 0 12px 0;
`;

const bodyStyle = `
  font-size: 15px;
  color: #52525b;
  line-height: 1.7;
  margin: 0 0 24px 0;
`;

const buttonStyle = `
  display: inline-block;
  background-color: #DE1010;
  color: #ffffff !important;
  text-decoration: none;
  padding: 13px 28px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 15px;
  margin: 8px 0 24px 0;
`;

const footerStyle = `
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e4e4e7;
  font-size: 13px;
  color: #a1a1aa;
  text-align: center;
`;

const otpBoxStyle = `
  background: #f4f4f5;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  margin: 24px 0;
  letter-spacing: 8px;
  font-size: 32px;
  font-weight: 700;
  color: #0a0a0a;
`;

const wrapEmail = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Traqify</title>
</head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    ${logoHtml}
    ${content}
    <div style="${footerStyle}">
      <p>This email was sent by Traqify. If you did not request this, you can safely ignore it.</p>
      <p style="margin-top: 8px;">Traqify &mdash; Store Management Platform</p>
    </div>
  </div>
</body>
</html>
`;

export const otpEmailTemplate = (name: string, otp: string): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">Verify your email address</h1>
    <p style="${bodyStyle}">Hi ${name}, welcome to Traqify. Use the code below to verify your email address. It expires in 10 minutes.</p>
    <div style="${otpBoxStyle}">${otp}</div>
    <p style="${bodyStyle}">If you did not sign up for Traqify, please disregard this email.</p>
  `);

export const passwordResetEmailTemplate = (name: string, resetUrl: string): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">Reset your password</h1>
    <p style="${bodyStyle}">Hi ${name}, we received a request to reset your Traqify password. Click the button below to set a new password. This link expires in 1 hour.</p>
    <a href="${resetUrl}" style="${buttonStyle}">Reset Password</a>
    <p style="${bodyStyle}">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
  `);

export const staffInviteEmailTemplate = (
  orgName: string,
  role: string,
  inviteUrl: string
): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">You have been invited to join ${orgName}</h1>
    <p style="${bodyStyle}">You have been invited to join <strong>${orgName}</strong> on Traqify as a <strong>${role.charAt(0) + role.slice(1).toLowerCase()}</strong>.</p>
    <p style="${bodyStyle}">Click the button below to accept your invitation and set up your account. This invitation expires in 48 hours.</p>
    <a href="${inviteUrl}" style="${buttonStyle}">Accept Invitation</a>
    <p style="${bodyStyle}">If you were not expecting this invitation, you can safely ignore it.</p>
  `);

export const welcomeEmailTemplate = (name: string, orgName: string, dashboardUrl: string): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">Welcome to Traqify, ${name}!</h1>
    <p style="${bodyStyle}">Your organization <strong>${orgName}</strong> is now set up on Traqify. You can start adding products, inviting your team, and managing your store right away.</p>
    <a href="${dashboardUrl}" style="${buttonStyle}">Go to Dashboard</a>
    <p style="${bodyStyle}">If you have any questions, our support team is always happy to help.</p>
  `);

export const accountRestrictedEmailTemplate = (name: string): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">Account access restricted</h1>
    <p style="${bodyStyle}">Hi ${name}, your account access on Traqify has been restricted by your organization administrator. If you believe this is a mistake, please contact your organization admin.</p>
  `);

export const passwordResetByAdminEmailTemplate = (name: string, tempPassword: string): string =>
  wrapEmail(`
    <h1 style="${headingStyle}">Your password has been reset</h1>
    <p style="${bodyStyle}">Hi ${name}, your Traqify password has been reset by your organization administrator. Your temporary password is:</p>
    <div style="${otpBoxStyle}" style="letter-spacing: 2px; font-size: 20px;">${tempPassword}</div>
    <p style="${bodyStyle}">Please log in and change your password immediately. For security reasons, do not share this password with anyone.</p>
  `);
