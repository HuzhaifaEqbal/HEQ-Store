import { Request, Response } from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class AdminController {
  
  // ==========================================
  // ORDER MANAGEMENT
  // ==========================================

  static async getAllOrders(req: Request, res: Response): Promise<void> {
    try {
      // Mock auth check: in real app, check jwt role === 'ADMIN'
      const orders = await prisma.order.findMany({
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          items: {
            include: {
              product: true
            }
          },
          escrow: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json(orders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body; // e.g. "PURCHASED", "SHIPPED_JORDAN", etc.

      if (!Object.values(OrderStatus).includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: { status }
      });

      res.status(200).json({ message: 'Order status updated', order: updatedOrder });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  }

  static async updateTracking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { jordanTrackingNumber, syriaTrackingNumber } = req.body;

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          ...(jordanTrackingNumber !== undefined && { jordanTrackingNumber }),
          ...(syriaTrackingNumber !== undefined && { syriaTrackingNumber }),
        }
      });

      res.status(200).json({ message: 'Tracking updated', order: updatedOrder });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update tracking' });
    }
  }

  // ==========================================
  // DELEGATE KYC VERIFICATION
  // ==========================================

  static async getPendingDelegates(req: Request, res: Response): Promise<void> {
    try {
      const delegates = await prisma.delegateProfile.findMany({
        where: { isVerified: false },
        include: {
          user: { select: { fullName: true, email: true, phone: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json(delegates);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async verifyDelegate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { approve } = req.body; // boolean

      if (approve) {
        await prisma.delegateProfile.update({
          where: { id },
          data: { isVerified: true }
        });
        res.status(200).json({ message: 'Delegate approved successfully' });
      } else {
        // If rejected, maybe delete the profile or mark as rejected (we'll just delete profile for now)
        await prisma.delegateProfile.delete({ where: { id } });
        res.status(200).json({ message: 'Delegate application rejected and removed' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process delegate verification' });
    }
  }
}
