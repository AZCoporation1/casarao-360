// =============================================
// AI Insight Types — Central Casarão 360
// Types for AI-generated insights
// =============================================

export interface AiGeneratedInsight {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  category: 'occupancy' | 'staffing' | 'inventory' | 'revenue' | 'experience' | 'safety';
  recommendation: string;
  confidence: number; // 0-1
  source: 'ai_forecast' | 'rule_engine' | 'manual';
  metadata: {
    modelVersion?: string;
    generatedAt: string;
    dataPoints?: number;
    eventId?: string;
  };
  isActionable: boolean;
  isResolved: boolean;
  resolvedAt?: string;
}

export interface AiForecastResult {
  eventId: string;
  generatedAt: string;
  expectedOccupancy: number;
  staffRecommendation: {
    waiters: number;
    bartenders: number;
    security: number;
    kitchen: number;
  };
  inventoryAlerts: {
    itemName: string;
    currentQuantity: number;
    recommendedQuantity: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
  insights: AiGeneratedInsight[];
  confidence: number;
}
