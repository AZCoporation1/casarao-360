import { z } from 'zod';

// =============================================
// AI Schemas — Central Casarão 360
// Preparação para integração futura com OpenAI
// =============================================

export const forecastRequestSchema = z.object({
  eventId: z.string().uuid(),
  historicalData: z.object({
    averageOccupancy: z.number(),
    averageConsumption: z.number(),
    previousEventCount: z.number(),
  }).optional(),
  weatherForecast: z.string().optional(),
  dayOfWeek: z.string(),
  eventType: z.string(),
});

export const forecastResponseSchema = z.object({
  expectedOccupancy: z.number().min(0).max(100),
  staffRecommendation: z.object({
    waiters: z.number(),
    bartenders: z.number(),
    security: z.number(),
  }),
  inventoryAlerts: z.array(z.object({
    itemName: z.string(),
    currentQuantity: z.number(),
    recommendedQuantity: z.number(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
  })),
  insights: z.array(z.object({
    title: z.string(),
    description: z.string(),
    impact: z.enum(['low', 'medium', 'high', 'critical']),
    recommendation: z.string(),
  })),
  confidence: z.number().min(0).max(1),
});

export type ForecastRequest = z.infer<typeof forecastRequestSchema>;
export type ForecastResponse = z.infer<typeof forecastResponseSchema>;
