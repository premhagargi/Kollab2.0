// src/lib/mailer.ts
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

console.log('Initializing mailer...');

const emailHost = process.env.EMAIL_HOST;
const emailPort = process.env.EMAIL_PORT;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

console.log('Loaded email environment variables:');
console.log(`EMAIL_HOST: ${emailHost}`);
console.log(`EMAIL_PORT: ${emailPort}`);
console.log(`EMAIL_USER: ${emailUser}`);
console.log(`EMAIL_PASS: ${emailPass ? '***hidden***' : 'NOT SET'}`);

if (!emailHost || !emailPort || !emailUser || !emailPass) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'Email credentials (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS) are not fully set in .env.local. Email sending will be disabled.'
    );
  } else {
    console.error(
      'CRITICAL: Email credentials are not set in .env.local. Email sending will fail.'
    );
  }
}

let transporter: Transporter | null = null;

if (emailHost && emailPort && emailUser && emailPass) {
  console.log('Creating nodemailer transporter...');
  transporter = nodemailer.createTransport({
    host: emailHost,
    port: parseInt(emailPort, 10),
    secure: parseInt(emailPort, 10) === 465, // true for 465, false for other ports (TLS)
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000, // 10 seconds
    socketTimeout: 10000, // 10 seconds
    debug: process.env.NODE_ENV === 'development', // Enable SMTP debug output in development
    logger: process.env.NODE_ENV === 'development', // Log SMTP transactions to console in development
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('Verifying transporter connection (this may output a lot of debug info if debug/logger are true)...');
    transporter.verify(function (error, success) {
      if (error) {
        console.error('Nodemailer transporter verification error. This often indicates issues with credentials, host, port, or SSL/TLS settings:', error);
      } else {
        console.log('Nodemailer transporter is ready to send emails.');
      }
    });
  }
} else {
  console.warn('Transporter was not created due to missing/incomplete credentials in .env.local.');
}

interface MailOptions {
  from: string; // sender address
  to: string; // list of receivers
  subject: string; // Subject line
  text?: string; // plain text body
  html: string; // html body
}

export const sendMail = async (options: MailOptions): Promise<boolean> => {
  console.log('Preparing to send email...');
  if (!transporter) {
    console.error('Email transporter not initialized. Cannot send email. Please check your .env.local SMTP credentials (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS) and ensure they are correct, and the email server is reachable. Also check server logs for transporter creation issues.');
    return false;
  }

  if (!options.from) {
    console.error('EMAIL_FROM is not set in .env.local. Cannot send email.');
    return false;
  }

  console.log(`Sending email with Nodemailer. From: ${options.from}, To: ${options.to}, Subject: "${options.subject}"`);
  // console.log(`HTML content for email to ${options.to}:`, options.html); // Uncomment for deep debugging of content

  try {
    const info = await transporter.sendMail(options);
    console.log('Email sent successfully by Nodemailer. Message ID:', info.messageId);
    // For more detailed success info, uncomment the line below (can be verbose)
    // console.log('Full Nodemailer response info:', info);
    return true;
  } catch (error) {
    console.error('Error sending email via Nodemailer. This is likely an issue with SMTP server connection, authentication, or configuration:', error);
    return false;
  }
};
