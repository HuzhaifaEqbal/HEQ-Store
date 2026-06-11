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
      console.log(`[DEBUG] Attempting to send email to ${to} with subject: ${subject}`);
      
      const response = await resend.emails.send({
        from: 'Hajeen Platform <noreply@hajeen.com>', // Reverted back to the verified domain
        to,
        subject,
        html: htmlContent,
      });
      console.log(`Email sent via Resend successfully! Response ID:`, response.data?.id);
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      // We don't throw error to not break the registration flow during dev testing
    }
  }

  /**
   * Base Wrapper for Hajeen Dark Mode Styling
   */
  static wrapHtml(content: string): string {
    return `
      <div dir="rtl" style="font-family: 'Cairo', 'Tajawal', 'Inter', sans-serif; padding: 40px 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; max-width: 600px; margin: auto; text-align: right; line-height: 1.8;">
        ${content}
      </div>
    `;
  }

  static formatOtpBox(otp: string): string {
    return `
      <div style="margin: 30px 0; text-align: center;">
        <span style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 15px 30px; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 8px;">
          ${otp}
        </span>
      </div>
    `;
  }

  /**
   * 1. Registration OTP Template
   */
  static getRegistrationOtpHtml(userName: string, userEmail: string, otp: string): string {
    const content = `
      <h2 style="color: #60a5fa; margin-bottom: 20px;">تأكيد إنشاء الحساب</h2>
      <p>مرحباً يا <strong>"${userName}"</strong>، طابت أوقاتك!</p>
      <p>لقد قمت بالتسجيل إلى منصة <strong>"هَجين"</strong> عن طريق إدخالك هذا الجيميل، ولذلك بدورنا نحن نرسل لك رمز التحقق التالي:</p>
      
      ${this.formatOtpBox(otp)}
      
      <p style="color: #94a3b8; font-size: 14px;"><strong>#ملاحظة:</strong> هذا الرمز صالح للإدخال مرة واحدة فقط وهو مؤقت.</p>
      <p>يمكنك إدخال هذا الرمز في الخانة الخاصة به في التطبيق لإكمال عملية تسجيل الدخول التي بدأت بها بنجاح!</p>
      
      <hr style="border-color: #334155; margin: 30px 0;" />
      <p style="color: #64748b; font-size: 12px;">تم إرسال هذا الإيميل إلى "${userEmail}". إذا لم تكن أنت، يمكنك تجاهل الرسالة لأنها مرسلة تلقائياً من النظام.</p>
    `;
    return this.wrapHtml(content);
  }

  /**
   * 2. Password Reset OTP Template
   */
  static getPasswordResetOtpHtml(userName: string, userEmail: string, otp: string): string {
    const content = `
      <h2 style="color: #60a5fa; margin-bottom: 20px;">طلب تغيير كلمة مرورك</h2>
      <p>مرحباً يا <strong>"${userName}"</strong>، طاب يومك!</p>
      <p>لقد طلبت إعادة تعيين كلمة مرورك لحسابك "${userEmail}" في منصة <strong>"هَجين"</strong>؟</p>
      <p>رمز التحقق الخاص بك لنجاح العملية هو:</p>
      
      ${this.formatOtpBox(otp)}
      
      <p style="color: #94a3b8; font-size: 14px;"><strong>ملاحظة:</strong> هذا الرمز صالح للإدخال مرة واحدة فقط وهو مؤقت.</p>
      <p>يمكنك إدخال هذا الرمز في الخانة الخاصة بتغيير كلمة المرور في التطبيق لإكمال العملية التي بدأت بها بنجاح!</p>
      
      <div style="margin-top: 30px; padding: 20px; background-color: #1e293b; border-radius: 8px;">
        <p style="font-size: 14px;">إذا لم تكن أنت من بدأ بهذه العملية، لا تقلق واترك الأمر لنا. ما عليك سوى الدخول إلى حسابك وتسجيل الخروج من جميع الأجهزة الحالية، أو يمكنك زيارة:</p>
        <ul style="list-style-type: none; padding: 0; font-size: 14px;">
          <li><a href="#" style="color: #3b82f6; text-decoration: none;">رابط للمساعدة</a></li>
          <li><a href="#" style="color: #3b82f6; text-decoration: none;">رابط تغيير كلمة المرور</a></li>
        </ul>
      </div>

      <hr style="border-color: #334155; margin: 30px 0;" />
      <p style="color: #64748b; font-size: 12px;">هذه الرسالة مرسلة تلقائياً من النظام إلى "${userEmail}". إذا لم تكن أنت، يمكنك تجاهل الرسالة.</p>
    `;
    return this.wrapHtml(content);
  }

  /**
   * 3. Welcome Message (Sent after verification)
   */
  static getWelcomeHtml(userName: string, userEmail: string): string {
    const content = `
      <h2 style="color: #60a5fa; margin-bottom: 20px;">مرحباً بك في هَجين!</h2>
      <p>مرحباً يا <strong>"${userName}"</strong>، طاب يومك!</p>
      <p>لقد قمت بربط حسابك هذا "${userEmail}" بمنصة <strong>"هَجين"</strong>، هل هذا صحيح؟</p>
      <p>أهلاً بك في منصة "هَجين"! يمكنك البدء باستخدام حسابك بحرية تامة، ويمكنك زيارة الموقع الرسمي لمعرفة المزيد: <a href="#" style="color: #3b82f6;">رابط الموقع</a></p>
      
      <div style="margin: 30px 0; padding: 20px; background-color: #1e293b; border-radius: 8px;">
        <h3 style="color: #38bdf8; margin-top: 0;">أمور مهمة يجب أن تعرفها عن منصتنا!</h3>
        <ul style="padding-right: 20px; line-height: 2;">
          <li><strong>لماذا هَجين؟</strong> لأنها مبنية على مبدأ واحد "رأيك، ملك لك".</li>
          <li>لا يوجد قمع لأي محتوى لا يخالف الكتب السماوية أو يقلل منها!</li>
          <li>مراقبة دائمة للمحتويات وتطوير مستمر.</li>
          <li>موديلات AI شبه مجانية!</li>
          <li>تخزين ذكرياتك ولحظاتك في مكان آمن!</li>
        </ul>
      </div>

      <p>نتمنى لك يوماً سعيداً، إذا كان لديك أي سؤال / اعتراض / اقتراح يمكننا استقباله بكل حب عبر موقعنا أو عبر التواصل المباشر داخل التطبيق!</p>
      <p>شكراً لاستخدامكم خدماتنا المتواضعة.</p>
      
      <p style="font-size: 14px; margin-top: 30px;">
        يمكنك قراءة ما يلي عبر الضغط:<br>
        <a href="#" style="color: #3b82f6; text-decoration: none; margin-left: 15px;">سياسة الخصوصية</a>
        <a href="#" style="color: #3b82f6; text-decoration: none;">بنود الخدمة</a>
      </p>
    `;
    return this.wrapHtml(content);
  }

  /**
   * Broadcast HTML and save Notification (Existing)
   */
  static async broadcastMessage(userIds: string[], titleEn: string, titleAr: string, htmlContent: string): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, isDeleted: false },
        select: { id: true, email: true }
      });

      if (users.length === 0) return;
      const emails = users.map(u => u.email);

      await this.sendEmail(emails, titleEn, htmlContent);

      const notifications = users.map(user => ({
        userId: user.id,
        titleEn,
        titleAr,
        bodyEn: 'Tap to view details',
        bodyAr: 'انقر لعرض التفاصيل',
        htmlContent,
      }));

      await prisma.notification.createMany({ data: notifications });
    } catch (error) {
      console.error('Broadcast failed', error);
      throw error;
    }
  }
}
