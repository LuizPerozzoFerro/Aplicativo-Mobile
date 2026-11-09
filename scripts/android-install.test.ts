// eslint-disable-next-line @typescript-eslint/no-require-imports
const { installWithRetry } = require('./android-install') as {
  installWithRetry: (steps: {
    ping: () => boolean;
    install: () => boolean;
    restart: () => void;
    log: (message: string) => void;
  }) => boolean;
};

function steps(pings: boolean[], installs: boolean[]) {
  const restart = jest.fn();
  const install = jest.fn(() => installs.shift() ?? false);
  const ping = jest.fn(() => pings.shift() ?? false);
  return { ping, install, restart, log: jest.fn() };
}

describe('installWithRetry', () => {
  it('instala de primeira, sem reiniciar o adb', () => {
    const fake = steps([true], [true]);
    expect(installWithRetry(fake)).toBe(true);
    expect(fake.restart).not.toHaveBeenCalled();
    expect(fake.install).toHaveBeenCalledTimes(1);
  });

  it('instalação que estoura o tempo: reinicia o adb e tenta de novo', () => {
    const fake = steps([true, true], [false, true]);
    expect(installWithRetry(fake)).toBe(true);
    expect(fake.restart).toHaveBeenCalledTimes(1);
    expect(fake.install).toHaveBeenCalledTimes(2);
  });

  it('adb mudo: nem tenta instalar antes de reiniciar', () => {
    const fake = steps([false, true], [true]);
    expect(installWithRetry(fake)).toBe(true);
    expect(fake.restart).toHaveBeenCalledTimes(1);
    expect(fake.install).toHaveBeenCalledTimes(1);
  });

  it('duas falhas: desiste, em vez de ficar parado', () => {
    const fake = steps([true, true, true], [false, false, true]);
    expect(installWithRetry(fake)).toBe(false);
    expect(fake.install).toHaveBeenCalledTimes(2);
    expect(fake.restart).toHaveBeenCalledTimes(1);
  });
});
