import { useEvent } from 'expo';
import { router, useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, AppState, View } from 'react-native';

import { variant } from '@/config/variant';
import { getRepositories } from '@/data/bootstrap';
import { getVideoUrl } from '@/domain/catalog';
import type { CompulsionType } from '@/domain/compulsion';
import { getAppCatalogService } from '@/features/content/useCatalog';
import { Button, EmptyState, Screen, Text, useTheme } from '@/ui';

import { loadMilestoneDetail } from './milestoneData';

/**
 * O vídeo que esta tela pode tocar: só o de um marco desbloqueado, e só com o
 * endereço do conteúdo configurado (a produção, sem domínio próprio, não tem).
 */
function loadVideo(type: CompulsionType | null, day: number | null) {
  if (type === null || day === null || variant.contentBaseUrl === null) return null;
  const detail = loadMilestoneDetail(
    getRepositories(),
    getAppCatalogService().current().catalog,
    type,
    day,
    new Date(),
  );
  const video = detail?.milestone.video ?? null;
  if (detail === null || video === null || !detail.unlocked) return null;
  return {
    title: detail.milestone.title,
    aiGenerated: video.aiGenerated,
    // Cache do próprio player: não baixa de novo o que acabou de tocar (5.6).
    source: { uri: getVideoUrl(variant.contentBaseUrl, video), useCaching: true } as VideoSource,
  };
}

/**
 * Player do vídeo de um marco (spec 04, 5.6): tocar para começar (nunca
 * automático), controles do sistema e tela cheia opcional, selo "Conteúdo
 * gerado com IA", indicador ao carregar e mensagem neutra com "Tentar de novo"
 * em erro ou sem internet. Para ao sair da tela e quando o app vai para o
 * segundo plano.
 */
export function VideoScreen({ type, day }: { type: CompulsionType | null; day: number | null }) {
  const { t } = useTranslation(['progress', 'common']);
  const theme = useTheme();
  const [video] = useState(() => loadVideo(type, day));
  // Sem fonte até o toque: nada é baixado antes de a pessoa pedir.
  const player = useVideoPlayer(null, (created) => {
    created.loop = false;
  });
  const [started, setStarted] = useState(false);
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  const start = useCallback(async () => {
    if (video === null) return;
    setStarted(true);
    try {
      await player.replaceAsync(video.source);
      player.play();
    } catch {
      // O erro chega também pelo status; a tela mostra a mensagem e o "Tentar de novo".
    }
  }, [player, video]);

  // Sair da tela (ou outra por cima) e ir para o segundo plano param o vídeo.
  useFocusEffect(useCallback(() => () => player.pause(), [player]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') player.pause();
    });
    return () => subscription.remove();
  }, [player]);

  const back = (
    <Button label={t('common:actions.back')} variant="text" onPress={() => router.back()} />
  );

  if (video === null) {
    return (
      <Screen>
        <EmptyState
          testID="video-unavailable"
          title={t('video.unavailable.title')}
          description={t('video.unavailable.description')}
        />
        {back}
      </Screen>
    );
  }

  return (
    <Screen testID="video-screen">
      <Text variant="title" accessibilityRole="header">
        {video.title}
      </Text>
      {video.aiGenerated ? (
        <View
          testID="video-ai-badge"
          style={{
            alignSelf: 'flex-start',
            paddingVertical: theme.spacing.xs,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderColor: theme.colors.divider,
          }}
        >
          <Text variant="caption">{t('video.aiBadge')}</Text>
        </View>
      ) : null}
      {started ? (
        <View
          style={{ aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: theme.radii.md }}
        >
          <VideoView
            testID="video-view"
            player={player}
            style={{ flex: 1 }}
            nativeControls
            contentFit="contain"
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture={false}
          />
          {status === 'loading' ? (
            <View
              style={{
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator
                testID="video-loading"
                size="large"
                color="#fff"
                accessibilityLabel={t('video.loading')}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <Button testID="video-play" label={t('video.play')} onPress={() => void start()} />
      )}
      {started && status === 'error' ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text accessibilityLiveRegion="polite">{t('video.error')}</Text>
          <Button label={t('video.retry')} variant="secondary" onPress={() => void start()} />
        </View>
      ) : null}
      {back}
    </Screen>
  );
}
