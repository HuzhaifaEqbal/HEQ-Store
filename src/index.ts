import express from 'express';
import { AuthController } from './controllers/AuthController';
import { PricingAndLogisticsService } from './services/PricingAndLogisticsService';

const app = express();
app.use(express.json());

// Auth Routes
app.post('/api/auth/register', AuthController.register);
app.post('/api/auth/login', AuthController.login);
app.post('/api/auth/google', AuthController.googleSSO);
app.delete('/api/auth/account', AuthController.deleteAccount);

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
