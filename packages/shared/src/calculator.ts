import { z } from 'zod';

export const ConstructionTypeSchema = z.enum([
  'economy',
  'standard',
  'premium',
]);

export const LocationSchema = z.enum(['dhaka', 'chattogram', 'other']);

export const CalculatorInputSchema = z.object({
  floorAreaSqFt: z.coerce
    .number()
    .finite()
    .min(100, 'Floor area must be at least 100 sq ft')
    .max(100_000, 'Floor area is above the supported range'),
  floors: z.coerce
    .number()
    .int()
    .min(1, 'At least one floor is required')
    .max(100, 'Floor count is above the supported range'),
  constructionType: ConstructionTypeSchema,
  location: LocationSchema,
});

export type CalculatorInput = z.infer<typeof CalculatorInputSchema>;
export type ConstructionType = z.infer<typeof ConstructionTypeSchema>;
export type Location = z.infer<typeof LocationSchema>;

export const CALCULATOR_RULES = {
  version: 'homexbd-workbook-v1',
  currency: 'BDT',
  baseRatePerSqFt: {
    economy: 3_000,
    standard: 3_500,
    premium: 4_500,
  },
  locationMultiplier: {
    dhaka: 1.1,
    chattogram: 1.05,
    other: 1,
  },
  costSplit: {
    structure: 0.5,
    finishing: 0.3,
    electrical: 0.1,
    plumbing: 0.1,
  },
  estimateRangePerSqFt: {
    minimum: 3_000,
    maximum: 4_500,
  },
  potentialSavingsRate: 0.1,
  highBudgetThresholdBdt: 3_000_000,
} as const;

export type CostBreakdown = {
  structure: number;
  finishing: number;
  electrical: number;
  plumbing: number;
};

export type CalculatorResult = {
  ruleVersion: string;
  currency: 'BDT';
  totalBuiltUpAreaSqFt: number;
  baseRatePerSqFt: number;
  locationMultiplier: number;
  effectiveRatePerSqFt: number;
  totalCost: number;
  breakdown: CostBreakdown;
  estimatedMinimumCost: number;
  estimatedMaximumCost: number;
  potentialSavings: number;
  budgetStatus: 'affordable' | 'high';
};

const money = (value: number): number => Math.round(value);

export function calculateHouseCost(
  rawInput: CalculatorInput,
): CalculatorResult {
  const input = CalculatorInputSchema.parse(rawInput);
  const baseRatePerSqFt =
    CALCULATOR_RULES.baseRatePerSqFt[input.constructionType];
  const locationMultiplier =
    CALCULATOR_RULES.locationMultiplier[input.location];
  const effectiveRatePerSqFt = money(baseRatePerSqFt * locationMultiplier);
  const totalBuiltUpAreaSqFt = money(input.floorAreaSqFt * input.floors);
  const totalCost = money(totalBuiltUpAreaSqFt * effectiveRatePerSqFt);

  return {
    ruleVersion: CALCULATOR_RULES.version,
    currency: CALCULATOR_RULES.currency,
    totalBuiltUpAreaSqFt,
    baseRatePerSqFt,
    locationMultiplier,
    effectiveRatePerSqFt,
    totalCost,
    breakdown: {
      structure: money(totalCost * CALCULATOR_RULES.costSplit.structure),
      finishing: money(totalCost * CALCULATOR_RULES.costSplit.finishing),
      electrical: money(totalCost * CALCULATOR_RULES.costSplit.electrical),
      plumbing: money(totalCost * CALCULATOR_RULES.costSplit.plumbing),
    },
    estimatedMinimumCost: money(
      totalBuiltUpAreaSqFt * CALCULATOR_RULES.estimateRangePerSqFt.minimum,
    ),
    estimatedMaximumCost: money(
      totalBuiltUpAreaSqFt * CALCULATOR_RULES.estimateRangePerSqFt.maximum,
    ),
    potentialSavings: money(totalCost * CALCULATOR_RULES.potentialSavingsRate),
    budgetStatus:
      totalCost > CALCULATOR_RULES.highBudgetThresholdBdt
        ? 'high'
        : 'affordable',
  };
}
