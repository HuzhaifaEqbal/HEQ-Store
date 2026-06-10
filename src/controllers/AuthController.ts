import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jwt-simple';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

export class AuthController {
  
  /**
   * Manual Registration (Active)
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, fullName, phone, address } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(400).json({ error: 'Email already exists' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          phone,
          address
        }
      });

      const token = jwt.encode({ id: user.id, role: user.role }, JWT_SECRET);
      
      res.status(201).json({ token, user: { id: user.id, email: user.email, fullName: user.fullName } });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Manual Login (Active)
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || user.isDeleted) {
        res.status(401).json({ error: 'Invalid credentials or account deleted' });
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
   * Google OAuth 2.0 (Inactive - For Future Use)
   */
  static async googleSSO(req: Request, res: Response): Promise<void> {
    // NOTE: This endpoint is currently disabled as per requirements, 
    // but the logic is prepared for when Google OAuth is activated.
    res.status(503).json({ error: 'Google SSO is currently disabled. Please use manual registration.' });
    return;

    /*
    try {
      const { googleToken } = req.body;
      
      // Verify Google Token (assuming google-auth-library is used)
      // const ticket = await client.verifyIdToken({ idToken: googleToken, audience: process.env.GOOGLE_CLIENT_ID });
      // const payload = ticket.getPayload();
      
      const payload = { sub: 'mock-google-id', email: 'test@gmail.com', name: 'Test User', picture: 'mock.jpg' }; // Mock

      let user = await prisma.user.findUnique({ where: { email: payload.email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: payload.email!,
            googleSsoId: payload.sub,
            fullName: payload.name!,
            avatar: payload.picture
          }
        });
      } else if (!user.googleSsoId) {
        // Link existing account with Google SSO
        user = await prisma.user.update({
          where: { email: payload.email },
          data: { googleSsoId: payload.sub }
        });
      }

      const token = jwt.encode({ id: user.id, role: user.role }, JWT_SECRET);
      res.status(200).json({ token, user: { id: user.id, email: user.email, fullName: user.fullName } });
    } catch (error) {
      res.status(500).json({ error: 'Google SSO failed' });
    }
    */
  }

  /**
   * GDPR-Compliant Account Deletion
   * Soft-deletes user data and cascades pending non-paid orders.
   */
  static async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id; // Assuming auth middleware injects req.user

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // 1. Delete PENDING orders (cascade non-paid)
      await prisma.order.deleteMany({
        where: {
          userId: userId,
          status: 'PENDING'
        }
      });

      // 2. Soft-delete the user
      await prisma.user.update({
        where: { id: userId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          // Obfuscate PII if strict GDPR is required, while keeping financial records
          email: `deleted_${userId}@anonymized.com`,
          fullName: 'Deleted User',
          phone: null,
          address: null,
          googleSsoId: null
        }
      });

      res.status(200).json({ message: 'Account successfully deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete account' });
    }
  }
}
