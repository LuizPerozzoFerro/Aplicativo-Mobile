import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { variant } from '@/config/variant';
import type { CatalogSource } from '@/domain/catalog';
import { formatDate } from '@/i18n/format';
import { Button, Text } from '@/ui';

import type { CatalogRefreshResult } from './catalogService';
import { getAppCatalogService } from './useCatalog';

// Ferramenta de teste do catálogo (spec 04, 5.12), só na tela de conferência
// do desenvolvimento: de onde vem o catálogo em uso, a versão, a última
// consulta e uma consulta forçada, sem esperar as 24 horas.
export function ContentDevTools() {
  const { t } = useTranslation('dev');
  const service = getAppCatalogService();
  const [current, setCurrent] = useState(() => service.current());
  const [result, setResult] = useState<CatalogRefreshResult | null>(null);

  const sourceTexts = {
    embedded: t('content.sources.embedded'),
    cache: t('content.sources.cache'),
  } satisfies Record<CatalogSource, string>;
  const resultTexts = {
    not_configured: t('content.results.not_configured'),
    not_due: t('content.results.not_due'),
    busy: t('content.results.busy'),
    updated: t('content.results.updated'),
    unchanged: t('content.results.unchanged'),
    failed: t('content.results.failed'),
  } satisfies Record<CatalogRefreshResult, string>;

  const refreshNow = async () => {
    setResult(null);
    setResult(await service.refresh({ force: true }).catch(() => 'failed' as const));
    setCurrent(service.current());
  };

  return (
    <>
      <Text variant="heading">{t('content.title')}</Text>
      <Text>
        {t('content.current', {
          source: sourceTexts[current.source],
          version: current.catalog.contentVersion,
          date: current.catalog.updatedAt,
        })}
      </Text>
      <Text>
        {t('content.fetchedAt', {
          time: current.fetchedAt
            ? formatDate(current.fetchedAt, { dateStyle: 'short', timeStyle: 'medium' })
            : t('content.never'),
        })}
      </Text>
      <Text>
        {variant.contentBaseUrl === null ? t('content.notConfigured') : t('content.configured')}
      </Text>
      {result ? <Text>{resultTexts[result]}</Text> : null}
      <Button label={t('content.refresh')} variant="secondary" onPress={() => void refreshNow()} />
    </>
  );
}
