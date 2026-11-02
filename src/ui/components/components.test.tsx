import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { getTheme } from '../theme';
import { MIN_TOUCH_TARGET } from '../tokens';
import { Button } from './Button';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { ListItem } from './ListItem';
import { Screen } from './Screen';
import { Text } from './Text';

const light = getTheme('light');

describe('Button', () => {
  it('é um botão acessível que chama onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continuar" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Continuar' });
    await userEvent.setup().press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('desabilitado não chama onPress e anuncia o estado', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continuar" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Continuar' });
    expect(button).toBeDisabled();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it.each(['primary', 'secondary', 'text'] as const)(
    'variante %s tem área de toque mínima de 48 dp',
    async (variant) => {
      await render(<Button label="Ok" variant={variant} />);
      expect(screen.getByRole('button')).toHaveStyle({
        minHeight: MIN_TOUCH_TARGET,
        minWidth: MIN_TOUCH_TARGET,
      });
    },
  );

  it('usa as cores do tema em cada variante', async () => {
    await render(<Button label="Principal" />);
    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: light.colors.primary });
    expect(screen.getByText('Principal')).toHaveStyle({ color: light.colors.onPrimary });
  });
});

describe('Text', () => {
  it('aplica a variante tipográfica e a cor', async () => {
    await render(
      <Text variant="caption" color="textMuted">
        Legenda
      </Text>,
    );
    expect(screen.getByText('Legenda')).toHaveStyle({
      ...light.typography.caption,
      color: light.colors.textMuted,
    });
  });

  it('anuncia títulos como cabeçalho', async () => {
    await render(<Text variant="title">Início</Text>);
    expect(screen.getByRole('header', { name: 'Início' })).toBeOnTheScreen();
  });

  it('não desliga o ajuste de fonte do sistema', async () => {
    await render(<Text>Corpo</Text>);
    expect(screen.getByText('Corpo').props.allowFontScaling).not.toBe(false);
    expect(screen.getByText('Corpo').props.maxFontSizeMultiplier).toBeUndefined();
  });
});

describe('ListItem', () => {
  it('sem onPress é só uma linha, com altura mínima de 48 dp', async () => {
    await render(<ListItem title="Versão" subtitle="1.0.0" testID="item" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('item')).toHaveStyle({ minHeight: MIN_TOUCH_TARGET });
  });

  it('com onPress é um botão que lê título e subtítulo juntos', async () => {
    const onPress = jest.fn();
    await render(<ListItem title="Sobre o app" subtitle="Versão e ambiente" onPress={onPress} />);
    const item = screen.getByRole('button', { name: 'Sobre o app, Versão e ambiente' });
    expect(item).toHaveStyle({ minHeight: MIN_TOUCH_TARGET });
    await userEvent.setup().press(item);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('mostra título, descrição e a ação', async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState
        title="Nada por aqui"
        description="Seus dados aparecem aqui."
        action={{ label: 'Começar', onPress }}
      />,
    );
    expect(screen.getByRole('header', { name: 'Nada por aqui' })).toBeOnTheScreen();
    expect(screen.getByText('Seus dados aparecem aqui.')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Começar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('funciona só com o título', async () => {
    await render(<EmptyState title="Vazio" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Card e Screen', () => {
  it('Card usa a superfície do tema', async () => {
    await render(<Card testID="card" />);
    expect(screen.getByTestId('card')).toHaveStyle({ backgroundColor: light.colors.surface });
  });

  it('Screen usa o fundo do tema e rola por padrão', async () => {
    await render(
      <Screen testID="screen">
        <Text>Conteúdo</Text>
      </Screen>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('screen').props.style)).toMatchObject({
      backgroundColor: light.colors.background,
    });
    expect(JSON.stringify(screen.toJSON())).toContain('RCTScrollView');
  });

  it('Screen sem rolagem não usa ScrollView', async () => {
    await render(
      <Screen scroll={false}>
        <Text>Conteúdo</Text>
      </Screen>,
    );
    expect(JSON.stringify(screen.toJSON())).not.toContain('RCTScrollView');
  });
});
