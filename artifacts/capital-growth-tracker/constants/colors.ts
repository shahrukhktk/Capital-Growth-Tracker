/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#10231F',
    tint: '#2BB673',
    background: '#F5F7F4',
    foreground: '#10231F',
    card: '#FFFFFF',
    cardForeground: '#10231F',
    primary: '#2BB673',
    primaryForeground: '#082018',
    secondary: '#E8F1EA',
    secondaryForeground: '#1B4D38',
    muted: '#EDF1ED',
    mutedForeground: '#718079',
    accent: '#D9F4E4',
    accentForeground: '#167548',
    destructive: '#D85C5C',
    destructiveForeground: '#FFFFFF',
    border: '#DDE7DF',
    input: '#DDE7DF',
    navy: '#102E2A',
    navySoft: '#17443B',
    gold: '#E9B949',
    blue: '#5D8BE8',
    purple: '#9277D6',
    white: '#FFFFFF',
  },
  radius: 18,
};

export default colors;
