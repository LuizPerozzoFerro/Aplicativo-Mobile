import '@/i18n';

import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { MIN_TOUCH_TARGET } from '../tokens';
import {
  REPEAT_DELAY_MS,
  REPEAT_INTERVAL_MS,
  TimePicker,
  stepHours,
  stepMinutes,
} from './TimePicker';
import { TimeRangePicker, type TimeRangeValue } from './TimeRangePicker';

const at = (hours: number, minutes: number) => hours * 60 + minutes;

describe('ajuste dos valores', () => {
  it('hora dá a volta (23 → 00 e 00 → 23) sem mexer nos minutos', () => {
    expect(stepHours(at(23, 30), 1)).toBe(at(0, 30));
    expect(stepHours(at(0, 30), -1)).toBe(at(23, 30));
    expect(stepHours(at(9, 5), 1)).toBe(at(10, 5));
  });

  it('minuto anda de 5 em 5 e dá a volta (55 → 00 e 00 → 55) sem mexer na hora', () => {
    expect(stepMinutes(at(21, 55), 1, 5)).toBe(at(21, 0));
    expect(stepMinutes(at(21, 0), -1, 5)).toBe(at(21, 55));
    expect(stepMinutes(at(21, 30), 1, 5)).toBe(at(21, 35));
    expect(stepMinutes(at(21, 30), -1, 5)).toBe(at(21, 25));
  });

  it('minuto fora do passo vai ao múltiplo seguinte ou anterior', () => {
    expect(stepMinutes(at(8, 7), 1, 5)).toBe(at(8, 10));
    expect(stepMinutes(at(8, 7), -1, 5)).toBe(at(8, 5));
    expect(stepMinutes(at(8, 58), 1, 5)).toBe(at(8, 0));
    expect(stepMinutes(at(8, 3), -1, 5)).toBe(at(8, 0));
  });

  it('outros passos', () => {
    expect(stepMinutes(at(8, 45), 1, 15)).toBe(at(8, 0));
    expect(stepMinutes(at(8, 59), 1, 1)).toBe(at(8, 0));
    expect(stepMinutes(at(8, 0), -1, 1)).toBe(at(8, 59));
  });
});

function Harness({ initial, onChange }: { initial: number; onChange?: (value: number) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <TimePicker
      label="Horário do check-in"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      testID="picker"
    />
  );
}

const hourControl = () => screen.getByRole('adjustable', { name: 'Horário do check-in, Hora' });
const minuteControl = () =>
  screen.getByRole('adjustable', { name: 'Horário do check-in, Minutos' });

