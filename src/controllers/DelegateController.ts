import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DelegateController {
  
  /**
   * Delegate adds a new product
   */
  static async addProduct(req: Request, res: Response): Promise<void> {
    try {
      const delegateId = req.body.delegateId; // Mocked from JWT token
      const { nameEn, nameAr, descriptionEn, descriptionAr, sourcePriceUsd, weightKg, images } = req.body;

      // Verify delegate exists
      const delegate = await prisma.delegateProfile.findUnique({ where: { userId: delegateId } });
      if (!delegate || !delegate.isVerified) {
        res.status(403).json({ error: 'Unauthorized or unverified delegate' });
        return;
      }

      const product = await prisma.product.create({
        data: {
          ownerId: delegateId,
          isDelegateProduct: true,
          nameEn,
          nameAr,
          descriptionEn,
          descriptionAr,
          sourcePriceUsd,
          weightKg,
          images
        }
      });

      res.status(201).json({ message: 'Product published successfully', product });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Get public delegate profile (For customers to see who they are buying from)
   */
  static async getDelegateProfile(req: Request, res: Response): Promise<void> {
    try {
      const delegateId = req.params.delegateId as string;

      const profile = await prisma.delegateProfile.findUnique({
        where: { userId: delegateId },
        include: {
          user: { select: { fullName: true, avatar: true } }
        }
      });

      if (!profile) {
        res.status(404).json({ error: 'Delegate not found' });
        return;
      }

      res.status(200).json({ profile });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Update delegate profile & delivery rules
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const delegateId = req.body.delegateId;
      const { storeName, storeDescription, deliveryRules } = req.body;

      const updated = await prisma.delegateProfile.update({
        where: { userId: delegateId },
        data: { storeName, storeDescription, deliveryRules }
      });

      res.status(200).json({ message: 'Profile updated', profile: updated });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
