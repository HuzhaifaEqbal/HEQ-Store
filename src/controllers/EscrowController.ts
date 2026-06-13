import { Request, Response } from 'express';
import { WalletService } from '../services/WalletService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EscrowController {
  
  /**
   * Buyer initializes payment via Escrow
   */
  static async holdFunds(req: Request, res: Response): Promise<void> {
    try {
      // Mock auth payload
      const buyerId = req.body.buyerId; 
      const { orderId, delegateId, amountSyp } = req.body;

      const escrow = await WalletService.holdForEscrow(buyerId, delegateId, orderId, amountSyp);
      
      // Update order status to PAID now that funds are secured
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' }
      });

      res.status(200).json({ message: 'Funds securely held in Escrow.', escrow });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to hold funds' });
    }
  }

  /**
   * Buyer confirms receipt, releasing funds to Delegate
   */
  static async releaseFunds(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.body;
      
      const released = await WalletService.releaseEscrow(orderId);

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' }
      });

      res.status(200).json({ message: 'Funds successfully released to delegate.', released });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to release funds' });
    }
  }

  /**
   * Order cancelled or disputed, refund Buyer
   */
  static async refundFunds(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.body;
      
      const refunded = await WalletService.refundEscrow(orderId);

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      });

      res.status(200).json({ message: 'Funds successfully refunded to buyer.', refunded });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to refund funds' });
    }
  }

  /**
   * Endpoint to mock deposit (Cham Cash Simulator)
   */
  static async depositToWallet(req: Request, res: Response): Promise<void> {
    try {
      const { userId, amountSyp } = req.body;
      const wallet = await WalletService.deposit(userId, amountSyp, 'Cham Cash Deposit');
      res.status(200).json({ message: 'Deposit successful', wallet });
    } catch (error: any) {
      res.status(500).json({ error: 'Deposit failed' });
    }
  }
}
