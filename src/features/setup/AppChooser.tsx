import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getVisibleAppChoices, hasOtherAppChoices, mergeAppSelection } from '@/domain/appChoices';
import type { MonitoredAppRole } from '@/domain/compulsion';
import { Button, ChipGroup, Text, TextField } from '@/ui';

import type { AppTargets } from './appTargets';

type Props = {
  /** Nome do grupo para o leitor de tela, já traduzido. */
  label: string;
  role: MonitoredAppRole;
  apps: AppTargets;
  selected: readonly string[];
  onChange: (selected: string[]) => void;
  testID: string;
};

/**
 * Escolha de apps, no onboarding e no Perfil: sugeridos e marcados à vista, e
 * os demais atrás de "Ver outros apps", com busca. Um aparelho real tem
 * centenas de apps, e a lista inteira escondia o que já vinha marcado.
 */
export function AppChooser({ label, role, apps, selected, onChange, testID }: Props) {
  const { t } = useTranslation('onboarding');
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  if (apps.targets === null) return null;
  if (apps.options.length === 0) return <Text color="textMuted">{t('setup.noAppsFound')}</Text>;

  const visible = getVisibleAppChoices(apps.options, { role, selected, expanded, query });
  const canExpand = hasOtherAppChoices(apps.options, role, selected);

  const toggleExpanded = () => {
    setExpanded(!expanded);
    setQuery('');
  };

  return (
    <>
      {expanded ? (
        <TextField
          label={t('setup.searchApps')}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
      ) : null}
      {visible.length > 0 ? (
        <ChipGroup
          label={label}
          options={visible}
          selected={selected}
          onChange={(changed) =>
            onChange(mergeAppSelection(apps.options, visible, selected, changed))
          }
          testID={testID}
        />
      ) : (
        <Text color="textMuted">
          {expanded ? t('setup.noSearchResults') : t('setup.noSuggestedApps')}
        </Text>
      )}
      {expanded || canExpand ? (
        <Button
          label={expanded ? t('setup.hideOtherApps') : t('setup.showOtherApps')}
          variant="text"
          onPress={toggleExpanded}
        />
      ) : null}
    </>
  );
}
