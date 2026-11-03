import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type PressableProps,
} from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

// Seletor de horário em JavaScript, sem biblioteca nativa (opção A, escolhida
// pelo responsável em 02/11/2026; NOTAS-APP.md, passo 3 da Fase 3).
// - Hora e minuto são controles ajustáveis: no TalkBack, deslizar para cima e
//   para baixo muda o valor, e o leitor anuncia o horário completo.
// - Os valores dão a volta (23 → 00, 55 → 00), sem levar à outra unidade.
// - Tocar ajusta uma vez; segurar repete o ajuste até soltar.

const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

/** Espera antes de começar a repetir, em ms (segurar o botão). */
export const REPEAT_DELAY_MS = 400;
/** Intervalo entre ajustes enquanto o botão continua pressionado, em ms. */
export const REPEAT_INTERVAL_MS = 120;

/** Soma `delta` horas, dando a volta no dia; os minutos não mudam. */
export function stepHours(value: number, delta: number): number {
  const hours = Math.floor(value / MINUTES_PER_HOUR);
  const minutes = value % MINUTES_PER_HOUR;
  const next = (((hours + delta) % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
  return next * MINUTES_PER_HOUR + minutes;
}

/**
 * Vai ao múltiplo de `step` seguinte (delta > 0) ou anterior (delta < 0),
 * dando a volta na hora (55 → 00 com passo 5); a hora não muda. Um minuto fora
 * do passo (ex.: 07) vai ao múltiplo mais próximo naquele sentido (10 ou 05).
 */
export function stepMinutes(value: number, delta: 1 | -1, step: number): number {
  const hours = value - (value % MINUTES_PER_HOUR);
  const minutes = value % MINUTES_PER_HOUR;
  const lastStep = MINUTES_PER_HOUR - step;
  let next: number;
  if (delta > 0) {
    next = (Math.floor(minutes / step) + 1) * step;
    if (next > lastStep) next = 0;
  } else {
    next = minutes % step === 0 ? minutes - step : Math.floor(minutes / step) * step;
    if (next < 0) next = lastStep;
  }
  return hours + next;
}

/** Ajuste ao tocar e repetição ao segurar, sempre a partir do valor mais recente. */
function useRepeatingPress(adjust: () => void) {
  const adjustRef = useRef(adjust);
  useEffect(() => {
    adjustRef.current = adjust;
  });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  return {
    onPress: () => adjustRef.current(),
    // Depois de um toque longo o Pressable não chama onPress ao soltar.
    onLongPress: () => {
      stop();
      adjustRef.current();
      timer.current = setInterval(() => adjustRef.current(), REPEAT_INTERVAL_MS);
    },
    onPressOut: stop,
    delayLongPress: REPEAT_DELAY_MS,
  } satisfies Partial<PressableProps>;
}

function StepButton({
  symbol,
  label,
  adjust,
  testID,
}: {
  symbol: string;
  label: string;
  adjust: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const press = useRepeatingPress(adjust);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      {...press}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: theme.minTouchTarget,
          minWidth: theme.minTouchTarget,
          borderRadius: theme.radii.pill,
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.surfaceMuted,
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text variant="heading">{symbol}</Text>
    </Pressable>
  );
}

type UnitProps = {
  /** Nome do controle para o leitor de tela (ex.: "Horário do check-in, Hora"). */
  accessibilityLabel: string;
  /** Horário completo falado (ex.: "21 horas e 30 minutos"). */
  spokenTime: string;
  display: string;
  increase: () => void;
  decrease: () => void;
  increaseLabel: string;
  decreaseLabel: string;
  testID?: string;
};

/**
 * Uma unidade (hora ou minuto). O conjunto é um único controle ajustável para
 * o TalkBack: os botões de dentro não recebem foco separado, e deslizar para
 * cima ou para baixo chama increment/decrement.
 */
function TimeUnit({
  accessibilityLabel,
  spokenTime,
  display,
  increase,
  decrease,
  increaseLabel,
  decreaseLabel,
  testID,
}: UnitProps) {
  const theme = useTheme();
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') increase();
    if (event.nativeEvent.actionName === 'decrement') decrease();
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: spokenTime }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
      testID={testID}
      style={[styles.unit, { gap: theme.spacing.xs }]}
    >
      <StepButton
        symbol="+"
        label={increaseLabel}
        adjust={increase}
        testID={testID && `${testID}-increase`}
      />
      <Text variant="display" style={styles.value}>
        {display}
      </Text>
      <StepButton
        symbol="−"
        label={decreaseLabel}
        adjust={decrease}
        testID={testID && `${testID}-decrease`}
      />
    </View>
  );
}

export type TimePickerProps = {
  /** Nome do campo, já traduzido (t()). */
  label: string;
  /** Minutos desde a meia-noite, de 0 a 1439. */
  value: number;
  onChange: (value: number) => void;
  /** Passo dos minutos (padrão 5). */
  minuteStep?: number;
  testID?: string;
};

/** Horário falado pelo leitor de tela: "21 horas e 30 minutos", "zero hora", "1 hora e 5 minutos". */
export function useSpokenTime() {
  const { t } = useTranslation('common');
  return (value: number) => {
    const hours = t('timePicker.hours', { count: Math.floor(value / MINUTES_PER_HOUR) });
    const minutes = value % MINUTES_PER_HOUR;
    return minutes === 0
      ? hours
      : t('timePicker.time', { hours, minutes: t('timePicker.minutes', { count: minutes }) });
  };
}

/** Seletor de horário (24 h) com hora e minuto ajustáveis separadamente. */
export function TimePicker({ label, value, onChange, minuteStep = 5, testID }: TimePickerProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const spokenTime = useSpokenTime()(value);
  // Valor mais recente: na repetição, cada ajuste parte do anterior mesmo antes
  // de o pai renderizar de novo.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const apply = (next: number) => {
    latest.current = next;
    onChange(next);
  };
  const pad = (number: number) => String(number).padStart(2, '0');

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="label">{label}</Text>
      <View style={[styles.row, { gap: theme.spacing.md }]}>
        <TimeUnit
          accessibilityLabel={t('timePicker.unitLabel', { label, unit: t('timePicker.hour') })}
          spokenTime={spokenTime}
          display={pad(Math.floor(value / MINUTES_PER_HOUR))}
          increase={() => apply(stepHours(latest.current, 1))}
          decrease={() => apply(stepHours(latest.current, -1))}
          increaseLabel={t('timePicker.increaseHour')}
          decreaseLabel={t('timePicker.decreaseHour')}
          testID={testID && `${testID}-hour`}
        />
        <Text variant="display" importantForAccessibility="no" accessibilityElementsHidden>
          :
        </Text>
        <TimeUnit
          accessibilityLabel={t('timePicker.unitLabel', { label, unit: t('timePicker.minute') })}
          spokenTime={spokenTime}
          display={pad(value % MINUTES_PER_HOUR)}
          increase={() => apply(stepMinutes(latest.current, 1, minuteStep))}
          decrease={() => apply(stepMinutes(latest.current, -1, minuteStep))}
          increaseLabel={t('timePicker.increaseMinute')}
          decreaseLabel={t('timePicker.decreaseMinute')}
          testID={testID && `${testID}-minute`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  unit: { alignItems: 'center' },
  value: { fontVariant: ['tabular-nums'], textAlign: 'center' },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
