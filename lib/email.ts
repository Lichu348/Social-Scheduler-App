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
