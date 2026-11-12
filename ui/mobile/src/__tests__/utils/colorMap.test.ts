import { RAMP_HIGH, RAMP_LOW, RAMP_MID, valueToColor } from '@/utils/colorMap';

describe('valueToColor', () => {
  const expectColor = (actual: number[], expected: number[]) => {
    actual.forEach((c, i) => expect(c).toBeCloseTo(expected[i]));
  };

  it('returns charcoal at 0', () => {
    expectColor(valueToColor(0), RAMP_LOW);
  });

  it('returns the accent orange at 0.5', () => {
    expectColor(valueToColor(0.5), RAMP_MID);
  });

  it('returns white at 1', () => {
    expectColor(valueToColor(1), RAMP_HIGH);
  });

  it('clamps values below 0 to the same as 0', () => {
    const [r, g, b] = valueToColor(-0.5);
    const [r0, g0, b0] = valueToColor(0);
    expect(r).toBe(r0);
    expect(g).toBe(g0);
    expect(b).toBe(b0);
  });

  it('clamps values above 1 to the same as 1', () => {
    const [r, g, b] = valueToColor(1.5);
    const [r1, g1, b1] = valueToColor(1);
    expect(r).toBe(r1);
    expect(g).toBe(g1);
    expect(b).toBe(b1);
  });

  it('interpolates between charcoal and orange for 0.25', () => {
    expectColor(valueToColor(0.25), RAMP_LOW.map((c, i) => (c + RAMP_MID[i]) / 2));
  });

  it('interpolates between orange and white for 0.75', () => {
    expectColor(valueToColor(0.75), RAMP_MID.map((c, i) => (c + RAMP_HIGH[i]) / 2));
  });

  it('treats NaN as quiet', () => {
    expectColor(valueToColor(Number.NaN), RAMP_LOW);
  });

  it('returns a 3-element tuple', () => {
    const result = valueToColor(0.5);
    expect(result).toHaveLength(3);
  });

  it('all channels are in [0, 1] range for edge values', () => {
    for (const v of [-1, 0, 0.1, 0.5, 0.9, 1, 2]) {
      const [r, g, b] = valueToColor(v);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
    }
  });
});
