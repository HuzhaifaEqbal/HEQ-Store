import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

export class CommunicationService {
  /**
   * Send an HTML Email using Resend
   */
  static async sendEmail(to: string[], subject: string, htmlContent: string): Promise<void> {
    try {
      await resend.emails.send({
        from: 'HEQ-Store Updates <noreply@heq-store.com>',
        to,
        subject,
        html: htmlContent,
      });
      console.log(`Email sent to ${to.length} recipients.`);
    } catch (error) {
      console.error('Failed to send email via Resend', error);
      throw error;
    }
  }

  /**
   * Pre-built Order Status HTML Template
   */
  static getOrderStatusHtml(userName: string, orderId: string, status: string, estimatedDelivery: Date): string {
    return `
      <div style="font-family: 'Cairo', 'Inter', sans-serif; padding: 20px; background-color: #f9fafb; color: #111827; border-radius: 12px; max-width: 600px; margin: auto;">
        <h2 style="color: #4f46e5;">Order Status Update</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Your order (<strong>#${orderId}</strong>) has been updated to: <span style="background-color: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${status}</span></p>
        <p>Estimated Delivery Date: <strong>${estimatedDelivery.toDateString()}</strong></p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
          <p>Thank you for shopping with HEQ-Store.</p>
        </div>
      </div>
    `;
  }

  /**
   * Send Bulk Email & Push In-App Notification
   */
  static async broadcastMessage(userIds: string[], titleEn: string, titleAr: string, htmlContent: string): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, isDeleted: false },
        select: { id: true, email: true }
      });

      if (users.length === 0) return;

      const emails = users.map(u => u.email);

      // 1. Send Email via Resend
      await this.sendEmail(emails, titleEn, htmlContent);

      // 2. Save In-App Notifications
      const notifications = users.map(user => ({
        userId: user.id,
        titleEn,
        titleAr,
        bodyEn: 'Tap to view details',
        bodyAr: 'انقر لعرض التفاصيل',
        htmlContent,
      }));

      await prisma.notification.createMany({
        data: notifications
      });

    } catch (error) {
      console.error('Broadcast failed', error);
      throw error;
    }
  }
}
