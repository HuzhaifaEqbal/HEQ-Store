export class TelegramBotService {
  /**
   * Sends a message to the Admin's Telegram Chat
   */
  static async notifyAdmin(message: string): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn('[TelegramBotService] Missing Bot Token or Chat ID in environment variables. Notification skipped.');
      return;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        })
      });

      if (!response.ok) {
        console.error('[TelegramBotService] Failed to send message to Telegram', await response.text());
      } else {
        console.log('[TelegramBotService] Admin notified via Telegram successfully!');
      }
    } catch (error) {
      console.error('[TelegramBotService] Error connecting to Telegram API:', error);
    }
  }

  /**
   * Formats a new order notification
   */
  static async notifyNewOrder(orderId: string, customerName: string, totalPriceSyp: number, totalUsd: number, itemsCount: number): Promise<void> {
    const message = `
🚨 <b>طلب جديد من تطبيق HEQ Store!</b> 🚨

👤 <b>الزبون:</b> ${customerName}
💰 <b>المبلغ المدفوع:</b> ${totalPriceSyp.toLocaleString()} ل.س
💵 <b>يعادل بالدولار:</b> $${totalUsd.toFixed(2)}
📦 <b>عدد المنتجات:</b> ${itemsCount} منتج

يجب عليك الآن الدخول إلى لوحة تحكم الآدمن، شراء المنتجات من Temu/Shein، وتغيير حالة الطلب!

رقم الطلب: <code>${orderId}</code>
    `.trim();

    await this.notifyAdmin(message);
  }

  /**
   * Formats a new delegate KYC application notification
   */
  static async notifyNewDelegate(storeName: string, delegateName: string): Promise<void> {
    const message = `
🛡️ <b>طلب انضمام مندوب جديد (KYC)</b> 🛡️

🏪 <b>اسم المتجر:</b> ${storeName}
👤 <b>اسم المندوب:</b> ${delegateName}

قام مندوب جديد بالتسجيل وينتظر المراجعة. يرجى الدخول إلى لوحة التحكم (قسم المناديب) لمراجعة توقيعه الإلكتروني وتفعيل حسابه.
    `.trim();

    await this.notifyAdmin(message);
  }
}
