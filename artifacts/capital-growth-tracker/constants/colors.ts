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
    text: '#231F1A',
    tint: '#B08B4F',
    background: '#F7F4EF',
    foreground: '#231F1A',
    card: '#FFFCF7',
    cardForeground: '#231F1A',
    primary: '#B08B4F',
    primaryForeground: '#211A13',
    secondary: '#EFE7DC',
    secondaryForeground: '#5B4632',
    muted: '#F0ECE6',
    mutedForeground: '#786F66',
    accent: '#EAD9B8',
    accentForeground: '#8A6328',
    destructive: '#B95C52',
    destructiveForeground: '#FFFFFF',
    border: '#E4DBCE',
    input: '#DCCFBD',
    navy: '#241D18',
    navySoft: '#3B3026',
    gold: '#D4AF67',
    blue: '#6B88A8',
    purple: '#8C7A92',
    white: '#FFFFFF',
  },
  radius: 18,
};

export default colors;
