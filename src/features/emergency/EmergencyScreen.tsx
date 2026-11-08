import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, BackHandler, Easing, StyleSheet, View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import {
  BREATH_EXHALE_MS,
  BREATH_INHALE_MS,
  EMERGENCY_BREATHING_MS,
  EMERGENCY_WAIT_MS,
  formatCountdown,
  getBreathingPhase,
  getRemainingSeconds,
} from '@/domain/emergency';
import type { EmergencyOutcome, EmergencySource } from '@/domain/monitoring';
import { Button, Card, Screen, Text, useTheme } from '@/ui';

import { useReduceMotion } from './useReduceMotion';

const TICK_MS = 250;
const CIRCLE_SIZE = 180;
const CIRCLE_MIN_SCALE = 0.55;

type Step = 'motivation' | 'breathing' | 'waiting' | 'question';
type Answer = Extract<EmergencyOutcome, 'passed' | 'not_passed'>;

/** Sem nada atrás (aberta a frio por um endereço), a saída é o Início. */
function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Abre a sessão ao entrar na tela e, se ela sair sem resposta (Sair, Voltar do
 * Android), registra como abandonada. Ir para outro app não encerra nada: uma
 * das sugestões é falar com alguém.
 */
function useEmergencySession(source: EmergencySource) {
  const openId = useRef<number | null>(null);
  const [initialSource] = useState(source);

  useEffect(() => {
    const sessions = getRepositories().emergencySessions;
    openId.current = sessions.start(initialSource).id;
    return () => {
      if (openId.current !== null) sessions.finish(openId.current, 'abandoned');
      openId.current = null;
    };
  }, [initialSource]);

  return (outcome: Answer) => {
    if (openId.current !== null)
      getRepositories().emergencySessions.finish(openId.current, outcome);
    openId.current = null;
  };
}

/** Tempo desde que a etapa apareceu, pelo relógio (src/domain/emergency.ts). */
function useElapsed(): number {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return now - startedAt;
}

/** Fluxo de emergência (spec 03, 5.5; doc 01, 6.7). Não guarda nada digitado. */
export function EmergencyScreen({ source }: { source: EmergencySource }) {
  const { t } = useTranslation('emergency');
  const finish = useEmergencySession(source);
  const [step, setStep] = useState<Step>('motivation');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const skip = () => setStep('question');

  // Aberta a frio não há tela atrás: o Voltar leva ao Início em vez de sair do app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) return false;
      router.replace('/');
      return true;
    });
    return () => subscription.remove();
  }, []);

  const respond = (outcome: Answer) => {
    finish(outcome);
    setAnswer(outcome);
  };

  return (
    <Screen testID="emergency-screen">
      {answer === null && (
        <View style={styles.leave}>
          <Button variant="text" label={t('leave')} onPress={leave} />
        </View>
      )}
      {answer !== null ? (
        <ResultStep answer={answer} />
      ) : step === 'motivation' ? (
        <MotivationStep onNext={() => setStep('breathing')} onSkip={skip} />
      ) : step === 'breathing' ? (
        <BreathingStep onDone={() => setStep('waiting')} onSkip={skip} />
      ) : step === 'waiting' ? (
        <WaitingStep onDone={skip} onSkip={skip} />
      ) : (
        <QuestionStep onAnswer={respond} />
      )}
    </Screen>
  );
}

function MotivationStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { t } = useTranslation('emergency');
  const [motivation] = useState(() => getRepositories().motivation.get()?.text ?? null);

  return (
    <>
      <Text variant="title" accessibilityLiveRegion="polite">
        {t('motivation.title')}
      </Text>
      <Card>
        {motivation !== null && <Text variant="label">{t('motivation.label')}</Text>}
        <Text variant="body">{motivation ?? t('motivation.fallback')}</Text>
      </Card>
      <Button label={t('motivation.start')} onPress={onNext} />
      <Button variant="text" label={t('skip')} onPress={onSkip} />
    </>
  );
}

