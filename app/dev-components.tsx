import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { variant } from '@/config/variant';
import {
  Button,
  ChipGroup,
  Screen,
  Text,
  TextField,
  TimePicker,
  TimeRangePicker,
  confirmDialog,
  type TimeRangeValue,
} from '@/ui';

const MAX_LENGTH = 280;

// Vitrine dos componentes do passo 3 da Fase 3, só em development: conferir no
// aparelho o tema, a fonte no máximo e o TalkBack antes de os componentes
// entrarem nas telas (NOTAS-APP.md). Nas outras variantes, volta ao início.
export default function DevComponentsScreen() {
  const { t } = useTranslation(['dev', 'common']);
  const [multiple, setMultiple] = useState<string[]>(['a']);
  const [single, setSingle] = useState<string[]>(['b']);
  const [text, setText] = useState('');
  const [time, setTime] = useState(21 * 60);
  const [range, setRange] = useState<TimeRangeValue>({ start: 23 * 60 + 30, end: 60 });
  const [answer, setAnswer] = useState<boolean | null>(null);

  if (variant.environment !== 'development') return <Redirect href="/" />;

  const options = [
    { value: 'a', label: t('chips.first') },
    { value: 'b', label: t('chips.second') },
    { value: 'c', label: t('chips.third') },
  ];

  return (
    <Screen>
      <Text variant="title">{t('title')}</Text>
      <Text color="textMuted">{t('description')}</Text>

      <Text variant="heading">{t('chips.multiple')}</Text>
      <ChipGroup
        label={t('chips.multiple')}
        options={options}
        selected={multiple}
        onChange={setMultiple}
      />
      <Text variant="heading">{t('chips.single')}</Text>
      <ChipGroup
        label={t('chips.single')}
        options={options}
        selected={single}
        onChange={setSingle}
        mode="single"
      />

      <TextField
        label={t('textField.label')}
        value={text}
        onChangeText={setText}
        multiline
        helper={t('textField.helper')}
        counter={t('textField.counter', { current: text.length, max: MAX_LENGTH })}
        error={text.length > 0 && text.length < 3 ? t('textField.error') : undefined}
      />

      <TimePicker label={t('timePicker')} value={time} onChange={setTime} testID="dev-time" />

      <Text variant="heading">{t('timeRange')}</Text>
      <TimeRangePicker value={range} onChange={setRange} testID="dev-range" />

      <Button
        label={t('confirm.open')}
        variant="secondary"
        onPress={async () =>
          setAnswer(
            await confirmDialog({
              title: t('confirm.title'),
              message: t('confirm.message'),
              confirmLabel: t('confirm.confirm'),
              cancelLabel: t('confirm.cancel'),
              destructive: true,
            }),
          )
        }
      />
      {answer !== null ? (
        <Text color="textMuted">
          {t('confirm.result', { answer: answer ? t('confirm.yes') : t('confirm.no') })}
        </Text>
      ) : null}

      <Button label={t('common:actions.back')} variant="text" onPress={() => router.back()} />
    </Screen>
  );
}
