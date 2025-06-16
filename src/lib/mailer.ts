
// src/lib/mailer.ts
import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions as NodemailerMailOptions } from 'nodemailer';

// Define a type for the mailer configuration, to be passed if needed
interface MailerTransportConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
  debug?: boolean;
  logger?: boolean;
}

let globalTransporter: Transporter | null = null;

const initializeGlobalTransporter = () => {
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailHost && emailPort && emailUser && emailPass) {
    console.log('Initializing global nodemailer transporter with process.env variables...');
    globalTransporter = nodemailer.createTransport({
      host: emailHost,
      port: parseInt(emailPort, 10),
      secure: parseInt(emailPort, 10) === 465,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
    });

    if (process.env.NODE_ENV === 'development') {
      globalTransporter.verify((error) => {
        if (error) {
          console.error('Global Nodemailer transporter verification error (using process.env):', error);
        } else {
          console.log('Global Nodemailer transporter (using process.env) is ready.');
        }
      });
    }
  } else {
    if (process.env.NODE_ENV !== 'production') { // Only warn loudly if not in prod and trying to use global
        console.warn(
        'Global transporter: Email credentials (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS) are not fully set in process.env. Global email sending will be disabled unless a specific config is passed to sendMail.'
        );
    }
  }
};

// Initialize global transporter on module load (for Next.js environment)
initializeGlobalTransporter();

interface MailOptions extends NodemailerMailOptions {
  // from, to, subject, html are already in NodemailerMailOptions
}

export const sendMail = async (
  options: MailOptions,
  transportConfig?: Partial<MailerTransportConfig> // Allow passing specific config for Cloud Functions
): Promise<boolean> => {
  let transporterToUse: Transporter | null = globalTransporter;

  if (transportConfig && transportConfig.host && transportConfig.port && transportConfig.auth?.user && transportConfig.auth?.pass) {
    // If a specific transportConfig is provided (and valid), create a new transporter instance
    console.log('Creating nodemailer transporter with provided transportConfig...');
    try {
        transporterToUse = nodemailer.createTransport({
            host: transportConfig.host,
            port: transportConfig.port,
            secure: transportConfig.secure !== undefined ? transportConfig.secure : transportConfig.port === 465,
            auth: {
                user: transportConfig.auth.user,
                pass: transportConfig.auth.pass,
            },
            connectionTimeout: transportConfig.connectionTimeout || 10000,
            greetingTimeout: transportConfig.greetingTimeout || 10000,
            socketTimeout: transportConfig.socketTimeout || 10000,
            debug: transportConfig.debug || process.env.NODE_ENV === 'development',
            logger: transportConfig.logger || process.env.NODE_ENV === 'development',
        });
         if (process.env.NODE_ENV === 'development' || transportConfig.debug) {
            const tempTransporter = transporterToUse; // To satisfy TS null check in callback
            tempTransporter.verify((error) => {
                if (error) {
                console.error('Nodemailer transporter verification error (using provided config):', error);
                } else {
                console.log('Nodemailer transporter (using provided config) is ready.');
                }
            });
        }
    } catch (e) {
        console.error("Failed to create transporter from provided config:", e);
        transporterToUse = null; // Fallback or ensure it's null if creation fails
    }
  }


  if (!transporterToUse) {
    console.error(
      'Email transporter not initialized. Cannot send email. Please check SMTP credentials (either in process.env for global or in passed config) and ensure they are correct, and the email server is reachable.'
    );
    return false;
  }

  const emailFrom = options.from || process.env.EMAIL_FROM; // Use options.from if provided, else fallback to env
  if (!emailFrom) {
    console.error('Sender email (options.from or EMAIL_FROM) is not set. Cannot send email.');
    return false;
  }
  
  const mailToSend = { ...options, from: emailFrom };

  console.log(`Sending email with Nodemailer. From: ${mailToSend.from}, To: ${mailToSend.to}, Subject: "${mailToSend.subject}"`);

  try {
    const info = await transporterToUse.sendMail(mailToSend);
    console.log('Email sent successfully by Nodemailer. Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email via Nodemailer:', error);
    return false;
  }
};
