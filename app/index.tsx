import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { variant } from '@/config/variant';
import { formatDate, formatNumber } from '@/i18n/format';

// Tela provisória dos passos 2 a 5: confirma no aparelho a variante, o i18n,
// a formatação no idioma ativo e o plural. Sai na navegação do passo 6.
export default function Index() {
  const { t } = useTranslation('common');

  return (
    <View style={styles.container}>
      <Text>{t('foundation.title')}</Text>
      <Text>{t('foundation.environment', { environment: variant.environment })}</Text>
      <Text>{t('foundation.today', { date: formatDate(new Date()) })}</Text>
      <Text>{t('foundation.sampleNumber', { value: formatNumber(1234.5) })}</Text>
      <Text>{t('foundation.days', { count: 1 })}</Text>
      <Text>{t('foundation.days', { count: 2 })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
});
