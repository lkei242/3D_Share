import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import styles from './chatStyles';

// Reproductor de notas de voz con forma de onda falsa (determinística por URL)
// y barra de progreso arrastrable. Se usa dentro de MessageItem.
const AudioPlayer = React.memo(({ url, duration, isMe, colors }) => {
  const player = useAudioPlayer({ uri: url });
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [waveformWidth, setWaveformWidth] = useState(150);
  const progressRef = useRef(0);
  const isSeekingRef = useRef(false);
  const waveformOffsetRef = useRef(0);
  const waveformRef = useRef(null);
  const isDraggedRef = useRef(false);
  const barsRef = useRef(null);

  if (!barsRef.current) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = ((hash << 5) - hash) + url.charCodeAt(i);
      hash |= 0;
    }
    barsRef.current = new Array(35).fill(0).map((_, i) => {
      const val = Math.abs(Math.sin(hash * (i + 1)) * 100);
      return Math.floor(val % 24) + 6;
    });
  }
  const bars = barsRef.current;

  const totalSecs = (() => {
    if (!duration) return 30;
    const parts = duration.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]) || 30;
  })();

  useEffect(() => {
    return () => player.release();
  }, [player]);

  useEffect(() => {
    let interval;
    if (isPlaying && !isSeekingRef.current) {
      interval = setInterval(() => {
        let actual = null;
        try {
          if (player.status && typeof player.status.currentTime === 'number') {
            actual = player.status.currentTime;
          }
        } catch (e) {}

        if (actual !== null && totalSecs > 0) {
          const newProgress = Math.min(actual / totalSecs, 1);
          progressRef.current = newProgress;
          if (newProgress >= 1) {
            setProgress(1);
            setHasEnded(true);
            setIsPlaying(false);
          } else {
            setProgress(newProgress);
          }
        } else {
          progressRef.current += 1 / (totalSecs * 4);
          if (progressRef.current >= 1) {
            progressRef.current = 1;
            setProgress(1);
            setHasEnded(true);
            setIsPlaying(false);
          } else {
            setProgress(progressRef.current);
          }
        }
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalSecs]);

  const handlePlayPause = async () => {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
      setLoadingAudio(true);
      const seekPos = isDraggedRef.current ? progressRef.current * totalSecs : null;
      isDraggedRef.current = false;

      if (hasEnded) {
        setHasEnded(false);
        if (seekPos !== null && seekPos > 0) {
          await player.play();
          await player.seekTo(seekPos);
        } else {
          progressRef.current = 0;
          setProgress(0);
          await player.play();
          await player.seekTo(0);
        }
      } else if (seekPos !== null && seekPos > 0) {
        await player.play();
        await player.seekTo(seekPos);
      } else {
        await player.play();
      }

      setIsPlaying(true);
      setLoadingAudio(false);
      }
    };

  const updateSeek = (ratio) => {
      const clamped = Math.min(Math.max(ratio, 0), 1);
      progressRef.current = clamped;
      setProgress(clamped);
      setHasEnded(false);
    };

  const handleTouchStart = (e) => {
      isSeekingRef.current = true;
      isDraggedRef.current = true;
      const x = e.nativeEvent.pageX - waveformOffsetRef.current;
      updateSeek(x / waveformWidth);
      if (isPlaying) {
        player.seekTo(progressRef.current * totalSecs);
      }
    };

  const handleTouchMove = (e) => {
      const x = e.nativeEvent.pageX - waveformOffsetRef.current;
      updateSeek(x / waveformWidth);
      if (isPlaying) {
        player.seekTo(progressRef.current * totalSecs);
      }
    };

  const handleTouchEnd = () => {
      isSeekingRef.current = false;
      if (isPlaying) {
        player.seekTo(progressRef.current * totalSecs);
      }
    };

  const played = isMe ? '#34C759' : '#007AFF';
  const inactive = isMe ? 'rgba(255,255,255,0.3)' : '#C8C8C8';
  const playBg = isMe ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)';
  const numPlayed = Math.floor(progress * bars.length);
  const dotSize = 8;

  return (
    <View style={[styles.waContainer, { backgroundColor: playBg }]}>
      <TouchableOpacity onPress={handlePlayPause} style={[styles.waPlayBtn, { backgroundColor: played }]}>
        {loadingAudio ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={16}
            color="#FFF"
            style={isPlaying ? {} : { marginLeft: 2 }}
          />
        )}
      </TouchableOpacity>

      <View
        ref={waveformRef}
        style={styles.waWaveform}
        onLayout={(e) => {
          setWaveformWidth(e.nativeEvent.layout.width);
          waveformRef.current?.measureInWindow((x) => {
            waveformOffsetRef.current = x;
          });
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
        onResponderRelease={handleTouchEnd}
      >
        {bars.map((h, i) => (
          <View
            key={i}
            style={[styles.waBar, { height: h, backgroundColor: i < numPlayed ? played : inactive }]}
          />
        ))}

        <View
          style={[styles.waDot, {
            left: numPlayed * (3 + 2) + 1.5 - dotSize / 2,
            backgroundColor: played,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
          }]}
        />
      </View>

      <Text style={[styles.waDuration, { color: isMe ? 'rgba(255,255,255,0.8)' : '#777' }]}>
        {duration || '0:00'}
      </Text>
    </View>
  );

}, (prev, next) => prev.url === next.url && prev.isMe === next.isMe && prev.duration === next.duration);


export default AudioPlayer;