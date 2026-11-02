import { useTranslation } from 'react-i18next';

import { variant } from '@/config/variant';
import { formatDate, formatNumber } from '@/i18n/format';
import { Button, Card, EmptyState, ListItem, Screen, Text } from '@/ui';

// Tela provisória dos passos 2 a 5: confirma no aparelho a variante, o i18n e
// os componentes do design system nos dois temas. Sai na navegação do passo 6.
export default function Index() {
  const { t } = useTranslation('common');

  return (
    <Screen>
      <Text variant="title">{t('foundation.title')}</Text>
      <Card>
        <Text>{t('foundation.environment', { environment: variant.environment })}</Text>
        <Text color="textMuted">{t('foundation.today', { date: formatDate(new Date()) })}</Text>
        <Text color="textMuted">
          {t('foundation.sampleNumber', { value: formatNumber(1234.5) })}
        </Text>
        <Text variant="caption" color="textMuted">
          {[0, 1, 2].map((count) => t('foundation.days', { count })).join(' · ')}
        </Text>
      </Card>
      <Button label={t('actions.continue')} />
      <Button label={t('foundation.secondary')} variant="secondary" />
      <Button label={t('foundation.textButton')} variant="text" />
      <Button label={t('foundation.disabled')} disabled />
      <Card>
        <Text>{t('foundation.cardText')}</Text>
      </Card>
      <ListItem
        title={t('foundation.listTitle')}
        subtitle={t('foundation.listSubtitle')}
        onPress={() => {}}
      />
      <EmptyState
        title={t('foundation.emptyTitle')}
        description={t('foundation.emptyDescription')}
      />
    </Screen>
  );
}