describe('TimePicker no leitor de tela', () => {
  it('hora e minuto são controles ajustáveis que anunciam o horário completo', async () => {
    await render(<Harness initial={at(21, 30)} />);
    expect(hourControl()).toHaveAccessibilityValue({ text: '21 horas e 30 minutos' });
    expect(minuteControl()).toHaveAccessibilityValue({ text: '21 horas e 30 minutos' });
  });

  it.each([
    [at(21, 0), '21 horas'],
    [at(0, 0), 'zero hora'],
    [at(0, 5), 'zero hora e 5 minutos'],
    [at(1, 1), '1 hora e 1 minuto'],
    [at(23, 55), '23 horas e 55 minutos'],
  ])('%p minutos é falado como "%s"', async (value, spoken) => {
    await render(<Harness initial={value} />);
    expect(hourControl()).toHaveAccessibilityValue({ text: spoken });
  });

  it('deslizar para cima e para baixo (increment/decrement) muda o valor, com volta', async () => {
    await render(<Harness initial={at(23, 55)} />);
    await fireEvent(hourControl(), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(hourControl()).toHaveAccessibilityValue({ text: 'zero hora e 55 minutos' });
    await fireEvent(minuteControl(), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(hourControl()).toHaveAccessibilityValue({ text: 'zero hora' });
    await fireEvent(hourControl(), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    expect(hourControl()).toHaveAccessibilityValue({ text: '23 horas' });
  });

  it('declara as ações increment e decrement nos dois controles', async () => {
    await render(<Harness initial={at(9, 0)} />);
    for (const control of [hourControl(), minuteControl()]) {
      expect(control.props.accessibilityActions).toEqual([
        { name: 'increment' },
        { name: 'decrement' },
      ]);
    }
  });
});

describe('TimePicker pelo toque', () => {
  it('tocar em + ou − ajusta uma vez', async () => {
    const onChange = jest.fn();
    await render(<Harness initial={at(21, 0)} onChange={onChange} />);
    const user = userEvent.setup();
    await user.press(screen.getByTestId('picker-hour-increase'));
    expect(onChange).toHaveBeenLastCalledWith(at(22, 0));
    await user.press(screen.getByTestId('picker-minute-decrease'));
    expect(onChange).toHaveBeenLastCalledWith(at(22, 55));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(screen.getByText('22')).toBeOnTheScreen();
    expect(screen.getByText('55')).toBeOnTheScreen();
  });

  describe('segurar repete o ajuste', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('repete enquanto segura e para ao soltar, sem um ajuste extra ao soltar', async () => {
      const onChange = jest.fn();
      await render(<Harness initial={at(22, 0)} onChange={onChange} />);
      const button = screen.getByTestId('picker-hour-increase');

      await fireEvent(button, 'pressIn');
      await fireEvent(button, 'longPress');
      expect(onChange).toHaveBeenCalledTimes(1);
      await act(() => jest.advanceTimersByTime(REPEAT_INTERVAL_MS * 3));
      expect(onChange).toHaveBeenCalledTimes(4);
      // 22 → 23 → 00 → 01 → 02: cada repetição parte do valor anterior e dá a volta.
      expect(onChange.mock.calls.map(([value]) => value / 60)).toEqual([23, 0, 1, 2]);

      await fireEvent(button, 'pressOut');
      await act(() => jest.advanceTimersByTime(REPEAT_INTERVAL_MS * 5));
      expect(onChange).toHaveBeenCalledTimes(4);
    });

    it('com um toque longo de verdade, começa a repetir depois da espera', async () => {
      const onChange = jest.fn();
      await render(<Harness initial={at(10, 0)} onChange={onChange} />);
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await user.longPress(screen.getByTestId('picker-minute-increase'), {
        duration: REPEAT_DELAY_MS + REPEAT_INTERVAL_MS * 2 + 10,
      });
      // Um ajuste ao reconhecer o toque longo e dois repetidos; nenhum ao soltar.
      expect(onChange.mock.calls.map(([value]) => value % 60)).toEqual([5, 10, 15]);
      await act(() => jest.advanceTimersByTime(REPEAT_INTERVAL_MS * 5));
      expect(onChange).toHaveBeenCalledTimes(3);
    });

    it('para de repetir se a tela sair (desmontar)', async () => {
      const onChange = jest.fn();
      const view = await render(<Harness initial={at(10, 0)} onChange={onChange} />);
      const button = screen.getByTestId('picker-hour-decrease');
      await fireEvent(button, 'pressIn');
      await fireEvent(button, 'longPress');
      await view.unmount();
      await act(() => jest.advanceTimersByTime(REPEAT_INTERVAL_MS * 5));
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });
});

describe('TimePicker com fonte grande', () => {
  const buttons = () =>
    ['hour-increase', 'hour-decrease', 'minute-increase', 'minute-decrease'].map((id) =>
      screen.getByTestId(`picker-${id}`),
    );

  it('cada botão tem área de toque mínima de 48 dp', async () => {
    await render(<Harness initial={at(21, 30)} />);
    for (const button of buttons()) {
      expect(button).toHaveStyle({ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET });
    }
  });

  it('nenhum botão tem altura ou largura fixa, então crescem com a fonte do sistema', async () => {
    await render(<Harness initial={at(21, 30)} />);
    for (const button of buttons()) {
      const style = StyleSheet.flatten(button.props.style);
      expect(style.height).toBeUndefined();
      expect(style.width).toBeUndefined();
    }
  });

  it('os textos acompanham a fonte do sistema (sem limite de escala)', async () => {
    await render(<Harness initial={at(21, 30)} />);
    for (const text of [
      screen.getByText('21'),
      screen.getByText('30'),
      ...screen.getAllByText('+'),
    ]) {
      expect(text.props.allowFontScaling).not.toBe(false);
      expect(text.props.maxFontSizeMultiplier).toBeUndefined();
    }
  });
});

describe('TimeRangePicker', () => {
  function RangeHarness({ initial }: { initial: TimeRangeValue }) {
    const [value, setValue] = useState(initial);
    return <TimeRangePicker value={value} onChange={setValue} testID="range" />;
  }

  it('tem início e fim como seletores próprios', async () => {
    await render(<RangeHarness initial={{ start: at(23, 30), end: at(1, 0) }} />);
    expect(screen.getByRole('adjustable', { name: 'Início, Hora' })).toHaveAccessibilityValue({
      text: '23 horas e 30 minutos',
    });
    expect(screen.getByRole('adjustable', { name: 'Fim, Hora' })).toHaveAccessibilityValue({
      text: '1 hora',
    });
  });

  it('avisa quando a faixa atravessa a meia-noite', async () => {
    await render(<RangeHarness initial={{ start: at(23, 30), end: at(1, 0) }} />);
    expect(screen.getByText('Termina no dia seguinte')).toBeOnTheScreen();
  });

  it('avisa, como erro, quando início e fim ficam iguais', async () => {
    await render(<RangeHarness initial={{ start: at(22, 0), end: at(23, 0) }} />);
    expect(screen.queryByText('Termina no dia seguinte')).toBeNull();
    await userEvent.setup().press(screen.getByTestId('range-end-hour-decrease'));
    expect(screen.getByText('O início e o fim precisam ser diferentes')).toBeOnTheScreen();
  });
});
