import { View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export type EmptyStateProps = {
  /** Textos já traduzidos (t()). */
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  testID?: string;
};

/** Estado vazio de uma tela ou lista: título, explicação e uma ação opcional. */
export function EmptyState({ title, description, action, testID }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.xxl,
        paddingHorizontal: theme.spacing.xl,
      }}
    >
      <Text variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {description ? (
        <Text color="textMuted" style={{ textAlign: 'center' }}>
          {description}
        </Text>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}
