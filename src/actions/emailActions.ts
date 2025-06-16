
// src/actions/emailActions.ts
'use server';

import { sendMail } from '@/lib/mailer';
import { siteConfig } from '@/config/site';

interface TeamInvitationParams {
  toEmail: string;
  workspaceName: string; 
  inviterName: string;
  inviteLink?: string; 
}

export async function sendTeamInvitationEmailAction({
  toEmail,
  workspaceName,
  inviterName,
  inviteLink = process.env.NEXT_PUBLIC_BASE_URL || 'your-app-url.com', 
}: TeamInvitationParams): Promise<{ success: boolean; message: string }> {
  const fromEmail = process.env.EMAIL_FROM;
  if (!fromEmail) {
    return { success: false, message: 'Sender email address is not configured.' };
  }

  const subject = `You've been invited to ${workspaceName} on ${siteConfig.name}!`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Hi there,</h2>
      <p>You've been invited by <strong>${inviterName}</strong> to collaborate on the workspace/board "<strong>${workspaceName}</strong>" on ${siteConfig.name}.</p>
      <p>Join them by clicking the link below:</p>
      <p><a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
      <p>If you were not expecting this invitation, you can safely ignore this email.</p>
      <p>Thanks,<br/>The ${siteConfig.name} Team</p>
    </div>
  `;

  const success = await sendMail({
    from: fromEmail,
    to: toEmail,
    subject: subject,
    html: htmlContent,
  });

  if (success) {
    return { success: true, message: 'Invitation email sent successfully.' };
  } else {
    return { success: false, message: 'Failed to send invitation email.' };
  }
}


interface TaskAssignmentParams {
  toEmail: string;
  taskTitle: string;
  assignerName: string;
  boardName: string;
  taskLink?: string; 
}

export async function sendTaskAssignmentEmailAction({
  toEmail,
  taskTitle,
  assignerName,
  boardName,
  taskLink = process.env.NEXT_PUBLIC_BASE_URL || 'your-app-url.com', 
}: TaskAssignmentParams): Promise<{ success: boolean; message: string }> {
  const fromEmail = process.env.EMAIL_FROM;
  if (!fromEmail) {
    return { success: false, message: 'Sender email address is not configured.' };
  }

  console.log(`[Mock Email] Task "${taskTitle}" assigned to ${toEmail} by ${assignerName} on board "${boardName}". Link: ${taskLink}`);

  const subject = `You've been assigned a new task on ${siteConfig.name}: ${taskTitle}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Hi there,</h2>
      <p><strong>${assignerName}</strong> has assigned you a new task: "<strong>${taskTitle}</strong>" on the board "<strong>${boardName}</strong>".</p>
      <p>You can view the task details here:</p>
      <p><a href="${taskLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Task</a></p>
      <p>Thanks,<br/>The ${siteConfig.name} Team</p>
    </div>
  `;
  
  return { success: true, message: 'Task assignment email would be sent (currently mocked).' };
}


interface AutomatedClientUpdateParams {
  toEmail: string;
  clientName?: string; // Optional, for personalization
  workflowName: string;
  summaryText: string; // The AI-generated summary
  workflowLink?: string; // Optional: Link to view the workflow/board
}

export async function sendAutomatedClientUpdateEmailAction({
  toEmail,
  clientName,
  workflowName,
  summaryText,
  workflowLink = process.env.NEXT_PUBLIC_BASE_URL || 'your-app-url.com',
}: AutomatedClientUpdateParams): Promise<{ success: boolean; message: string }> {
  const fromEmail = process.env.EMAIL_FROM;
  if (!fromEmail) {
    return { success: false, message: 'Sender email address is not configured for automated updates.' };
  }

  const subject = `Progress Update for ${workflowName}`;
  
  // Basic Markdown to HTML conversion for the summary (replace newlines with <br>)
  const summaryHtml = summaryText.replace(/\n/g, '<br />');

  const greeting = clientName ? `Hi ${clientName},` : `Hi there,`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #222; border-bottom: 1px solid #eee; padding-bottom: 10px;">Progress Update: ${workflowName}</h2>
        <p>${greeting}</p>
        <p>Here's a summary of recent progress on the "${workflowName}" project/workflow:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 15px; margin-bottom: 20px;">
          ${summaryHtml}
        </div>
        ${workflowLink ? `<p>You can view the full workflow here: <a href="${workflowLink}" style="color: #007bff; text-decoration: none;">${workflowName} Details</a></p>` : ''}
        <p>If you have any questions, please don't hesitate to reach out.</p>
        <p>Best regards,<br/>The ${siteConfig.name} Team (on behalf of your project manager)</p>
      </div>
    </div>
  `;

  const success = await sendMail({
    from: fromEmail,
    to: toEmail,
    subject: subject,
    html: htmlContent,
  });

  if (success) {
    return { success: true, message: 'Automated client update email sent successfully.' };
  } else {
    return { success: false, message: 'Failed to send automated client update email.' };
  }
}
