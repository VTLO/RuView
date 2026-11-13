// Palette derived from the VTLO_EyesOfGod icon: pure black field, white line art,
// burnt-orange ring. Status hues are kept distinct but warmed to sit on black.
export const colors = {
  bg: '#000000',
  surface: '#0B0B0B',
  surfaceAlt: '#161616',
  accent: '#C15632',
  accentDim: '#6B2E1A',
  ink: '#FFFFFF',
  danger: '#E5484D',
  warn: '#E8A33D',
  success: '#4CAF7A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A8A8A8',
  muted: '#5A5A5A',
  border: '#2B2B2B',
  connected: '#FFFFFF',
  simulated: '#E8A33D',
  disconnected: '#E5484D',
  signalLow: '#2B2B2B',
  signalMid: '#C15632',
  signalHigh: '#FFFFFF',
};

export type ColorKey = keyof typeof colors;
