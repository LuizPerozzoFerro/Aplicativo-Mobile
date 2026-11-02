import { render, screen } from '@testing-library/react-native';

import { Button } from './components/Button';
import { getTheme } from './theme';
import { colors } from './tokens';

// Simula o sistema em modo escuro.
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => 'dark',
}));

describe('tema', () => {
  it('getTheme entrega a paleta de cada esquema', () => {
    expect(getTheme('light').colors).toBe(colors.light);
    expect(getTheme('dark').colors).toBe(colors.dark);
  });

  it('os componentes seguem o modo escuro do sistema', async () => {
    await render(<Button label="Continuar" />);
    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: colors.dark.primary });
    expect(screen.getByText('Continuar')).toHaveStyle({ color: colors.dark.onPrimary });
  });
});
