import { StyleSheet, Text, View } from 'react-native';

import { variant } from '@/config/variant';

// Tela provisória do passo 2: só confirma que o app sobe com a variante certa.
// Será substituída pela navegação no passo 6, e os textos entram pelo i18n no passo 4.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text>{variant.environment}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
