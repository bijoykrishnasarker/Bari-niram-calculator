# Source rule extraction

## Evidence reviewed

- `1-Minute House Cost Calculator v1.xlsx`
- `ব্যবহারবিধি.pdf`, five visually reviewed pages
- `Bonus Guide.pdf`, three visually reviewed pages

The PDFs are image-based and did not expose usable text through ordinary extraction, so every page was rendered and visually checked. The source files remain unchanged.

## Input meaning

The workbook label says “total area,” while the user guide example calculates length × width and then multiplies by floor count. The implementation therefore names the field `floorAreaSqFt`: the construction footprint for one floor, not already-multiplied total built-up area.

Inputs are:

- per-floor construction area in square feet;
- integer floor count;
- construction type: Economy, Standard, or Premium;
- location: Dhaka, Chittagong/Chattogram, or Other.

## Verified formulas

```text
base rate per sq ft:
  Economy  = 3,000 BDT
  Standard = 3,500 BDT
  Premium  = 4,500 BDT

location multiplier:
  Dhaka       = 1.10
  Chittagong  = 1.05
  Other       = 1.00

effective rate     = base rate × location multiplier
total built-up area = floor area × floor count
total cost          = total built-up area × effective rate
```

Breakdown:

```text
structure  = total cost × 50%
finishing  = total cost × 30%
electrical = total cost × 10%
plumbing   = total cost × 10%
```

Additional workbook outputs:

```text
estimated minimum = total built-up area × 3,000
estimated maximum = total built-up area × 4,500
potential savings = total cost × 10%
budget status      = High only when total cost > 3,000,000 BDT
```

The min/max range does not apply the location multiplier because the workbook formulas do not.

## Regression examples

| Input                                  | Expected result                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1,000 sq ft, 2 floors, Standard, Other | 2,000 sq ft, 3,500 BDT/sq ft, 7,000,000 BDT                                              |
| 100 sq ft, 2 floors, Standard, Dhaka   | 200 sq ft, 3,850 BDT/sq ft, 770,000 BDT                                                  |
| 1,000 sq ft, 1 floor, Economy, Other   | 3,000,000 BDT and `Affordable`, because the threshold is strictly greater than 3,000,000 |

## Guide topics

The bonus guide contributes ten topics:

1. Finalize design and budget before construction; mid-project changes add cost.
2. Prefer simple rectangular/square designs and fewer walls when appropriate.
3. Avoid the rainy season; dry-season work can be faster and cheaper.
4. Set a budget, track spending, and remove unnecessary items.
5. Use suitable local quality materials but do not compromise structural items.
6. Use an experienced team to reduce errors and waste.
7. Buy in bulk when discounts and transport savings are real.
8. Plan a future floor with professional foundation design from the start.
9. Complete interior upgrades in stages.
10. Plan electrical and plumbing routes before walls are finished.

The app presents the first three in the free tier and retrieves the complete set from the API for premium users.

## Required disclaimer

The workbook and guide describe an approximate planning calculation. Actual cost varies with site, design, soil, structure, market prices, specifications, labor, and time. Results are not financial, engineering, legal, or professional advice. Users must obtain a real estimate and qualified professional review before construction decisions.

## Known source limitation

The source does not contain material quantity rules. It cannot support an item-by-item bill of quantities without new professionally validated inputs. See `docs/PRODUCT_SPEC.md` for the gate on that future work.
