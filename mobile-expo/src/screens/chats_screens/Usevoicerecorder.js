import { useState, useRef, useEffect } from 'react';
import { Animated, Alert } from 'react-native';
import Sound from 'react-native-nitro-sound';
import { AudioModule, setAudioModeAsync } from 'expo-audio';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { API_URL } from '../config/api';
import { formatTime } from './Chatconstants';

// Encapsula TODO el estado y la lógica de grabación de notas de voz:
// estados de UI (bloqueado/pausado/grabando), animaciones (waveform, bounce
// del candado, slide de cancelar), el cronómetro sincronizado con el grabador
// real, y el flujo de subida + envío del mensaje de audio a Firestore.
//
// Se usa así dentro de ChatDetailsScreen.js:
//   const recorder = useVoiceRecorder(chatId);
export default function useVoiceRecorder(chatId) {
  const [isLocked, setIsLocked] = useState(false);
  const waveBarAnims = useRef(
    Array.from({ length: 22 }, () => new Animated.Value(0.3))
  ).current;
  const lockBounceAnim = useRef(new Animated.Value(0)).current;
  const lockSlideAnim = useRef(new Animated.Value(50)).current;
  const lockOpacityAnim = useRef(new Animated.Value(0)).current;
  const cancelSlideAnim = useRef(new Animated.Value(0)).current;
  const isCancellingRef = useRef(false);

  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const animateWaveFromDB = (db) => {
  const normalized = Math.min(1, Math.max(0, (db + 60) / 55));
    waveBarAnims.forEach((anim) => {
      const variation = 0.75 + Math.random() * 0.5;
      const target = Math.max(0.1, Math.min(1, normalized * variation));
      Animated.timing(anim, {
        toValue: target,
        duration: 80,
        useNativeDriver: true,
      }).start();
    });
  };

  // Cronómetro sincronizado con el grabador real (vía addRecordBackListener).
  // El listener deja de emitir mientras la grabación está en pausa, así que
  // recordSeconds se congela solo, sin necesidad de chequear isPaused a mano.
  useEffect(() => {
    if (!isRecording) {
      setRecordSeconds(0);
      return;
    }

    Sound.addRecordBackListener((e) => {
      setRecordSeconds(Math.floor(e.currentPosition / 1000));
      if (e.currentMetering != null) {
        animateWaveFromDB(e.currentMetering);
      }
    });

    return () => {
      Sound.removeRecordBackListener();
    };
  }, [isRecording]);

  // useEffect 2 — resetear barras al pausar/detener
  useEffect(() => {
    const isActive = isRecording && !isPaused;

    if (!isActive) {
      waveBarAnims.forEach((anim) => {
        anim.stopAnimation();
        Animated.timing(anim, { toValue: 0.1, duration: 200, useNativeDriver: true }).start();
      });
    }
  }, [isRecording, isPaused]);

  // Animación de "rebote" del indicador de bloqueo (sugiere deslizar hacia arriba)
  useEffect(() => {
    let loopAnim;
    if (isRecording && !isLocked) {
      loopAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(lockBounceAnim, { toValue: -6, duration: 550, useNativeDriver: true }),
          Animated.timing(lockBounceAnim, { toValue: 0, duration: 550, useNativeDriver: true }),
        ])
      );
      loopAnim.start();
    } else {
      lockBounceAnim.setValue(0);
    }
    return () => loopAnim && loopAnim.stop();
  }, [isRecording, isLocked]);

  useEffect(() => {
    if (isLocked) {
      Animated.parallel([
        Animated.spring(lockSlideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
        Animated.timing(lockOpacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      lockSlideAnim.setValue(50);
      lockOpacityAnim.setValue(0);
    }
  }, [isLocked]);

  // --- Permisos y modo de audio (esto sigue siendo de expo-audio) ---
  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permiso Denegado', 'Se necesita permiso de micrófono para enviar notas de voz.');
      }
      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  const startRecording = async () => {
    try {
      setIsPaused(false);
      setIsLocked(false);
      const uri = await Sound.startRecorder(
        undefined,  // path por defecto
        undefined,  // audioSet por defecto
        true        //  meteringEnabled
      );
      if (!uri) throw new Error('No se obtuvo URI');
      setIsRecording(true);
    } catch (err) {
      console.log('Error iniciando grabación:', err);
      setIsRecording(false);
    }
  };

  const stopAndSendRecording = async (discard = false) => {
    try {
      const duration = recordSeconds;
      const uri = await Sound.stopRecorder();
      Sound.removeRecordBackListener();
      console.log('URI del audio grabado:', uri);
      console.log('Duración total:', duration, 'segundos');

      setIsRecording(false);
      setIsPaused(false);
      setIsLocked(false);

      if (discard || !uri || duration < 1) {
        console.log("Grabación descartada o muy corta");
        return;
      }

      // Subir archivo de audio a Cloudinary a través del Backend
      const user = auth.currentUser;
      const token = await user.getIdToken();

      // nitro-sound devuelve .m4a en iOS y .mp4 en Android — usamos la
      // extensión real del archivo en vez de asumir siempre m4a
      const extension = uri.split('.').pop() || 'm4a';

      const uploadRes = await new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('imagen', {
          uri,
          type: `audio/${extension}`,
          name: `voice_${Date.now()}.${extension}`,
        });

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/api/media/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.onload = () => resolve({ ok: xhr.status === 200, json: () => JSON.parse(xhr.responseText) });
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        Alert.alert('Error', 'No se pudo subir la nota de voz a Cloudinary.');
        return;
      }

      const durationText = formatTime(duration);
      const messagesRef = collection(db, `chats/${chatId}/messages`);
      await addDoc(messagesRef, {
        text: 'Nota de voz',
        type: 'audio',
        mediaUrl: uploadData.url,
        audioDuration: durationText,
        sender: user.uid,
        createdAt: serverTimestamp(),
        read: false,
        isFavorite: false
      });

      const chatRef = doc(db, `chats/${chatId}`);
      await updateDoc(chatRef, {
        lastMessage: `🎙️ Nota de voz (${durationText})`,
        lastMessageTime: serverTimestamp(),
        lastSender: user.uid
      });

    } catch (err) {
      console.log('Error deteniendo grabación:', err);
      setIsRecording(false);
    } finally {
      setRecordSeconds(0);
    }
  };

  const togglePauseRecording = async () => {
    try {
      if (isPaused) {
        await Sound.resumeRecorder();
        setIsPaused(false);
      } else {
        await Sound.pauseRecorder();
        setIsPaused(true);
      }
    } catch (err) {
      console.log('Error pausando/reanudando grabación:', err);
    }
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.nativeEvent.pageY;
    touchStartX.current = e.nativeEvent.pageX;
    isCancellingRef.current = false; // 👈
    startRecording();
  };

  const handleTouchMove = (e) => {
    if (isLocked || isCancellingRef.current) return; // 👈 agregá isCancellingRef.current

    const currentY = e.nativeEvent.pageY;
    const currentX = e.nativeEvent.pageX;
    const deltaY = touchStartY.current - currentY;
    const deltaX = touchStartX.current - currentX;

    if (deltaY > 60) {
      setIsLocked(true);
      cancelSlideAnim.setValue(0);
      return;
    }

    if (deltaX > 0) {
      cancelSlideAnim.setValue(-deltaX);
    }

    if (deltaX > 80) {
      isCancellingRef.current = true; // 👈 marcar antes de animar
      Animated.timing(cancelSlideAnim, {
        toValue: -300,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        cancelSlideAnim.setValue(0);
        stopAndSendRecording(true);
      });
    }
  };

  const handleTouchEnd = () => {
    if (isCancellingRef.current) return;
    if (!isLocked) {
      const deltaX = touchStartX.current - (cancelSlideAnim._value ? -cancelSlideAnim._value : 0);
      // Volver a posición original con spring
      Animated.spring(cancelSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
      stopAndSendRecording(false);
    }
  };


  return {
    // Estado para renderizar la UI de grabación
    isLocked,
    isRecording,
    isPaused,
    recordSeconds,
    waveBarAnims,
    lockBounceAnim,
    lockSlideAnim,
    lockOpacityAnim,
    cancelSlideAnim,
    // Acciones
    togglePauseRecording,
    stopAndSendRecording,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}