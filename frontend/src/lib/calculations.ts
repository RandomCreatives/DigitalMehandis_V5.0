/**
 * Client-side BBS calculations (mirrors backend logic for instant UI feedback).
 */

const UNIT_WEIGHTS: Record<number, number> = {
  6: 0.222, 8: 0.395, 10: 0.617, 12: 0.888,
  16: 1.578, 20: 2.466, 25: 3.853, 32: 6.313,
};

export function calcCuttingLength(
  shape: string,
  clearLengthM: number,
  diameterMm: number,
  hookLengthMm = 0,
  coverMm = 50
): number {
  const clearMm = clearLengthM * 1000;
  const bendDeduction = 2 * diameterMm;

  let length: number;
  switch (shape) {
    case "STRAIGHT":
      length = clearMm + 2 * coverMm;
      break;
    case "L_SHAPE":
      length = clearMm * 2 - bendDeduction + 2 * coverMm;
      break;
    case "U_SHAPE":
      length = clearMm * 2 + hookLengthMm - bendDeduction + 2 * coverMm;
      break;
    case "HOOK":
      length = clearMm + hookLengthMm + 2 * coverMm;
      break;
    case "SPIRAL":
      length = clearMm * 2 - 4 * diameterMm;
      break;
    default:
      length = clearMm;
  }
  return Math.round((length / 1000) * 1000) / 1000;
}

export function calcWeight(diameterMm: number, lengthM: number): number {
  const uw = UNIT_WEIGHTS[diameterMm] ?? 0;
  return Math.round(lengthM * uw * 1000) / 1000;
}

export function calcLapLength(diameterMm: number, standard = "EBCS_3"): number {
  return diameterMm * (standard === "EBCS_3" ? 50 : 40);
}
