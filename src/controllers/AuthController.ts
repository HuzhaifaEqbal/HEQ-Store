import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jwt-simple';
import { CommunicationService } from '../services/CommunicationService';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

// Admin Auth Bypass credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@hajeen.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * Utility to generate a 6-digit OTP
 */
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export class AuthController {
  
  /**
   * 1. Registration - Generates OTP and sends Email (No Login yet)
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, fullName, phone, address } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        if (existingUser.isEmailVerified) {
          res.status(400).json({ error: 'Email already exists and is verified.' });
          return;
        } else {
          // If exists but not verified, we can resend OTP
          const otpCode = generateOTP();
          const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
          
          await prisma.user.update({
            where: { email },
            data: { otpCode, otpExpiresAt, otpType: 'REGISTER' }
          });

          const html = CommunicationService.getRegistrationOtpHtml(fullName, email, otpCode);
          await CommunicationService.sendEmail([email], 'رمز التحقق لتفعيل حسابك - هَجين', html);
          
          res.status(200).json({ message: 'OTP re-sent to email.' });
          return;
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const otpCode = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      console.log(`[DEBUG - DEV ONLY] OTP generated for ${email}: ${otpCode}`);

      await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          phone,
          address,
          isEmailVerified: false,
          otpCode,
          otpExpiresAt,
          otpType: 'REGISTER'
        }
      });

      // Send OTP HTML Email
      const html = CommunicationService.getRegistrationOtpHtml(fullName, email, otpCode);
      await CommunicationService.sendEmail([email], 'رمز التحقق لتفعيل حسابك - هَجين', html);

      res.status(201).json({ message: 'Account created. Please check your email for the OTP to verify.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * 2. Verify OTP (For Registration, Password Reset, or Account Deletion)
   */
  static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, otpCode, type } = req.body; // type: 'REGISTER' | 'RESET' | 'DELETE'

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.otpCode !== otpCode || user.otpType !== type || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
        res.status(400).json({ error: 'Invalid or expired OTP' });
        return;
      }

      // Clear OTP
      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode: null, otpExpiresAt: null, otpType: null, isEmailVerified: true }
      });

      if (type === 'REGISTER') {
        // Send Welcome Message after successful registration verification
        const html = CommunicationService.getWelcomeHtml(user.fullName, user.email);
        await CommunicationService.sendEmail([user.email], 'مرحباً بك في منصة هَجين!', html);

        const token = jwt.encode({ id: user.id, role: user.role }, JWT_SECRET);
        res.status(200).json({ message: 'Account verified successfully.', token, user: { id: user.id, email: user.email, fullName: user.fullName } });
      } else {
        res.status(200).json({ message: 'OTP Verified successfully for ' + type });
      }

    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * 3. Manual Login with ENV Admin Bypass
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // --- Admin ENV Bypass Check ---
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Automatically give admin token without checking DB
        const token = jwt.encode({ id: 'super-admin-env', role: 'ADMIN' }, JWT_SECRET);
        res.status(200).json({ token, user: { id: 'super-admin', email: ADMIN_EMAIL, fullName: 'Super Admin' } });
        return;
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || user.isDeleted) {
        res.status(401).json({ error: 'Invalid credentials or account deleted' });
        return;
      }

      if (!user.isEmailVerified) {
        res.status(403).json({ error: 'Please verify your email using the OTP sent to you.' });
        return;
      }

      if (!user.passwordHash) {
        res.status(401).json({ error: 'Please login with Google SSO' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const token = jwt.encode({ id: user.id, role: user.role }, JWT_SECRET);
      res.status(200).json({ token, user: { id: user.id, email: user.email, fullName: user.fullName } });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * 4. Forgot Password - Send OTP
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || user.isDeleted) {
        // Return 200 anyway for security (prevent email enumeration)
        res.status(200).json({ message: 'If the email exists, an OTP will be sent.' });
        return;
      }

      const otpCode = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode, otpExpiresAt, otpType: 'RESET' }
      });

      const html = CommunicationService.getPasswordResetOtpHtml(user.fullName, user.email, otpCode);
      await CommunicationService.sendEmail([user.email], 'طلب تغيير كلمة المرور - هَجين', html);

      res.status(200).json({ message: 'If the email exists, an OTP will be sent.' });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * 5. Reset Password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, otpCode, newPassword } = req.body;
      
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || user.otpCode !== otpCode || user.otpType !== 'RESET' || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
        res.status(400).json({ error: 'Invalid or expired OTP' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, otpCode: null, otpExpiresAt: null, otpType: null }
      });

      res.status(200).json({ message: 'Password has been reset successfully. You can now login.' });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * 6. Request Account Deletion (Sends OTP)
   */
  static async requestDeleteAccount(req: Request, res: Response): Promise<void> {
    try {
      // Mock auth logic, replace with actual JWT middleware check
      const authHeader = req.headers.authorization;
      if (!authHeader) { res.status(401).json({ error: 'Unauthorized' }); return; }
      
      const token = authHeader.split(' ')[1];
      const payload = jwt.decode(token, JWT_SECRET);
      
      const user = await prisma.user.findUnique({ where: { id: payload.id } });
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }

      const otpCode = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode, otpExpiresAt, otpType: 'DELETE' }
      });

      // We can use a generic email or reuse a template for deletion
      const html = CommunicationService.wrapHtml(`
        <h2 style="color: #ef4444; margin-bottom: 20px;">تأكيد حذف الحساب نهائياً</h2>
        <p>مرحباً يا <strong>"${user.fullName}"</strong>، تلقينا طلباً بحذف حسابك نهائياً من منصة هَجين.</p>
        ${CommunicationService.formatOtpBox(otpCode)}
        <p style="color: #94a3b8; font-size: 14px;">إذا لم تطلب أنت حذف الحساب، يرجى تجاهل هذه الرسالة أو تغيير كلمة مرورك فوراً.</p>
      `);

      await CommunicationService.sendEmail([user.email], 'تأكيد حذف الحساب - هَجين', html);
      res.status(200).json({ message: 'Deletion OTP sent to your email.' });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * 7. Confirm Account Deletion with OTP (GDPR)
   */
  static async confirmDeleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) { res.status(401).json({ error: 'Unauthorized' }); return; }
      
      const token = authHeader.split(' ')[1];
      const payload = jwt.decode(token, JWT_SECRET);
      
      const { otpCode } = req.body;
      const user = await prisma.user.findUnique({ where: { id: payload.id } });

      if (!user || user.otpCode !== otpCode || user.otpType !== 'DELETE' || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
        res.status(400).json({ error: 'Invalid or expired OTP' });
        return;
      }

      // Delete PENDING orders
      await prisma.order.deleteMany({
        where: { userId: user.id, status: 'PENDING' }
      });

      // Soft-delete user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          email: `deleted_${user.id}@anonymized.com`,
          fullName: 'Deleted User',
          phone: null,
          address: null,
          googleSsoId: null,
          otpCode: null,
          otpExpiresAt: null,
          otpType: null
        }
      });

      res.status(200).json({ message: 'Account successfully deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete account' });
    }
  }

  static async googleSSO(req: Request, res: Response): Promise<void> {
    res.status(503).json({ error: 'Google SSO is currently disabled.' });
  }
}
