import { PrismaClient, AppSettings } from '@prisma/client';

const prisma = new PrismaClient();

export class PricingAndLogisticsService {
  /**
   * Fetches the singleton AppSettings configuration.
   * If it doesn't exist, creates default values.
   */
  static async getAppSettings(): Promise<AppSettings> {
    let settings = await prisma.appSettings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      settings = await prisma.appSettings.create({
        data: {
          usdToSypRate: 15000,
          customsPercentage: 0.15, // 15%
          shippingCostPerKg: 25.0, // 25 USD per KG
          expectedTransitDays: 14,
          orderProcessingDays: 2,
          profitMarginFixed: 0.0,
          profitMarginPercent: 0.10, // 10%
        },
      });
    }

    return settings;
  }

  /**
   * THE MATH ENGINE: Calculates the dynamic SYP Price for a product based on real-time AppSettings.
   * Formula: Final_SYP_Price = (((Source_Price_USD + (Weight_KG * Shipping_Cost_Per_KG)) * (1 + Customs_Percentage)) + Profit_Fixed) * (1 + Profit_Percent) * USD_to_SYP_Rate
   */
  static async calculateDynamicPrice(sourcePriceUsd: number, weightKg: number): Promise<{ finalPriceSyp: number, finalPriceUsd: number, settings: AppSettings }> {
    const settings = await this.getAppSettings();

    // 1. Calculate shipping cost in USD
    const shippingCostUsd = weightKg * settings.shippingCostPerKg;

    // 2. Add customs
    const priceWithCustomsUsd = (sourcePriceUsd + shippingCostUsd) * (1 + settings.customsPercentage);

    // 3. Add Profit Margins
    const finalPriceUsd = (priceWithCustomsUsd + settings.profitMarginFixed) * (1 + settings.profitMarginPercent);

    // 4. Convert to SYP
    const finalPriceSyp = finalPriceUsd * settings.usdToSypRate;

    return {
      finalPriceSyp: Math.ceil(finalPriceSyp), // Round up to nearest integer
      finalPriceUsd: Number(finalPriceUsd.toFixed(2)),
      settings
    };
  }

  /**
   * ETA Calculator: Calculates the estimated delivery date based on AppSettings
   */
  static async calculateEstimatedDeliveryDate(): Promise<Date> {
    const settings = await this.getAppSettings();
    const totalDays = settings.orderProcessingDays + settings.expectedTransitDays;
    
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + totalDays);
    
    return deliveryDate;
  }
}
