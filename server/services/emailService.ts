import { pool } from '../db';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
}

const DEFAULT_SENDER_EMAIL = process.env.GMAIL_SENDER_EMAIL || 'oddgfroo@fda.gov.ph';
const DEFAULT_SENDER_NAME = process.env.GMAIL_SENDER_NAME || 'FDA ODDG-FROO Task Tracker';
const PORTAL_URL = process.env.APP_BASE_URL || process.env.VITE_APP_URL || '';

/**
 * Checks whether email sending is configured via either:
 * 1) Google Apps Script Web App URL (GMAIL_WEBHOOK_URL) - Recommended & easiest
 * 2) Direct Gmail OAuth2 REST API (GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN)
 */
export function isEmailConfigured(): {
  configured: boolean;
  mode: 'apps_script' | 'gmail_oauth2' | 'unconfigured';
  senderEmail: string;
} {
  const webhookUrl = (process.env.GMAIL_WEBHOOK_URL || '').trim();
  if (webhookUrl && webhookUrl.startsWith('https://script.google.com/')) {
    return { configured: true, mode: 'apps_script', senderEmail: DEFAULT_SENDER_EMAIL };
  }

  const clientId = (process.env.GMAIL_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim();
  const refreshToken = (process.env.GMAIL_REFRESH_TOKEN || '').trim();

  if (clientId && clientSecret && refreshToken) {
    return { configured: true, mode: 'gmail_oauth2', senderEmail: DEFAULT_SENDER_EMAIL };
  }

  return { configured: false, mode: 'unconfigured', senderEmail: DEFAULT_SENDER_EMAIL };
}

/**
 * Exchanges a Google OAuth2 Refresh Token for a fresh Access Token over HTTPS (Port 443)
 */
async function getGmailOAuth2AccessToken(): Promise<string> {
  const clientId = (process.env.GMAIL_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim();
  const refreshToken = (process.env.GMAIL_REFRESH_TOKEN || '').trim();

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gmail OAuth2 token exchange failed (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error('Gmail OAuth2 token response did not include an access_token.');
  }

  return data.access_token;
}

/**
 * Encodes an RFC 2822 email message into base64url format for the Gmail REST API
 */
function buildRawMimeMessage(params: {
  fromName: string;
  fromEmail: string;
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
}): string {
  const encodedSubject = `=?utf-8?B?${Buffer.from(params.subject, 'utf-8').toString('base64')}?=`;
  const headers = [
    `From: "${params.fromName}" <${params.fromEmail}>`,
    `To: ${params.to.join(', ')}`,
    ...(params.cc && params.cc.length > 0 ? [`Cc: ${params.cc.join(', ')}`] : []),
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(params.html, 'utf-8').toString('base64'),
  ];

  const rawMime = headers.join('\r\n');
  return Buffer.from(rawMime, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Core non-blocking email dispatcher supporting both Google Apps Script Webhook and Gmail OAuth2 REST API
 */
export async function sendSystemEmail(payload: EmailPayload): Promise<{
  sent: boolean;
  mode: string;
  recipients: string[];
  error?: string;
}> {
  const recipients = (Array.isArray(payload.to) ? payload.to : [payload.to])
    .map((e) => (e || '').trim().toLowerCase())
    .filter((e) => Boolean(e) && e.includes('@'));

  const ccList = (payload.cc ? (Array.isArray(payload.cc) ? payload.cc : [payload.cc]) : [])
    .map((e) => (e || '').trim().toLowerCase())
    .filter((e) => Boolean(e) && e.includes('@'));

  const uniqueRecipients = Array.from(new Set(recipients));
  if (uniqueRecipients.length === 0) {
    return { sent: false, mode: 'none', recipients: [], error: 'No valid recipient email address found.' };
  }

  const config = isEmailConfigured();
  if (!config.configured) {
    console.log(
      `[Email Service - Dry Run] Would send "${payload.subject}" to [${uniqueRecipients.join(', ')}]. (Set GMAIL_WEBHOOK_URL or Gmail OAuth2 vars in Railway/.env to enable live delivery)`
    );
    return {
      sent: false,
      mode: 'unconfigured',
      recipients: uniqueRecipients,
      error: 'Email service is not configured yet in environment variables.',
    };
  }

  try {
    if (config.mode === 'apps_script') {
      const webhookUrl = (process.env.GMAIL_WEBHOOK_URL || '').trim();
      const webhookSecret = (process.env.GMAIL_WEBHOOK_SECRET || '').trim();

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: uniqueRecipients.join(','),
          cc: ccList.join(','),
          subject: payload.subject,
          htmlBody: payload.html,
          senderName: DEFAULT_SENDER_NAME,
          secret: webhookSecret,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Google Apps Script webhook returned ${res.status}: ${text}`);
      }

      console.log(`[Email Service] Sent "${payload.subject}" via Google Apps Script to: ${uniqueRecipients.join(', ')}`);
      return { sent: true, mode: 'apps_script', recipients: uniqueRecipients };
    }

    // Mode 2: Direct Gmail OAuth2 REST API
    const accessToken = await getGmailOAuth2AccessToken();
    const raw = buildRawMimeMessage({
      fromName: DEFAULT_SENDER_NAME,
      fromEmail: DEFAULT_SENDER_EMAIL,
      to: uniqueRecipients,
      cc: ccList,
      subject: payload.subject,
      html: payload.html,
    });

    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!gmailRes.ok) {
      const errBody = await gmailRes.text();
      throw new Error(`Gmail API send failed (${gmailRes.status}): ${errBody}`);
    }

    console.log(`[Email Service] Sent "${payload.subject}" via Gmail OAuth2 API to: ${uniqueRecipients.join(', ')}`);
    return { sent: true, mode: 'gmail_oauth2', recipients: uniqueRecipients };
  } catch (err: any) {
    console.error('[Email Service Error]:', err?.message || err);
    return {
      sent: false,
      mode: config.mode,
      recipients: uniqueRecipients,
      error: err?.message || 'Unknown email sending error',
    };
  }
}

/**
 * Helper to look up email addresses in the MySQL `users` table from a comma-separated list of names or user ID
 */
export async function resolveTaskAssigneeEmails(
  assignedToNames?: string | null,
  assignedToUserId?: string | null
): Promise<Array<{ name: string; email: string; office: string }>> {
  const results: Array<{ name: string; email: string; office: string }> = [];
  const seenEmails = new Set<string>();

  try {
    if (assignedToUserId) {
      const [rows]: [any[], any] = await pool.query(
        'SELECT first_name, last_name, email, office_code FROM users WHERE id = ? AND is_active = 1 LIMIT 1',
        [assignedToUserId]
      );
      if (rows.length > 0 && rows[0].email) {
        const email = rows[0].email.trim().toLowerCase();
        seenEmails.add(email);
        results.push({
          name: `${rows[0].first_name} ${rows[0].last_name}`,
          email,
          office: rows[0].office_code || '',
        });
      }
    }

    if (assignedToNames) {
      const names = assignedToNames
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);

      for (const name of names) {
        const lowerName = name.toLowerCase();
        const [rows]: [any[], any] = await pool.query(
          `SELECT first_name, last_name, email, office_code
           FROM users
           WHERE is_active = 1
             AND (
               LOWER(CONCAT(first_name, ' ', last_name)) = ?
               OR LOWER(CONCAT(first_name, ' ', IFNULL(middle_initial, ''), ' ', last_name)) = ?
               OR LOWER(email) = ?
               OR LOWER(username) = ?
             )
           LIMIT 1`,
          [lowerName, lowerName, lowerName, lowerName]
        );

        if (rows.length > 0 && rows[0].email) {
          const email = rows[0].email.trim().toLowerCase();
          if (!seenEmails.has(email)) {
            seenEmails.add(email);
            results.push({
              name: `${rows[0].first_name} ${rows[0].last_name}`,
              email,
              office: rows[0].office_code || '',
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Email Service] Error resolving assignee emails:', err);
  }

  return results;
}

/**
 * Shared FDA-FROO Official HTML Email Layout Wrapper
 */
function wrapFdaEmailTemplate(params: {
  badgeText: string;
  badgeColor?: string;
  title: string;
  greeting: string;
  leadHtml: string;
  detailsRows?: Array<{ label: string; value: string }>;
  calloutTitle?: string;
  calloutHtml?: string;
  calloutBg?: string;
  calloutBorder?: string;
}): string {
  const badgeBg = params.badgeColor || '#056839';
  const rowsHtml =
    params.detailsRows && params.detailsRows.length > 0
      ? `<table style="width:100%; border-collapse:collapse; margin:18px 0; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
          <tbody>
            ${params.detailsRows
              .map(
                (r) => `
              <tr>
                <td style="padding:10px 14px; border-bottom:1px solid #e2e8f0; font-size:12px; font-weight:700; color:#475569; width:36%; text-transform:uppercase;">
                  ${r.label}
                </td>
                <td style="padding:10px 14px; border-bottom:1px solid #e2e8f0; font-size:13px; font-weight:600; color:#0f172a;">
                  ${r.value}
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : '';

  const calloutSection =
    params.calloutTitle || params.calloutHtml
      ? `<div style="margin:18px 0; padding:14px 16px; background:${params.calloutBg || '#ecfdf5'}; border-left:4px solid ${
          params.calloutBorder || '#056839'
        }; border-radius:6px;">
          ${
            params.calloutTitle
              ? `<div style="font-size:13px; font-weight:700; color:#064e3b; margin-bottom:4px;">${params.calloutTitle}</div>`
              : ''
          }
          ${params.calloutHtml ? `<div style="font-size:13px; color:#1e293b; line-height:1.5;">${params.calloutHtml}</div>` : ''}
        </div>`
      : '';

  const portalButtonHtml = PORTAL_URL
    ? `<div style="margin:22px 0 10px;">
        <a href="${PORTAL_URL}" style="display:inline-block; background:#056839; color:#ffffff; text-decoration:none; font-weight:700; font-size:13px; padding:10px 20px; border-radius:6px;">
          Open FDA-FROO Task Tracker Portal
        </a>
      </div>`
    : '';

  return `
  <div style="font-family:'Segoe UI', Arial, sans-serif; max-width:620px; margin:0 auto; border:1px solid #cbd5e1; border-radius:10px; overflow:hidden; background:#ffffff; color:#1e293b;">
    <div style="background:#056839; color:#ffffff; padding:18px 24px;">
      <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#a7f3d0; font-weight:700;">
        Republic of the Philippines • Department of Health
      </div>
      <div style="font-size:17px; font-weight:800; margin-top:2px;">
        Food and Drug Administration — FROO
      </div>
      <div style="font-size:12px; color:#d1fae5; margin-top:2px;">
        Field Regulatory Operations Office Task Tracking System
      </div>
    </div>

    <div style="padding:24px;">
      <div style="margin-bottom:12px;">
        <span style="display:inline-block; background:${badgeBg}; color:#ffffff; font-size:11px; font-weight:700; padding:4px 10px; border-radius:4px; text-transform:uppercase; letter-spacing:0.5px;">
          ${params.badgeText}
        </span>
      </div>

      <h2 style="margin:0 0 14px; font-size:18px; color:#0f172a; line-height:1.35;">
        ${params.title}
      </h2>

      <p style="font-size:14px; color:#334155; margin:0 0 12px;">
        ${params.greeting}
      </p>

      <div style="font-size:14px; color:#334155; line-height:1.6;">
        ${params.leadHtml}
      </div>

      ${rowsHtml}
      ${calloutSection}
      ${portalButtonHtml}

      <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0 14px;" />
      <div style="font-size:11.5px; color:#64748b; line-height:1.5;">
        This is an official automated notification from the <strong>FDA Field Regulatory Operations Office (ODDG-FROO)</strong> Task Tracker (<a href="mailto:${DEFAULT_SENDER_EMAIL}" style="color:#056839;">${DEFAULT_SENDER_EMAIL}</a>).
      </div>
    </div>
  </div>`;
}

/**
 * 1. NEW TASK ASSIGNED EMAIL
 */
export async function sendTaskAssignedNotification(task: {
  id: string;
  dtn?: string;
  taskTitle: string;
  category: string;
  origin: string;
  assignedTo: string;
  assignedToUserId?: string | null;
  region: string;
  dueDate: string;
  scheduledDate?: string;
  location?: string;
  description?: string;
  priority: string;
  createdBy: string;
}) {
  const assignees = await resolveTaskAssigneeEmails(task.assignedTo, task.assignedToUserId);
  if (assignees.length === 0) return { sent: false, recipients: [] };

  const recipientEmails = assignees.map((a) => a.email);
  const html = wrapFdaEmailTemplate({
    badgeText: `New Task Assigned • ${task.priority} Priority`,
    badgeColor: task.priority === 'Urgent' || task.priority === 'High' ? '#be123c' : '#056839',
    title: task.taskTitle,
    greeting: `Dear ${assignees.map((a) => a.name).join(', ')},`,
    leadHtml: `A new operational task has been assigned to you in the <strong>FDA-FROO Task Tracker</strong> by <strong>${task.createdBy}</strong>. Please review the details below:`,
    detailsRows: [
      { label: 'Task Reference ID', value: task.id },
      { label: 'DTN (Tracking No.)', value: task.dtn || 'N/A' },
      { label: 'Category / Origin', value: `${task.category} (${task.origin})` },
      { label: 'Assigned Personnel', value: task.assignedTo },
      { label: 'Region / Office', value: task.region },
      { label: 'Due Date', value: task.dueDate || 'Not specified' },
      ...(task.scheduledDate ? [{ label: 'Scheduled Date', value: task.scheduledDate }] : []),
      { label: 'Location / Site', value: task.location || 'In-Office / Regional Jurisdiction' },
      ...(task.description ? [{ label: 'Operational Instructions', value: task.description }] : []),
    ],
    calloutTitle: 'Action Required: Acknowledge & Receive Task',
    calloutHtml:
      'Please sign in to the <strong>FDA-FROO Task Tracker Portal</strong>, go to your <strong>Tasks to Receive</strong> or <strong>My Tasks</strong> tab, and click <strong>"Receive & Accept Task"</strong> to officially acknowledge receipt and move this task into <em>In Progress</em> status.',
  });

  return sendSystemEmail({
    to: recipientEmails,
    subject: `[FDA-FROO Task Assigned] ${task.taskTitle} (DTN: ${task.dtn || 'N/A'})`,
    html,
  });
}

/**
 * 2. TASK RECEIVED CONFIRMATION & REMINDER TO UPDATE PROGRESS
 */
export async function sendTaskReceivedNotification(params: {
  task: {
    id: string;
    dtn?: string;
    taskTitle: string;
    category: string;
    region: string;
    dueDate: string;
    assignedTo: string;
  };
  receiver: {
    name: string;
    email: string;
    office: string;
    role: string;
  };
  creatorEmail?: string | null;
}) {
  const { task, receiver, creatorEmail } = params;

  // Send confirmation & update guide to the staff who received the task
  const receiverHtml = wrapFdaEmailTemplate({
    badgeText: 'Task Officially Received • In Progress',
    badgeColor: '#0284c7',
    title: `Receipt Confirmed: ${task.taskTitle}`,
    greeting: `Dear ${receiver.name},`,
    leadHtml: `You have officially <strong>received and accepted</strong> task <strong>${task.id}</strong> into <em>In Progress</em> execution.`,
    detailsRows: [
      { label: 'Task Reference ID', value: task.id },
      { label: 'DTN (Tracking No.)', value: task.dtn || 'N/A' },
      { label: 'Task Title', value: task.taskTitle },
      { label: 'Region / Office', value: task.region },
      { label: 'Target Due Date', value: task.dueDate || 'Not specified' },
      { label: 'Current Status', value: 'In Progress' },
    ],
    calloutTitle: 'Next Steps & Progress Updates Reminder',
    calloutHtml:
      'As you carry out this assignment, please remember to:<br/>• Log milestones or site updates under <strong>Activity History (+ Add Activity Log)</strong> inside the Task Details drawer.<br/>• Click <strong>"Mark as Completed"</strong> and record the final Regulatory Outcome once all deliverables are fulfilled.',
    calloutBg: '#f0f9ff',
    calloutBorder: '#0284c7',
  });

  const result = await sendSystemEmail({
    to: receiver.email,
    cc: creatorEmail && creatorEmail.toLowerCase() !== receiver.email.toLowerCase() ? [creatorEmail] : undefined,
    subject: `[FDA-FROO Task In Progress] ${task.taskTitle} — Received by ${receiver.name}`,
    html: receiverHtml,
  });

  return result;
}

/**
 * 3. TASK REMINDER / FOLLOW-UP EMAIL (Pending Receipt OR Progress Update / Due Date Reminder)
 */
export async function sendTaskReminderNotification(params: {
  task: {
    id: string;
    dtn?: string;
    taskTitle: string;
    category: string;
    region: string;
    dueDate: string;
    status: string;
    priority: string;
    assignedTo: string;
    assignedToUserId?: string | null;
    receivedByEmail?: string | null;
  };
  senderName: string;
  customNote?: string;
}) {
  const { task, senderName, customNote } = params;
  const assignees = await resolveTaskAssigneeEmails(task.assignedTo, task.assignedToUserId);
  const recipientEmails = assignees.map((a) => a.email);
  if (task.receivedByEmail && !recipientEmails.includes(task.receivedByEmail.toLowerCase())) {
    recipientEmails.push(task.receivedByEmail.toLowerCase());
  }

  if (recipientEmails.length === 0) {
    return {
      sent: false,
      mode: 'none',
      recipients: [],
      error: `Could not find an active @fda.gov.ph email address in the User Directory for "${task.assignedTo}".`,
    };
  }

  const isUnreceived = task.status === 'Open';
  const badgeText = isUnreceived
    ? 'Action Required • Task Awaiting Receipt'
    : `Task Follow-Up & Update Reminder • ${task.status}`;

  const actionInstruction = isUnreceived
    ? 'This task is currently marked as <strong>Open (Unreceived)</strong>. Please log into the FDA-FROO Task Tracker Portal and click <strong>"Receive & Accept Task"</strong> to confirm receipt and begin execution.'
    : 'You previously received this task into <strong>In Progress</strong> status. Please log into the FDA-FROO Task Tracker Portal to <strong>post your latest progress in the Activity Log</strong> or <strong>Mark the Task as Completed</strong> if execution has concluded.';

  const html = wrapFdaEmailTemplate({
    badgeText,
    badgeColor: '#d97706',
    title: `Reminder: ${task.taskTitle}`,
    greeting: `Dear ${assignees.length > 0 ? assignees.map((a) => a.name).join(', ') : task.assignedTo},`,
    leadHtml: `This is an official follow-up reminder sent by <strong>${senderName}</strong> regarding your assigned operational task in the <strong>FDA-FROO Task Tracker</strong>.`,
    detailsRows: [
      { label: 'Task Reference ID', value: task.id },
      { label: 'DTN (Tracking No.)', value: task.dtn || 'N/A' },
      { label: 'Current Status', value: task.status },
      { label: 'Priority', value: task.priority },
      { label: 'Region / Office', value: task.region },
      { label: 'Due Date', value: task.dueDate || 'Not specified' },
      ...(customNote ? [{ label: 'Note from Sender', value: customNote }] : []),
    ],
    calloutTitle: isUnreceived ? 'Please Receive & Accept This Task' : 'Please Update Task Progress / Outcome',
    calloutHtml: actionInstruction,
    calloutBg: '#fffbeb',
    calloutBorder: '#d97706',
  });

  return sendSystemEmail({
    to: recipientEmails,
    subject: `[FDA-FROO Reminder] ${isUnreceived ? 'Please Receive Task' : 'Please Update Task'}: ${task.taskTitle}`,
    html,
  });
}

/**
 * 4. ACCOUNT REGISTRATION & APPROVAL EMAILS
 */
export async function sendAccountRegistrationEmails(user: {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  position: string;
  office: string;
}) {
  // Email 1: To the staff member who registered
  const staffHtml = wrapFdaEmailTemplate({
    badgeText: 'Registration Submitted • Pending Approval',
    badgeColor: '#0284c7',
    title: 'Your FDA-FROO Portal Registration Has Been Received',
    greeting: `Dear ${user.firstName} ${user.lastName},`,
    leadHtml:
      'Thank you for registering your official staff account in the <strong>FDA Field Regulatory Operations Office (FROO) Task Tracker</strong>.',
    detailsRows: [
      { label: 'Full Name', value: `${user.firstName} ${user.lastName}` },
      { label: 'Username', value: user.username },
      { label: 'Official Email', value: user.email },
      { label: 'Position / Designation', value: user.position },
      { label: 'Assigned Office / Region', value: user.office },
      { label: 'Account Status', value: 'Pending Administrator Approval' },
    ],
    calloutTitle: 'What Happens Next?',
    calloutHtml:
      'An ODDG-FROO Administrator will review and approve your account. You will receive another email notification as soon as your account is activated and ready for sign-in.',
    calloutBg: '#f0f9ff',
    calloutBorder: '#0284c7',
  });

  await sendSystemEmail({
    to: user.email,
    subject: '[FDA-FROO Portal] Account Registration Received (Pending Approval)',
    html: staffHtml,
  });

  // Email 2: Alert to oddgfroo@fda.gov.ph administrator
  const adminHtml = wrapFdaEmailTemplate({
    badgeText: 'Admin Action Required • New Staff Registration',
    badgeColor: '#d97706',
    title: `New Account Awaiting Approval: ${user.firstName} ${user.lastName}`,
    greeting: 'Dear ODDG-FROO Administrator,',
    leadHtml:
      'A new FDA staff member has submitted an account registration and is awaiting your approval in the <strong>User & Access</strong> panel.',
    detailsRows: [
      { label: 'Applicant Name', value: `${user.firstName} ${user.lastName}` },
      { label: 'Username', value: user.username },
      { label: 'FDA Email', value: user.email },
      { label: 'Position', value: user.position },
      { label: 'Regional / Field Office', value: user.office },
    ],
    calloutTitle: 'How to Approve',
    calloutHtml:
      'Open the FDA-FROO Task Tracker Portal, click <strong>Users & Access</strong> in the top navigation bar, filter by <strong>Pending Approval</strong>, and click <strong>Approve</strong>.',
    calloutBg: '#fffbeb',
    calloutBorder: '#d97706',
  });

  return sendSystemEmail({
    to: DEFAULT_SENDER_EMAIL,
    subject: `[FDA-FROO Admin Alert] New Staff Registration: ${user.firstName} ${user.lastName} (${user.office})`,
    html: adminHtml,
  });
}

/**
 * 5. ACCOUNT APPROVED / ACTIVATED EMAIL
 */
export async function sendAccountApprovedEmail(user: {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  position: string;
  office: string;
  approvedByName?: string;
  temporaryPassword?: string;
}) {
  const html = wrapFdaEmailTemplate({
    badgeText: 'Account Approved & Active',
    badgeColor: '#056839',
    title: 'Welcome to the FDA-FROO Task Tracker Portal',
    greeting: `Dear ${user.firstName} ${user.lastName},`,
    leadHtml: `Your official FDA-FROO staff account has been <strong>approved and activated</strong>${
      user.approvedByName ? ` by <strong>${user.approvedByName}</strong>` : ''
    }. You may now sign in to view, receive, and manage your assigned regulatory tasks.`,
    detailsRows: [
      { label: 'Full Name', value: `${user.firstName} ${user.lastName}` },
      { label: 'Username', value: user.username },
      { label: 'Official Email', value: user.email },
      { label: 'Position / Role', value: user.position },
      { label: 'Office / Jurisdiction', value: user.office },
      ...(user.temporaryPassword
        ? [{ label: 'Initial Password', value: `${user.temporaryPassword} (Please change after signing in)` }]
        : []),
      { label: 'Account Status', value: 'Active — Ready for Sign-In' },
    ],
    calloutTitle: 'Getting Started',
    calloutHtml:
      'Sign in using your FDA username or email address. Check your <strong>Tasks to Receive</strong> tab regularly to acknowledge newly dispatched assignments.',
  });

  return sendSystemEmail({
    to: user.email,
    subject: '[FDA-FROO Portal] Your Staff Account is Now Approved & Active',
    html,
  });
}
