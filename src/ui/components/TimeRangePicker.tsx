import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';
import { TimePicker } from './TimePicker';

export type TimeRangeValue = {
  /** Minutos desde a meia-noite, de 0 a 1439. */
  start: number;
  end: number;
};

export type TimeRangePickerProps = {
  value: TimeRangeValue;
  onChange: (value: TimeRangeValue) => void;
  minuteStep?: number;
  testID?: string;
};

/**
 * Faixa de horário personalizada (spec 02, seção 4.4): início e fim livres,
 * inclusive atravessando a meia-noite. Avisa quando a faixa termina no dia
 * seguinte e quando início e fim são iguais (faixa inválida; a validação
 * completa fica em src/domain/timeRange.ts).
 */
export function TimeRangePicker({ value, onChange, minuteStep, testID }: TimeRangePickerProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const same = value.start === value.end;
  const nextDay = value.end < value.start;

  return (
    <View testID={testID} style={{ gap: theme.spacing.md }}>
      <TimePicker
        label={t('timeRangePicker.start')}
        value={value.start}
        onChange={(start) => onChange({ ...value, start })}
        minuteStep={minuteStep}
        testID={testID && `${testID}-start`}
      />
      <TimePicker
        label={t('timeRangePicker.end')}
        value={value.end}
        onChange={(end) => onChange({ ...value, end })}
        minuteStep={minuteStep}
        testID={testID && `${testID}-end`}
      />
      {same || nextDay ? (
        <Text
          variant="caption"
          color={same ? 'danger' : 'textMuted'}
          accessibilityLiveRegion="polite"
        >
          {same ? t('timeRangePicker.sameTime') : t('timeRangePicker.nextDay')}
        </Text>
      ) : null}
    </View>
  );
}
