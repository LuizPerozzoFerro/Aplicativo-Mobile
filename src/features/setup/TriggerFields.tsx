import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import type { NewTrigger } from '@/data/repositories';
import {
  addTimeRange,
  formatTimeRange,
  isPresetTimeRange,
  parseTimeRange,
  PRESET_TIME_RANGES,
  type TimeRange,
} from '@/domain/timeRange';
import {
  EMOTIONS,
  isEmotion,
  isShortcutSelected,
  isWeekday,
  toggleWeekdayShortcut,
  WEEKDAYS,
  type Emotion,
  type Weekday,
  type WeekdayShortcut,
} from '@/domain/triggers';
import { useTriggerLabels } from '@/features/onboarding/useTriggerLabels';
import {
  Button,
  Chip,
  ChipGroup,
  Text,
  TimeRangePicker,
  useTheme,
  type TimeRangeValue,
} from '@/ui';

const SHORTCUTS: readonly WeekdayShortcut[] = ['workdays', 'weekend'];

/** Faixa sugerida ao abrir "Adicionar faixa personalizada". */
const NEW_RANGE: TimeRangeValue = { start: 23 * 60, end: 60 };

export type TriggerState = { ranges: TimeRange[]; weekdays: Weekday[]; emotions: Emotion[] };

/** Gatilhos gerais gravados (valem para todas as compulsões). */
export function loadTriggers(): TriggerState {
  const state: TriggerState = { ranges: [], weekdays: [], emotions: [] };
  for (const trigger of getRepositories().triggers.list()) {
    if (trigger.compulsionId !== null) continue;
    if (trigger.kind === 'time') {
      const range = parseTimeRange(trigger.value);
      if (range) state.ranges = addTimeRange(state.ranges, range);
    } else if (trigger.kind === 'weekday') {
      const day = Number(trigger.value);
      if (isWeekday(day)) state.weekdays.push(day);
    } else if (isEmotion(trigger.value)) {
      state.emotions.push(trigger.value);
    }
  }
  return state;
}

/** Grava os gatilhos gerais (valem para todas as compulsões), trocando os anteriores. */
export function saveTriggers(value: TriggerState): void {
  const triggers: NewTrigger[] = [
    ...value.ranges.map((range) => ({ kind: 'time' as const, value: formatTimeRange(range) })),
    ...value.weekdays.map((day) => ({ kind: 'weekday' as const, value: String(day) })),
    ...value.emotions.map((emotion) => ({ kind: 'emotion' as const, value: emotion })),
  ];
  getRepositories().triggers.replaceAll(triggers);
}

/**
 * Horários (12 faixas de 2 horas e faixas personalizadas), dias com atalhos e
 * emoções (spec 02, seção 4.4, etapa 4). Tudo opcional. Usado no onboarding e
 * no Perfil.
 */
export function TriggerFields({
  value,
  onChange,
}: {
  value: TriggerState;
  onChange: (value: TriggerState) => void;
}) {
  const { t } = useTranslation('onboarding');
  const theme = useTheme();
  const labels = useTriggerLabels();
  const [draft, setDraft] = useState<TimeRangeValue | null>(null);

  const presetValues = PRESET_TIME_RANGES.map(formatTimeRange);
  const customRanges = value.ranges.filter((range) => !isPresetTimeRange(range));

  const setPresets = (values: string[]) =>
    onChange({
      ...value,
      ranges: [
        ...PRESET_TIME_RANGES.filter((range) => values.includes(formatTimeRange(range))),
        ...customRanges,
      ],
    });

  const removeCustom = (values: string[]) =>
    onChange({
      ...value,
      ranges: value.ranges.filter(
        (range) => isPresetTimeRange(range) || values.includes(formatTimeRange(range)),
      ),
    });

  const addDraft = () => {
    if (!draft || draft.start === draft.end) return;
    // Igual a uma faixa fixa: marca a fixa, sem duplicar (addTimeRange).
    onChange({ ...value, ranges: addTimeRange(value.ranges, draft) });
    setDraft(null);
  };

  const toggleShortcut = (shortcut: WeekdayShortcut) =>
    onChange({ ...value, weekdays: toggleWeekdayShortcut(value.weekdays, shortcut) });

  return (
    <>
      <View style={{ gap: theme.spacing.md }}>
        <Text variant="heading">{t('triggers.times.heading')}</Text>
        <Text color="textMuted">{t('triggers.times.hint')}</Text>
        <ChipGroup
          label={t('triggers.times.heading')}
          options={PRESET_TIME_RANGES.map((range, index) => ({
            value: presetValues[index]!,
            label: labels.formatRange(range),
          }))}
          selected={value.ranges.filter(isPresetTimeRange).map(formatTimeRange)}
          onChange={setPresets}
          testID="preset-ranges"
        />
        {customRanges.length > 0 ? (
          <>
            <Text variant="bodyStrong">{t('triggers.times.custom')}</Text>
            <Text color="textMuted">{t('triggers.times.customHint')}</Text>
            <ChipGroup
              label={t('triggers.times.custom')}
              options={customRanges.map((range) => ({
                value: formatTimeRange(range),
                label: labels.formatRange(range),
              }))}
              selected={customRanges.map(formatTimeRange)}
              onChange={removeCustom}
              testID="custom-ranges"
            />
          </>
        ) : null}
        {draft ? (
          <View style={{ gap: theme.spacing.sm }}>
            <TimeRangePicker value={draft} onChange={setDraft} testID="new-range" />
            <Button
              label={t('triggers.times.confirmAdd')}
              onPress={addDraft}
              disabled={draft.start === draft.end}
            />
            <Button
              label={t('triggers.times.cancel')}
              variant="text"
              onPress={() => setDraft(null)}
            />
          </View>
        ) : (
          <Button
            label={t('triggers.times.add')}
            variant="secondary"
            onPress={() => setDraft(NEW_RANGE)}
          />
        )}
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <Text variant="heading">{t('triggers.days.heading')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {SHORTCUTS.map((shortcut) => (
            <Chip
              key={shortcut}
              label={
                shortcut === 'workdays' ? t('triggers.days.workdays') : t('triggers.days.weekend')
              }
              selected={isShortcutSelected(value.weekdays, shortcut)}
              onPress={() => toggleShortcut(shortcut)}
            />
          ))}
        </View>
        <ChipGroup<Weekday>
          label={t('triggers.days.heading')}
          options={WEEKDAYS.map((day) => ({ value: day, label: labels.weekdays[day] }))}
          selected={value.weekdays}
          onChange={(weekdays) => onChange({ ...value, weekdays })}
          testID="weekdays"
        />
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <Text variant="heading">{t('triggers.emotions.heading')}</Text>
        <Text color="textMuted">{t('triggers.emotions.hint')}</Text>
        <ChipGroup<Emotion>
          label={t('triggers.emotions.heading')}
          options={EMOTIONS.map((emotion) => ({ value: emotion, label: labels.emotions[emotion] }))}
          selected={value.emotions}
          onChange={(emotions) => onChange({ ...value, emotions })}
          testID="emotions"
        />
      </View>
    </>
  );
}
