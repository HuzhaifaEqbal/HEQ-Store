import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class WalletService {
  /**
   * Initializes a wallet for a new user/delegate
   */
  static async createWallet(userId: string) {
    return prisma.wallet.create({
      data: { userId }
    });
  }

  /**
   * Add funds to wallet (e.g. via Cham Cash)
   */
  static async deposit(userId: string, amountSyp: number, description: string = 'Deposit') {
    return prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) wallet = await tx.wallet.create({ data: { userId } });

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceSyp: wallet.balanceSyp + amountSyp }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amountSyp,
          type: 'DEPOSIT',
          description
        }
      });

      return updatedWallet;
    });
  }

  /**
   * Holds money in escrow for an order
   */
  static async holdForEscrow(buyerId: string, delegateId: string, orderId: string, amountSyp: number) {
    return prisma.$transaction(async (tx) => {
      const buyerWallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
      if (!buyerWallet || buyerWallet.balanceSyp < amountSyp) {
        throw new Error('Insufficient funds in wallet');
      }

      // Deduct from available balance, add to held balance (for tracking if needed)
      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: { balanceSyp: buyerWallet.balanceSyp - amountSyp }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: buyerWallet.id,
          amountSyp: -amountSyp,
          type: 'ESCROW_HOLD',
          description: `Funds held for Order #${orderId}`
        }
      });

      const escrow = await tx.escrowTransaction.create({
        data: {
          orderId,
          buyerId,
          delegateId,
          amountSyp,
          status: 'HELD'
        }
      });

      return escrow;
    });
  }

  /**
   * Releases money to the Delegate after successful delivery
   */
  static async releaseEscrow(orderId: string) {
    return prisma.$transaction(async (tx) => {
      const escrow = await tx.escrowTransaction.findUnique({ where: { orderId } });
      if (!escrow || escrow.status !== 'HELD') {
        throw new Error('Invalid escrow transaction');
      }

      let delegateWallet = await tx.wallet.findUnique({ where: { userId: escrow.delegateId } });
      if (!delegateWallet) delegateWallet = await tx.wallet.create({ data: { userId: escrow.delegateId } });

      // Add to delegate's balance
      await tx.wallet.update({
        where: { id: delegateWallet.id },
        data: { balanceSyp: delegateWallet.balanceSyp + escrow.amountSyp }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: delegateWallet.id,
          amountSyp: escrow.amountSyp,
          type: 'ESCROW_RELEASE',
          description: `Escrow released for Order #${orderId}`
        }
      });

      return tx.escrowTransaction.update({
        where: { id: escrow.id },
        data: { status: 'RELEASED', releasedAt: new Date() }
      });
    });
  }

  /**
   * Refunds money to the Buyer (e.g. order cancelled or disputed)
   */
  static async refundEscrow(orderId: string) {
    return prisma.$transaction(async (tx) => {
      const escrow = await tx.escrowTransaction.findUnique({ where: { orderId } });
      if (!escrow || escrow.status !== 'HELD') {
        throw new Error('Invalid escrow transaction');
      }

      const buyerWallet = await tx.wallet.findUnique({ where: { userId: escrow.buyerId } });
      if (!buyerWallet) throw new Error('Buyer wallet not found');

      // Return to buyer's available balance
      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: { balanceSyp: buyerWallet.balanceSyp + escrow.amountSyp }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: buyerWallet.id,
          amountSyp: escrow.amountSyp,
          type: 'REFUND',
          description: `Escrow refunded for Order #${orderId}`
        }
      });

      return tx.escrowTransaction.update({
        where: { id: escrow.id },
        data: { status: 'REFUNDED' }
      });
    });
  }
}
