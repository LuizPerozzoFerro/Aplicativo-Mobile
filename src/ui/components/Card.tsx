import { View, type ViewProps } from 'react-native';

import { useTheme } from '../theme';

/** Superfície agrupadora com cantos arredondados e sombra leve. */
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.lg,
          gap: theme.spacing.sm,
          boxShadow: theme.shadows.card,
        },
        style,
      ]}
    />
  );
}
