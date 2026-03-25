import { storage } from "../../storage";
import { logger } from "../../lib/logger";

function isEmailEnabled(): boolean {
  return (
    process.env.EMAIL_ENABLED === "true" &&
    (!!process.env.SENDGRID_API_KEY || process.env.SMTP_ENABLED === "true")
  );
}

function getEmailTransportName(): string | null {
  if (!isEmailEnabled()) return null;
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  if (process.env.SMTP_ENABLED === "true") return "smtp";
  return null;
}

function checkEmailConfiguration(): { configured: boolean; transport: string | null; warnings: string[] } {
  const warnings: string[] = [];
  const transport = getEmailTransportName();

  if (process.env.EMAIL_ENABLED !== "true") {
    warnings.push("EMAIL_ENABLED is not set to 'true' — email delivery is disabled");
  } else if (!process.env.SENDGRID_API_KEY && process.env.SMTP_ENABLED !== "true") {
    warnings.push("EMAIL_ENABLED is true but no transport configured (need SENDGRID_API_KEY or SMTP_ENABLED=true)");
  }

  return { configured: !!transport, transport, warnings };
}

function logEmailConfigurationStatus(): void {
  const { configured, transport, warnings } = checkEmailConfiguration();

  if (!configured) {
    logger.warn(
      { transport, warnings },
      "⚠️  EMAIL NOT CONFIGURED — All outbound emails will be logged but NOT delivered. " +
      "Set EMAIL_ENABLED=true and configure SENDGRID_API_KEY or SMTP_ENABLED=true to enable delivery."
    );
  } else {
    logger.info({ transport }, "Email transport configured and ready");
  }
}

type EmailOptions = {
  to: string;
  subject: string;
  htmlContent: string;
  plainText?: string;
};

async function sendViaSendGrid(
  options: EmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const sgMailModule = await import("@sendgrid/mail");
    const sgMail = sgMailModule.default || sgMailModule;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    const response = await sgMail.send({
      to: options.to,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@advisorintel.com",
      subject: options.subject,
      html: options.htmlContent,
      text: options.plainText,
    });

    return {
      success: true,
      messageId: (response as any)[0]?.headers?.["x-message-id"],
    };
  } catch (err: any) {
    logger.error({ err }, "SendGrid error");
    return { success: false, error: err.message };
  }
}

async function sendViaSMTP(
  options: EmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const nodemailerModule = await import("nodemailer");
    const nodemailer = nodemailerModule.default || nodemailerModule;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      to: options.to,
      from: process.env.SMTP_FROM_EMAIL || "noreply@advisorintel.com",
      subject: options.subject,
      html: options.htmlContent,
      text: options.plainText,
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function sendEmail(
  options: EmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isEmailEnabled()) {
    logger.info({ to: options.to, subject: options.subject }, "Email delivery skipped — no transport configured");

    await storage.createEmailLog({
      recipientEmail: options.to,
      subject: options.subject,
      status: "skipped_no_transport",
      errorMessage: "No email transport configured (SendGrid or SMTP required)",
    });

    return { success: false, error: "Email not configured" };
  }

  try {
    let result;
    if (process.env.SENDGRID_API_KEY) {
      result = await sendViaSendGrid(options);
    } else if (process.env.SMTP_ENABLED === "true") {
      result = await sendViaSMTP(options);
    } else {
      return { success: false, error: "No email provider configured" };
    }

    await storage.createEmailLog({
      recipientEmail: options.to,
      subject: options.subject,
      status: result.success ? "sent" : "failed",
      messageId: result.messageId,
      errorMessage: result.error,
    });

    return result;
  } catch (err: any) {
    logger.error({ err }, "API error");

    await storage.createEmailLog({
      recipientEmail: options.to,
      subject: options.subject,
      status: "failed",
      errorMessage: err.message,
    });

    return { success: false, error: err.message };
  }
}

async function sendFollowUpEmail(data: {
  clientName: string;
  clientEmail: string;
  advisorName: string;
  meetingNotes: string;
}): Promise<{ success: boolean; messageId?: string }> {
  const htmlContent = `
    <p>Dear ${data.clientName},</p>
    <p>Thank you for taking the time to meet with me. I wanted to follow up on our discussion.</p>
    ${data.meetingNotes ? `<p><strong>Summary:</strong><br/>${data.meetingNotes}</p>` : ""}
    <p>I will be working on the action items we discussed. Please don't hesitate to reach out with questions.</p>
    <p>Best regards,<br/>${data.advisorName}<br/>Senior Wealth Advisor, CFP<br/>OneDigital</p>
  `;

  return sendEmail({
    to: data.clientEmail,
    subject: "Follow-Up from Our Meeting",
    htmlContent,
    plainText: `Dear ${data.clientName},\n\nThank you for meeting with me. ${data.meetingNotes ? `Summary: ${data.meetingNotes}` : ""}\n\nBest regards,\n${data.advisorName}`,
  });
}

export { sendEmail, sendFollowUpEmail, isEmailEnabled, checkEmailConfiguration, logEmailConfigurationStatus };
