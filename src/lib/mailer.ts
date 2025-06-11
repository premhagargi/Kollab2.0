
// src/lib/mailer.ts
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

const emailHost = process.env.EMAIL_HOST;
const emailPort = process.env.EMAIL_PORT;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

if (!emailHost || !emailPort || !emailUser || !emailPass) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'Email credentials (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS) are not fully set in .env. Email sending will be disabled.'
    );
  } else {
    // In production, you might want to throw an error or handle this more strictly
    console.error(
      'CRITICAL: Email credentials are not set. Email sending will fail.'
    );
  }
}

let transporter: Transporter | null = null;

if (emailHost && emailPort && emailUser && emailPass) {
  transporter = nodemailer.createTransport({
    host: emailHost,
    port: parseInt(emailPort, 10),
    secure: parseInt(emailPort, 10) === 465, // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  // Verify connection configuration in development
  if (process.env.NODE_ENV === 'development') {
    transporter.verify(function (error, success) {
      if (error) {
        console.error('Nodemailer transporter verification error:', error);
      } else {
        console.log('Nodemailer transporter is ready to send emails.');
      }
    });
  }
}


interface MailOptions {
  from: string; // sender address e.g. process.env.EMAIL_FROM
  to: string; // list of receivers
  subject: string; // Subject line
  text?: string; // plain text body
  html: string; // html body
}

export const sendMail = async (options: MailOptions): Promise<boolean> => {
  if (!transporter) {
    console.error('Email transporter not initialized. Cannot send email.');
    // Optionally, you could throw an error here or return a specific status
    return false; // Indicate failure
  }
  if (!options.from) {
    console.error('EMAIL_FROM is not set in .env. Cannot send email.');
    return false;
  }

  try {
    await transporter.sendMail(options);
    // console.log('Email sent successfully to:', options.to);
    return true; // Indicate success
  } catch (error) {
    console.error('Error sending email:', error);
    return false; // Indicate failure
  }
};
