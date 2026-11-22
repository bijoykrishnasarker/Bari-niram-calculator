import { describe, expect, it } from 'vitest';

import { calculateHouseCost, CalculatorInputSchema } from '../src';

describe('calculateHouseCost', () => {
  it('matches the default workbook example', () => {
    const result = calculateHouseCost({
      floorAreaSqFt: 1_000,
      floors: 2,
      constructionType: 'standard',
      location: 'other',
    });

    expect(result).toMatchObject({
      totalBuiltUpAreaSqFt: 2_000,
      effectiveRatePerSqFt: 3_500,
      totalCost: 7_000_000,
      estimatedMinimumCost: 6_000_000,
      estimatedMaximumCost: 9_000_000,
      potentialSavings: 700_000,
      budgetStatus: 'high',
      breakdown: {
        structure: 3_500_000,
        finishing: 2_100_000,
        electrical: 700_000,
        plumbing: 700_000,
      },
    });
  });

  it('matches the Dhaka example in the user guide', () => {
    const result = calculateHouseCost({
      floorAreaSqFt: 100,
      floors: 2,
      constructionType: 'standard',
      location: 'dhaka',
    });

    expect(result.effectiveRatePerSqFt).toBe(3_850);
    expect(result.totalCost).toBe(770_000);
  });

  it('keeps the workbook threshold exclusive', () => {
    const result = calculateHouseCost({
      floorAreaSqFt: 1_000,
      floors: 1,
      constructionType: 'economy',
      location: 'other',
    });

    expect(result.totalCost).toBe(3_000_000);
    expect(result.budgetStatus).toBe('affordable');
  });

  it('rejects unsupported floor counts and areas', () => {
    expect(() =>
      CalculatorInputSchema.parse({
        floorAreaSqFt: 0,
        floors: 0,
        constructionType: 'standard',
        location: 'other',
      }),
    ).toThrow();
  });
});
