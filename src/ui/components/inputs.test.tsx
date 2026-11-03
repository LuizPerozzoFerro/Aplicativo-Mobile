import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { Alert } from 'react-native';

import { confirmDialog } from '../confirmDialog';
import { getTheme } from '../theme';
import { MIN_TOUCH_TARGET } from '../tokens';
import { Chip, ChipGroup, type ChipMode } from './Chip';
import { OptionCard } from './OptionCard';
import { TextField } from './TextField';

const light = getTheme('light');

describe('Chip', () => {
  it('múltiplo é caixa de seleção e anuncia se está marcado', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Tédio" selected onPress={onPress} />);
    const chip = screen.getByRole('checkbox', { name: 'Tédio' });
    expect(chip).toBeChecked();
    await userEvent.setup().press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('simples é rádio', async () => {
    await render(<Chip label="60 min" selected={false} mode="single" />);
    expect(screen.getByRole('radio', { name: '60 min' })).not.toBeChecked();
  });

  it('tem área de toque mínima de 48 dp', async () => {
    await render(<Chip label="Sábado" selected={false} />);
    expect(screen.getByRole('checkbox')).toHaveStyle({
      minHeight: MIN_TOUCH_TARGET,
      minWidth: MIN_TOUCH_TARGET,
    });
  });

  it('marcado e desmarcado diferem no fundo e no peso da fonte', async () => {
    await render(
      <>
        <Chip label="Marcado" selected />
        <Chip label="Desmarcado" selected={false} />
      </>,
    );
    expect(screen.getByRole('checkbox', { name: 'Marcado' })).toHaveStyle({
      backgroundColor: light.colors.primary,
    });
    expect(screen.getByText('Marcado')).toHaveStyle({
      color: light.colors.onPrimary,
      fontWeight: light.typography.label.fontWeight,
    });
    expect(screen.getByRole('checkbox', { name: 'Desmarcado' })).toHaveStyle({
      backgroundColor: light.colors.surface,
      borderColor: light.colors.outline,
    });
    expect(screen.getByText('Desmarcado')).toHaveStyle({
      fontWeight: light.typography.body.fontWeight,
    });
  });

  it('desabilitado não responde e anuncia o estado', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Domingo" selected={false} disabled onPress={onPress} />);
    const chip = screen.getByRole('checkbox');
    expect(chip).toBeDisabled();
    await userEvent.setup().press(chip);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('ChipGroup', () => {
  const OPTIONS = [
    { value: 'boredom', label: 'Tédio' },
    { value: 'stress', label: 'Estresse' },
    { value: 'sadness', label: 'Tristeza' },
  ] as const;
  type Value = (typeof OPTIONS)[number]['value'];

  function Harness({ mode, initial }: { mode: ChipMode; initial: Value[] }) {
    const [selected, setSelected] = useState<Value[]>(initial);
    return (
      <ChipGroup
        label="Emoções"
        options={OPTIONS}
        selected={selected}
        onChange={setSelected}
        mode={mode}
        testID="group"
      />
    );
  }

  it('múltiplo: cada toque alterna e a seleção sai na ordem das opções', async () => {
    const onChange = jest.fn();
    await render(
      <ChipGroup label="Emoções" options={OPTIONS} selected={['sadness']} onChange={onChange} />,
    );
    await userEvent.setup().press(screen.getByRole('checkbox', { name: 'Tédio' }));
    expect(onChange).toHaveBeenLastCalledWith(['boredom', 'sadness']);
    await userEvent.setup().press(screen.getByRole('checkbox', { name: 'Tristeza' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('múltiplo: o estado de cada chip acompanha a seleção', async () => {
    await render(<Harness mode="multiple" initial={[]} />);
    const user = userEvent.setup();
    await user.press(screen.getByRole('checkbox', { name: 'Estresse' }));
    await user.press(screen.getByRole('checkbox', { name: 'Tédio' }));
    expect(screen.getByRole('checkbox', { name: 'Tédio' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Estresse' })).toBeChecked();
    await user.press(screen.getByRole('checkbox', { name: 'Tédio' }));
    expect(screen.getByRole('checkbox', { name: 'Tédio' })).not.toBeChecked();
  });

  it('simples: grupo de rádio; tocar marca só um e tocar de novo não desmarca', async () => {
    await render(<Harness mode="single" initial={['boredom']} />);
    // O grupo não é um elemento acessível próprio (senão o TalkBack não chegaria
    // aos chips): só leva o papel e o nome.
    expect(screen.getByTestId('group').props).toMatchObject({
      accessibilityRole: 'radiogroup',
      accessibilityLabel: 'Emoções',
    });
    const user = userEvent.setup();
    await user.press(screen.getByRole('radio', { name: 'Estresse' }));
    expect(screen.getByRole('radio', { name: 'Estresse' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Tédio' })).not.toBeChecked();
    await user.press(screen.getByRole('radio', { name: 'Estresse' }));
    expect(screen.getByRole('radio', { name: 'Estresse' })).toBeChecked();
  });
});

describe('TextField', () => {
  it('o campo tem o rótulo como nome acessível e repassa o texto', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Por que eu quero mudar?" onChangeText={onChangeText} />);
    const input = screen.getByLabelText('Por que eu quero mudar?');
    await userEvent.setup().type(input, 'Por mim');
    expect(onChangeText).toHaveBeenLastCalledWith('Por mim');
  });

  it('mostra apoio e contador, e o leitor de tela também os ouve', async () => {
    await render(<TextField label="Motivação" helper="Opcional" counter="12/280" />);
    expect(screen.getByText('Opcional')).toBeOnTheScreen();
    expect(screen.getByText('12/280')).toBeOnTheScreen();
    expect(screen.getByLabelText('Motivação').props.accessibilityHint).toBe('Opcional. 12/280');
  });

  it('com erro, o contorno e a mensagem ficam na cor de erro, no lugar do apoio', async () => {
    await render(
      <TextField
        label="Motivação"
        helper="Opcional"
        counter="2/280"
        error="Escreva pelo menos 3"
      />,
    );
    expect(screen.getByLabelText('Motivação')).toHaveStyle({
      borderColor: light.colors.danger,
      borderWidth: 2,
    });
    expect(screen.getByText('Escreva pelo menos 3')).toHaveStyle({ color: light.colors.danger });
    expect(screen.queryByText('Opcional')).toBeNull();
    expect(screen.getByLabelText('Motivação').props.accessibilityHint).toBe(
      'Escreva pelo menos 3. 2/280',
    );
  });

  it('com foco, o contorno fica na cor de ação e mais grosso', async () => {
    const onFocus = jest.fn();
    await render(<TextField label="Motivação" onFocus={onFocus} />);
    const input = screen.getByLabelText('Motivação');
    expect(input).toHaveStyle({ borderColor: light.colors.outline });
    await fireEvent(input, 'focus');
    expect(onFocus).toHaveBeenCalled();
    expect(screen.getByLabelText('Motivação')).toHaveStyle({
      borderColor: light.colors.primary,
      borderWidth: 2,
    });
    await fireEvent(screen.getByLabelText('Motivação'), 'blur');
    expect(screen.getByLabelText('Motivação')).toHaveStyle({ borderColor: light.colors.outline });
  });

  it('tem altura mínima de 48 dp (o dobro, se for de várias linhas)', async () => {
    await render(
      <>
        <TextField label="Uma linha" />
        <TextField label="Várias linhas" multiline />
      </>,
    );
    expect(screen.getByLabelText('Uma linha')).toHaveStyle({ minHeight: MIN_TOUCH_TARGET });
    expect(screen.getByLabelText('Várias linhas')).toHaveStyle({
      minHeight: MIN_TOUCH_TARGET * 2,
    });
  });
});

describe('confirmDialog', () => {
  type AlertButtons = Parameters<typeof Alert.alert>[2];
  type AlertOptions = Parameters<typeof Alert.alert>[3];
  let alertSpy: jest.SpyInstance;
  const lastCall = () =>
    alertSpy.mock.calls.at(-1) as [string, string | undefined, AlertButtons, AlertOptions];

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });
  afterEach(() => alertSpy.mockRestore());

  const open = (destructive?: boolean) =>
    confirmDialog({
      title: 'Apagar meus dados?',
      message: 'Isso não pode ser desfeito.',
      confirmLabel: 'Apagar',
      cancelLabel: 'Cancelar',
      destructive,
    });

  it('usa o diálogo do sistema com os textos recebidos', () => {
    void open(true);
    const [title, message, buttons, options] = lastCall();
    expect(title).toBe('Apagar meus dados?');
    expect(message).toBe('Isso não pode ser desfeito.');
    expect(buttons?.map((button) => [button.text, button.style])).toEqual([
      ['Cancelar', 'cancel'],
      ['Apagar', 'destructive'],
    ]);
    expect(options?.cancelable).toBe(true);
  });

  it('confirmar resolve true', async () => {
    const result = open();
    lastCall()[2]?.[1]?.onPress?.();
    await expect(result).resolves.toBe(true);
    expect(lastCall()[2]?.[1]?.style).toBe('default');
  });

  it('cancelar ou fechar tocando fora resolve false', async () => {
    const cancelled = open();
    lastCall()[2]?.[0]?.onPress?.();
    await expect(cancelled).resolves.toBe(false);

    const dismissed = open();
    lastCall()[3]?.onDismiss?.();
    await expect(dismissed).resolves.toBe(false);
  });
});

describe('OptionCard', () => {
  it('é caixa de seleção com título e explicação no nome acessível', async () => {
    const onPress = jest.fn();
    await render(
      <OptionCard
        title="Vídeos curtos"
        description="Usar com moderação."
        selected={false}
        onPress={onPress}
      />,
    );
    const card = screen.getByRole('checkbox', { name: 'Vídeos curtos, Usar com moderação.' });
    expect(card).not.toBeChecked();
    await userEvent.setup().press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marcado: borda mais grossa na cor de ação e estado anunciado', async () => {
    await render(<OptionCard title="Conteúdo" selected />);
    const card = screen.getByRole('checkbox', { name: 'Conteúdo' });
    expect(card).toBeChecked();
    expect(card).toHaveStyle({ borderColor: light.colors.primary, borderWidth: 2 });
  });

  it('tem altura mínima de 48 dp', async () => {
    await render(<OptionCard title="Conteúdo" selected={false} />);
    expect(screen.getByRole('checkbox')).toHaveStyle({ minHeight: MIN_TOUCH_TARGET });
  });
});
