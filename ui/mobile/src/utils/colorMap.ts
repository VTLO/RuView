// Heat ramp matching the app palette: charcoal (quiet) -> burnt orange (#C15632) -> white (active).
export const RAMP_LOW: [number, number, number] = [0.08, 0.08, 0.08];
export const RAMP_MID: [number, number, number] = [193 / 255, 86 / 255, 50 / 255];
export const RAMP_HIGH: [number, number, number] = [1, 1, 1];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function valueToColor(v: number): [number, number, number] {
  const clamped = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
  const [from, to, t] = clamped < 0.5 ? [RAMP_LOW, RAMP_MID, clamped * 2] : [RAMP_MID, RAMP_HIGH, (clamped - 0.5) * 2];
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];
}
