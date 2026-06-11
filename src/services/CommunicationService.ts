import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CommunicationService {
  /**
   * Universal method to send emails using Brevo (Sendinblue) API
   */
  static async sendEmail(to: string[], subject: string, htmlContent: string): Promise<void> {
    try {
      console.log(`[DEBUG] Attempting to send email via Brevo to ${to} with subject: ${subject}`);
      
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY || '',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { 
            name: 'HEQ Store', 
            email: process.env.BREVO_SENDER_EMAIL || 'info@heq-store.com' 
          },
          to: to.map(email => ({ email })),
          subject: subject,
          htmlContent: htmlContent
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Brevo API Error:', errorData);
      } else {
        console.log(`Email sent via Brevo successfully!`);
      }
    } catch (error) {
      console.error('Failed to send email via Brevo:', error);
      // We don't throw error to not break the registration flow during dev testing
    }
  }

  /**
   * Base Wrapper for HEQ Store Styling
   */
  static wrapHtml(content: string): string {
    return `
      <div dir="rtl" style="font-family: 'Cairo', 'Tajawal', 'Inter', sans-serif; padding: 40px 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; max-width: 600px; margin: auto; text-align: right; line-height: 1.8; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; letter-spacing: 2px; margin: 0;">HEQ STORE</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 5px;">تسوق من العالم، بكل بساطة</p>
        </div>
        ${content}
      </div>
    `;
  }

  static formatOtpBox(otp: string): string {
    return `
      <div style="margin: 30px 0; text-align: center;">
        <span style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 15px 30px; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
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
      <h2 style="color: #60a5fa; margin-bottom: 20px; font-size: 24px;">تأكيد إنشاء الحساب 🚀</h2>
      <p style="font-size: 16px;">مرحباً يا <strong>"${userName}"</strong>، طابت أوقاتك بكل خير!</p>
      <p style="font-size: 16px;">لقد خطوت خطوتك الأولى نحو تجربة تسوق استثنائية! لقد قمت بالتسجيل في <strong>HEQ Store</strong> باستخدام هذا البريد الإلكتروني. ولضمان أمان حسابك وخصوصيتك، أرسلنا لك رمز التحقق التالي:</p>
      
      ${this.formatOtpBox(otp)}
      
      <div style="margin-top: 20px; padding: 15px; background-color: rgba(59, 130, 246, 0.1); border-radius: 8px; border-right: 4px solid #3b82f6;">
        <p style="color: #94a3b8; font-size: 14px; margin: 0;"><strong>#ملاحظة هامة:</strong> هذا الرمز صالح للاستخدام مرة واحدة فقط، وسينتهي صلاحيته خلال 15 دقيقة لدواعي أمنية.</p>
      </div>
      
      <p style="font-size: 16px; margin-top: 20px;">الرجاء العودة إلى التطبيق وإدخال هذا الرمز في الخانة المخصصة لإكمال عملية تسجيل الدخول بنجاح والانطلاق في عالم التسوق بلا حدود!</p>
      
      <hr style="border-color: #334155; margin: 30px 0;" />
      <p style="color: #64748b; font-size: 12px; text-align: center;">رسالة تلقائية ومؤمنة بالكامل تم إرسالها إلى "${userEmail}". إذا لم تكن أنت من طلب هذا الرمز، نرجو منك تجاهل هذه الرسالة فوراً.</p>
    `;
    return this.wrapHtml(content);
  }

  /**
   * 2. Password Reset OTP Template
   */
  static getPasswordResetOtpHtml(userName: string, userEmail: string, otp: string): string {
    const content = `
      <h2 style="color: #60a5fa; margin-bottom: 20px; font-size: 24px;">طلب إعادة تعيين كلمة المرور 🔐</h2>
      <p style="font-size: 16px;">مرحباً يا <strong>"${userName}"</strong>، طاب يومك!</p>
      <p style="font-size: 16px;">لقد تلقينا طلباً للتو يفيد بأنك نسيت كلمة المرور الخاصة بحسابك "${userEmail}" وترغب في تعيين كلمة مرور جديدة آمنة.</p>
      <p style="font-size: 16px;">رمز التحقق الخاص بك لإتمام هذه العملية هو:</p>
      
      ${this.formatOtpBox(otp)}
      
      <p style="color: #94a3b8; font-size: 14px; margin-top: 20px;"><strong>ملاحظة:</strong> هذا الرمز مخصص لهذه العملية فقط وسيصبح غير صالح بعد استخدامه.</p>
      
      <div style="margin-top: 30px; padding: 20px; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155;">
        <h4 style="color: #f87171; margin-top: 0; margin-bottom: 10px;">إجراء أمني طارئ:</h4>
        <p style="font-size: 14px; margin-bottom: 15px;">إذا لم تكن أنت من طلب هذا التغيير، فهذا يعني أن هناك محاولة غير مصرح بها للوصول إلى حسابك. لا تقلق، حسابك لا يزال آمناً ولن يتمكن أحد من تغييره بدون هذا الرمز. ننصحك بالقيام بما يلي:</p>
        <ul style="list-style-type: none; padding: 0; font-size: 14px; margin: 0;">
          <li style="margin-bottom: 8px;">• تسجيل الدخول وتغيير كلمة المرور الخاصة بك فورا.</li>
          <li>• تسجيل الخروج من جميع الأجهزة النشطة الأخرى.</li>
        </ul>
      </div>

      <hr style="border-color: #334155; margin: 30px 0;" />
      <p style="color: #64748b; font-size: 12px; text-align: center;">نظام حماية HEQ Store - هذه رسالة آلية تم إرسالها إلى "${userEmail}".</p>
    `;
    return this.wrapHtml(content);
  }

  /**
   * 3. Welcome Message (Sent after verification)
   */
  static getWelcomeHtml(userName: string, userEmail: string): string {
    const content = `
      <h2 style="color: #60a5fa; margin-bottom: 20px; font-size: 26px;">مرحباً بك في عائلة HEQ Store! 🌟</h2>
      <p style="font-size: 16px;">مرحباً يا <strong>"${userName}"</strong>، يسعدنا جداً انضمامك إلينا!</p>
      <p style="font-size: 16px;">لقد تم تأكيد ربط حسابك "${userEmail}" بالمتجر بنجاح. لقد انضممت الآن إلى منصة التجارة الإلكترونية الأسرع نمواً والأكثر موثوقية في المنطقة!</p>
      
      <div style="margin: 35px 0; padding: 25px; background-color: #1e293b; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid #334155;">
        <h3 style="color: #38bdf8; margin-top: 0; margin-bottom: 20px; font-size: 20px; border-bottom: 1px solid #334155; padding-bottom: 10px;">أشياء رائعة تنتظرك في منصتنا! 🛍️</h3>
        <ul style="padding-right: 25px; line-height: 2.2; margin: 0; font-size: 15px; color: #e2e8f0;">
          <li><strong style="color: #60a5fa;">تسوق بلا حدود:</strong> اطلب أي منتج من منصات عالمية ضخمة مثل (Shein و Temu) ونحن نتكفل بالباقي!</li>
          <li><strong style="color: #60a5fa;">الشفافية المطلقة:</strong> لا رسوم خفية. نظامنا الذكي يحسب لك تكاليف الجمارك والشحن بدقة قبل الدفع.</li>
          <li><strong style="color: #60a5fa;">المحفظة الذكية (HEQ Wallet):</strong> نظام محافظ مالية آمن بالكامل لتسهيل الشحن واسترداد الأموال بشكل فوري.</li>
          <li><strong style="color: #60a5fa;">نظام المندوبين (Escrow):</strong> أموالك في أمان تام! نحن نحتجز المبلغ لدينا ولا نسلمه للمندوب إلا بعد استلامك للطلب!</li>
          <li><strong style="color: #60a5fa;">تتبع حي ولحظي:</strong> راقب طلباتك خطوة بخطوة من لحظة الشراء وحتى وصولها لباب منزلك في سوريا أو الأردن.</li>
        </ul>
      </div>

      <p style="font-size: 16px; margin-top: 20px;">نحن نعمل باستمرار على تطوير خدماتنا لتوفير تجربة تسوق لا تُنسى. نتمنى لك قضاء وقت ممتع في تصفح وشراء ما تحب!</p>
      <p style="font-size: 16px; margin-bottom: 30px;">إذا كان لديك أي استفسار، اقتراح، أو حتى ملاحظة، فريق الدعم الفني لدينا جاهز ومستعد لخدمتك على مدار الساعة عبر التطبيق.</p>
      
      <p style="font-size: 16px; font-weight: bold; color: #94a3b8;">شكراً لاختياركم HEQ Store، الخيار الأذكى للتسوق.</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #334155; text-align: center;">
        <p style="font-size: 13px; color: #64748b;">
          يمكنك قراءة سياساتنا وشروطنا في أي وقت عبر الضغط على الروابط أدناه:<br>
          <a href="#" style="color: #3b82f6; text-decoration: none; margin-left: 20px; display: inline-block; margin-top: 10px;">سياسة الخصوصية</a>
          <a href="#" style="color: #3b82f6; text-decoration: none; margin-left: 20px; display: inline-block; margin-top: 10px;">شروط استخدام المتجر</a>
          <a href="#" style="color: #3b82f6; text-decoration: none; display: inline-block; margin-top: 10px;">سياسة الاسترجاع (Escrow)</a>
        </p>
      </div>
    `;
    return this.wrapHtml(content);
  }

  /**
   * Broadcast HTML and save Notification
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
