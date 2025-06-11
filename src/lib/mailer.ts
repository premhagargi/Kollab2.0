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
      'Email credentials (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS) are not fully set in .env. Email sending will be disabled.'
    );
  } else {
    console.error(
      'CRITICAL: Email credentials are not set. Email sending will fail.'
    );
  }
}

let transporter: Transporter | null = null;

if (emailHost && emailPort && emailUser && emailPass) {
  console.log('Creating nodemailer transporter...');
  transporter = nodemailer.createTransport({
    host: emailHost,
    port: parseInt(emailPort, 10),
    secure: parseInt(emailPort, 10) === 465, // true for 465, false for others
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('Verifying transporter connection...');
    transporter.verify(function (error, success) {
      if (error) {
        console.error('Nodemailer transporter verification error:', error);
      } else {
        console.log('Nodemailer transporter is ready to send emails.');
      }
    });
  }
} else {
  console.warn('Transporter was not created due to missing credentials.');
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
    console.error('Email transporter not initialized. Cannot send email.');
    return false;
  }

  if (!options.from) {
    console.error('EMAIL_FROM is not set in .env. Cannot send email.');
    return false;
  }

  console.log('Sending email with the following options:');
  console.log(`From: ${options.from}`);
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`Text: ${options.text || '(none)'}`);
  console.log(`HTML: ${options.html ? '(HTML content present)' : '(none)'}`);

  try {
    const info = await transporter.sendMail(options);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};
