import nodemailer from 'nodemailer';

export interface EmailAttachment {
  filename: string;
  content: ArrayBuffer | Uint8Array | Buffer;
}

export interface EmailOptions {
  to: string[];
  subject: string;
  htmlBody: string;
  attachments: EmailAttachment[];
}

export async function sendEmailWithPDF(
  options: EmailOptions,
  env: Env
): Promise<void> {
  // Create SMTP transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: env.GMAIL_USER,
      pass: env.GMAIL_APP_PASSWORD,
    },
  });

  // Convert attachments to Buffer format
  const formattedAttachments = options.attachments.map((att) => ({
    filename: att.filename,
    content: Buffer.from(att.content),
  }));

  // Send email
  await transporter.sendMail({
    from: `"USAR ICS System" <${env.GMAIL_USER}>`,
    to: options.to.join(', '),
    subject: options.subject,
    html: options.htmlBody,
    attachments: formattedAttachments,
  });
}

export function generateEmailTemplate(forms: any[]): string {
  const formCount = forms.length;
  const formsList = forms.map((form) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${form.id}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${form.incident_name || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${form.vehicle_type || 'N/A'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${form.inspector_name_print || 'N/A'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0066FF; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #0052CC; color: white; padding: 10px; text-align: left; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ICS-212 Vehicle Safety Inspection Forms</h1>
          </div>
          <div class="content">
            <p>This email contains <strong>${formCount}</strong> ICS-212 Vehicle Safety Inspection form${formCount > 1 ? 's' : ''}.</p>
            <p>The attached PDF${formCount > 1 ? 's contain' : ' contains'} completed vehicle safety inspection${formCount > 1 ? 's' : ''} for review.</p>
            
            <h3>Forms Included:</h3>
            <table>
              <thead>
                <tr>
                  <th>Form ID</th>
                  <th>Incident</th>
                  <th>Vehicle</th>
                  <th>Inspector</th>
                </tr>
              </thead>
              <tbody>
                ${formsList}
              </tbody>
            </table>

            <p><strong>Please review the attached documents and take appropriate action.</strong></p>
          </div>
          <div class="footer">
            <p>TASKFORCE IO - USAR ICS-212 System</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
