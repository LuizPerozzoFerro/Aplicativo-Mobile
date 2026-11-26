import { View, type DimensionValue } from 'react-native';

import { Text, useTheme } from '@/ui';

// Gráficos simples da aba Estatísticas (spec 04, 5.8), sem biblioteca: barras
// com `View`. Cada gráfico é um elemento só para o leitor de tela, lido pela
// `description` (os valores em texto); o desenho fica escondido dele.

const percent = (value: number, max: number): DimensionValue =>
  `${max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))}%`;

export type BarRowItem = {
  readonly key: string;
  readonly label: string;
  /** Null = sem dados (barra vazia). */
  readonly value: number | null;
  readonly valueText: string;
};

/**
 * Barras horizontais, uma por linha, com o rótulo e o valor em texto acima de
 * cada barra: com a fonte no máximo, o texto quebra a linha em vez de cortar.
 * `marker` desenha a linha de referência (o limite diário) em todas as barras.
 */
export function BarRows({
  items,
  marker = null,
  description,
  testID,
}: {
  items: readonly BarRowItem[];
  marker?: number | null;
  description: string;
  testID?: string;
}) {
  const theme = useTheme();
  const max = Math.max(1, marker ?? 0, ...items.map((item) => item.value ?? 0));
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={description}
      style={{ gap: theme.spacing.sm }}
    >
      {items.map((item) => (
        <View key={item.key} testID={testID && `${testID}-${item.key}`} style={{ gap: 2 }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              columnGap: theme.spacing.sm,
            }}
          >
            <Text variant="caption">{item.label}</Text>
            <Text variant="caption" color={item.value === null ? 'textMuted' : 'text'}>
              {item.valueText}
            </Text>
          </View>
          <View
            style={{
              height: 12,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.surfaceMuted,
            }}
          >
            {item.value !== null && item.value > 0 ? (
              <View
                style={{
                  width: percent(item.value, max),
                  height: '100%',
                  borderRadius: theme.radii.pill,
                  backgroundColor: theme.colors.primary,
                }}
              />
            ) : null}
            {marker !== null ? (
              <View
                style={{
                  position: 'absolute',
                  left: percent(marker, max),
                  top: -3,
                  bottom: -3,
                  width: 2,
                  marginLeft: -1,
                  backgroundColor: theme.colors.text,
                }}
              />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const HOUR_LABELS = [0, 6, 12, 18] as const;

/**
 * As 24 horas do dia em colunas. As horas de `highlighted` (faixas de
 * gatilho) ganham fundo e um traço embaixo, com contraste de controle (3:1).
 */
export function HourColumns({
  values,
  highlighted,
  hourLabel,
  description,
  testID,
}: {
  values: readonly number[];
  highlighted: readonly boolean[];
  hourLabel: (hour: number) => string;
  description: string;
  testID?: string;
}) {
  const theme = useTheme();
  const max = Math.max(...values, 0);
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={description}
      style={{ gap: theme.spacing.xs }}
    >
      <View style={{ flexDirection: 'row', height: 120, alignItems: 'stretch' }}>
        {values.map((value, hour) => (
          <View
            key={hour}
            testID={testID && highlighted[hour] ? `${testID}-trigger-${hour}` : undefined}
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              paddingHorizontal: 1,
              backgroundColor: highlighted[hour] ? theme.colors.surfaceMuted : 'transparent',
            }}
          >
            {value > 0 ? (
              <View
                style={{
                  height: percent(value, max),
                  minHeight: 2,
                  borderTopLeftRadius: theme.radii.sm / 2,
                  borderTopRightRadius: theme.radii.sm / 2,
                  backgroundColor: theme.colors.primary,
                }}
              />
            ) : null}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', height: 4 }}>
        {highlighted.map((on, hour) => (
          <View
            key={hour}
            style={{ flex: 1, backgroundColor: on ? theme.colors.outline : 'transparent' }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {HOUR_LABELS.map((hour) => (
          <Text key={hour} variant="caption" color="textMuted" style={{ flex: 1 }}>
            {hourLabel(hour)}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Legenda das faixas de gatilho, com a mesma marca do gráfico. */
export function TriggerLegend({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <View
        style={{
          width: 16,
          height: 16,
          backgroundColor: theme.colors.surfaceMuted,
          borderBottomWidth: 4,
          borderBottomColor: theme.colors.outline,
        }}
      />
      <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
        {label}
      </Text>
    </View>
  );
}
