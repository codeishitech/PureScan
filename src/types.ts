export interface ProductData {
  name: string;
  ingredients: string;
  image?: string;
  brand?: string;
  nutriscore?: string;
}

export interface AnalysisResult {
  score: 'Healthy' | 'Moderate' | 'Risky';
  riskScore: number; // New field: score out of 100
  summary: string;
  ingredients: Array<{
    name: string;
    explanation: string;
    category: string;
    risk: 'Low' | 'Medium' | 'High';
  }>;
  additives: Array<{
    name: string;
    code?: string;
    explanation: string;
    risk: 'Low' | 'Medium' | 'High';
  }>;
  recommendation: string;
}
