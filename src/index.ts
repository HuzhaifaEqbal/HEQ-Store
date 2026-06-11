import express from 'express';
import { AuthController } from './controllers/AuthController';
import { PricingAndLogisticsService } from './services/PricingAndLogisticsService';

const app = express();
app.use(express.json());

// Auth Routes
app.post('/api/auth/register', AuthController.register);
app.post('/api/auth/verify-otp', AuthController.verifyOtp);
app.post('/api/auth/login', AuthController.login);
app.post('/api/auth/google', AuthController.googleSSO);
app.post('/api/auth/forgot-password', AuthController.forgotPassword);
app.post('/api/auth/reset-password', AuthController.resetPassword);
app.post('/api/auth/delete/request', AuthController.requestDeleteAccount);
app.post('/api/auth/delete/confirm', AuthController.confirmDeleteAccount);

import { EscrowController } from './controllers/EscrowController';
import { DelegateController } from './controllers/DelegateController';

// Escrow & Wallet Routes
app.post('/api/escrow/hold', EscrowController.holdFunds);
app.post('/api/escrow/release', EscrowController.releaseFunds);
app.post('/api/escrow/refund', EscrowController.refundFunds);
app.post('/api/wallet/deposit', EscrowController.depositToWallet);

// Delegate Routes
app.post('/api/delegate/product', DelegateController.addProduct);
app.get('/api/delegate/:delegateId', DelegateController.getDelegateProfile);
app.put('/api/delegate/profile', DelegateController.updateProfile);

// Pricing Example Route
app.post('/api/pricing/calculate', async (req, res) => {
  try {
    const { sourcePriceUsd, weightKg } = req.body;
    const result = await PricingAndLogisticsService.calculateDynamicPrice(sourcePriceUsd, weightKg);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate price' });
  }
});

// Health Check for Render
app.get('/health', (req, res) => {
  res.send('HEQ-Store Backend is up and running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