/** Círculo que cresce ao inspirar e encolhe ao soltar o ar; parado com "remover animações". */
function BreathingCircle({ expanded, phaseKey }: { expanded: boolean; phaseKey: string }) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(CIRCLE_MIN_SCALE));

  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.timing(scale, {
      toValue: expanded ? 1 : CIRCLE_MIN_SCALE,
      duration: expanded ? BREATH_INHALE_MS : BREATH_EXHALE_MS,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [phaseKey, expanded, reduceMotion, scale]);

  return (
    <View style={styles.circleArea} importantForAccessibility="no-hide-descendants">
      <Animated.View
        testID="emergency-breathing-circle"
        style={[
          styles.circle,
          { backgroundColor: theme.colors.primary },
          { transform: [{ scale: reduceMotion ? 0.8 : scale }] },
        ]}
      />
    </View>
  );
}

function BreathingStep({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const { t } = useTranslation('emergency');
  const elapsed = useElapsed();
  const phase = getBreathingPhase(elapsed);
  const finished = elapsed >= EMERGENCY_BREATHING_MS;

  useEffect(() => {
    if (finished) onDone();
  }, [finished, onDone]);

  return (
    <>
      <Text variant="title">{t('breathing.title')}</Text>
      <BreathingCircle
        expanded={phase.kind === 'inhale'}
        phaseKey={`${phase.cycle}-${phase.kind}`}
      />
      <Text variant="display" style={styles.center} accessibilityLiveRegion="polite">
        {phase.kind === 'inhale' ? t('breathing.inhale') : t('breathing.exhale')}
      </Text>
      <Text variant="body" color="textMuted" style={styles.center} accessibilityRole="timer">
        {formatCountdown(getRemainingSeconds(EMERGENCY_BREATHING_MS, elapsed))}
      </Text>
      <Button variant="text" label={t('skip')} onPress={onSkip} />
    </>
  );
}

function WaitingStep({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const { t } = useTranslation('emergency');
  const elapsed = useElapsed();
  const finished = elapsed >= EMERGENCY_WAIT_MS;

  useEffect(() => {
    if (finished) onDone();
  }, [finished, onDone]);

  return (
    <>
      <Text variant="title" accessibilityLiveRegion="polite">
        {t('waiting.title')}
      </Text>
      <Text variant="display" style={[styles.center, styles.countdown]} accessibilityRole="timer">
        {formatCountdown(getRemainingSeconds(EMERGENCY_WAIT_MS, elapsed))}
      </Text>
      <Text variant="body">{t('waiting.description')}</Text>
      <Card>
        <Text variant="body">{t('waiting.suggestions.leave')}</Text>
        <Text variant="body">{t('waiting.suggestions.water')}</Text>
        <Text variant="body">{t('waiting.suggestions.talk')}</Text>
      </Card>
      <Button variant="text" label={t('skip')} onPress={onSkip} />
    </>
  );
}

function QuestionStep({ onAnswer }: { onAnswer: (answer: Answer) => void }) {
  const { t } = useTranslation('emergency');
  return (
    <>
      <Text variant="title" accessibilityLiveRegion="polite">
        {t('question.title')}
      </Text>
      <Button label={t('question.yes')} onPress={() => onAnswer('passed')} />
      <Button variant="secondary" label={t('question.no')} onPress={() => onAnswer('not_passed')} />
    </>
  );
}

function ResultStep({ answer }: { answer: Answer }) {
  const { t } = useTranslation('emergency');
  const passed = answer === 'passed';
  return (
    <>
      <Text variant="title" accessibilityLiveRegion="polite">
        {passed ? t('result.passedTitle') : t('result.notPassedTitle')}
      </Text>
      <Text variant="body">{passed ? t('result.passedText') : t('result.notPassedText')}</Text>
      <Button label={t('result.finish')} onPress={leave} />
    </>
  );
}

const styles = StyleSheet.create({
  leave: { alignItems: 'flex-end' },
  center: { textAlign: 'center' },
  countdown: { fontVariant: ['tabular-nums'] },
  circleArea: { alignItems: 'center', justifyContent: 'center', height: CIRCLE_SIZE },
  circle: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2 },
});
