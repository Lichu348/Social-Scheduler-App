import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("Email not configured (RESEND_API_KEY not set). Would have sent:", {
      to: options.to,
      subject: options.subject,
    });
    return { success: true }; // Silently succeed when not configured
  }

  try {
    const fromEmail = process.env.EMAIL_FROM || "ShiftFlow <noreply@shiftflow.app>";

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error("Failed to send email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Shift details for multi-shift emails
export interface ShiftDetail {
  shiftTitle: string;
  shiftTime: string;
  locationName?: string;
}

// Email templates
export function shiftReminderEmail(params: {
  employeeName: string;
  shiftDate: string;
  shifts: ShiftDetail[];
  organizationName: string;
}): { subject: string; html: string; text: string } {
  const { employeeName, shiftDate, shifts, organizationName } = params;

  const isSplitShift = shifts.length > 1;
  const subject = isSplitShift
    ? `Reminder: You have ${shifts.length} shifts on ${shiftDate}`
    : `Reminder: You're on shift ${shiftDate}`;

  // Build shifts table rows
  const shiftsTableHtml = shifts.map((shift, index) => `
    <tr style="${index > 0 ? 'border-top: 1px solid #e5e7eb;' : ''}">
      <td style="padding: 12px 8px; font-weight: 600;">${shift.shiftTime}</td>
      <td style="padding: 12px 8px; font-weight: 600;">${shift.shiftTitle}</td>
      <td style="padding: 12px 8px; color: #6b7280;">${shift.locationName || '-'}</td>
    </tr>
  `).join('');

  const shiftsTextList = shifts.map(shift =>
    `• ${shift.shiftTime} - ${shift.shiftTitle}${shift.locationName ? ` (${shift.locationName})` : ''}`
  ).join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shift Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Shift Reminder</h1>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">Hey ${employeeName}!</p>

    <p>Just a friendly reminder that you're scheduled to work on <strong>${shiftDate}</strong>. Here ${isSplitShift ? 'are your shifts' : 'are your shift details'}:</p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0; overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; min-width: 300px;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 8px; text-align: left; color: #6b7280; font-weight: 600; font-size: 14px;">Time</th>
            <th style="padding: 8px; text-align: left; color: #6b7280; font-weight: 600; font-size: 14px;">Shift</th>
            <th style="padding: 8px; text-align: left; color: #6b7280; font-weight: 600; font-size: 14px;">Location</th>
          </tr>
        </thead>
        <tbody>
          ${shiftsTableHtml}
        </tbody>
      </table>
    </div>

    <p>If you're running late or have any issues getting to work, please let your manager know as soon as possible so we can make arrangements.</p>

    <p>See you soon!</p>

    <p style="margin-bottom: 0; color: #6b7280; font-size: 14px;">
      — The ${organizationName} Team
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">This is an automated reminder from ShiftFlow.</p>
  </div>
</body>
</html>
`;

  const text = `
Shift Reminder

Hey ${employeeName}!

Just a friendly reminder that you're scheduled to work on ${shiftDate}. Here ${isSplitShift ? 'are your shifts' : 'are your shift details'}:

${shiftsTextList}

If you're running late or have any issues getting to work, please let your manager know as soon as possible so we can make arrangements.

See you soon!

— The ${organizationName} Team

This is an automated reminder from ShiftFlow.
`;

  return { subject, html, text };
}

export function newShiftAssignedEmail(params: {
  employeeName: string;
  shiftTitle: string;
  shiftDate: string;
  shiftTime: string;
  locationName?: string;
  organizationName: string;
}): { subject: string; html: string; text: string } {
  const { employeeName, shiftTitle, shiftDate, shiftTime, locationName, organizationName } = params;

  const subject = `You've been scheduled: ${shiftDate}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Shift Assigned</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">New Shift Added</h1>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">Hey ${employeeName}!</p>

    <p>Good news - you've been added to the rota! Here are your shift details:</p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 100px;">Shift:</td>
          <td style="padding: 8px 0; font-weight: 600;">${shiftTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Date:</td>
          <td style="padding: 8px 0; font-weight: 600;">${shiftDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Time:</td>
          <td style="padding: 8px 0; font-weight: 600;">${shiftTime}</td>
        </tr>
        ${locationName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Location:</td>
          <td style="padding: 8px 0; font-weight: 600;">${locationName}</td>
        </tr>
        ` : ""}
      </table>
    </div>

    <p>If this doesn't work for you, please speak to your manager as soon as possible so we can find a solution.</p>

    <p>Thanks!</p>

    <p style="margin-bottom: 0; color: #6b7280; font-size: 14px;">
      — The ${organizationName} Team
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">This is an automated message from ShiftFlow.</p>
  </div>
</body>
</html>
`;

  const text = `
New Shift Added

Hey ${employeeName}!

Good news - you've been added to the rota! Here are your shift details:

Shift: ${shiftTitle}
Date: ${shiftDate}
Time: ${shiftTime}
${locationName ? `Location: ${locationName}` : ""}

If this doesn't work for you, please speak to your manager as soon as possible so we can find a solution.

Thanks!

— The ${organizationName} Team

This is an automated message from ShiftFlow.
`;

  return { subject, html, text };
}

export function welcomeCredentialsEmail(params: {
  employeeName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
  organizationName: string;
}): { subject: string; html: string; text: string } {
  const { employeeName, email, tempPassword, loginUrl, organizationName } = params;

  const subject = `Welcome to ${organizationName} - Your Login Details`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome - Your Login Details</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to ${organizationName}!</h1>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">Hi ${employeeName},</p>

    <p>Your account has been created. Here are your login details:</p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 120px;">Email:</td>
          <td style="padding: 8px 0; font-weight: 600;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Password:</td>
          <td style="padding: 8px 0; font-weight: 600; font-family: monospace; background: #fef3c7; padding: 4px 8px; border-radius: 4px;">${tempPassword}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Log In Now</a>
    </div>

    <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Important:</strong> For security, please change your password after your first login. Go to Settings &gt; Password to update it.
      </p>
    </div>

    <p>If you have any questions, please contact your manager.</p>

    <p style="margin-bottom: 0; color: #6b7280; font-size: 14px;">
      — The ${organizationName} Team
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">This is an automated message from ShiftFlow.</p>
  </div>
</body>
</html>
`;

  const text = `
Welcome to ${organizationName}!

Hi ${employeeName},

Your account has been created. Here are your login details:

Email: ${email}
Password: ${tempPassword}

Log in at: ${loginUrl}

IMPORTANT: For security, please change your password after your first login. Go to Settings > Password to update it.

If you have any questions, please contact your manager.

— The ${organizationName} Team

This is an automated message from ShiftFlow.
`;

  return { subject, html, text };
}

export function passwordResetEmail(params: {
  employeeName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
  organizationName: string;
}): { subject: string; html: string; text: string } {
  const { employeeName, email, tempPassword, loginUrl, organizationName } = params;

  const subject = `Password Reset - ${organizationName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
  </div>

  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">Hi ${employeeName},</p>

    <p>Your password has been reset by an administrator. Here are your new login details:</p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 120px;">Email:</td>
          <td style="padding: 8px 0; font-weight: 600;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">New Password:</td>
          <td style="padding: 8px 0; font-weight: 600; font-family: monospace; background: #fef3c7; padding: 4px 8px; border-radius: 4px;">${tempPassword}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Log In Now</a>
    </div>

    <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Important:</strong> Please change your password after logging in. Go to Settings &gt; Password to update it.
      </p>
    </div>

    <p>If you didn't expect this password reset, please contact your manager immediately.</p>

    <p style="margin-bottom: 0; color: #6b7280; font-size: 14px;">
      — The ${organizationName} Team
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">This is an automated message from ShiftFlow.</p>
  </div>
</body>
</html>
`;

  const text = `
Password Reset

Hi ${employeeName},

Your password has been reset by an administrator. Here are your new login details:

Email: ${email}
New Password: ${tempPassword}

Log in at: ${loginUrl}

IMPORTANT: Please change your password after logging in. Go to Settings > Password to update it.

If you didn't expect this password reset, please contact your manager immediately.

— The ${organizationName} Team

This is an automated message from ShiftFlow.
`;

  return { subject, html, text };
}
