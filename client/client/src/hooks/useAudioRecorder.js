import { useEffect, useRef, useState, useCallback } from 'react';

// RMS threshold below which we consider the audio "silent" and skip sending.
// Values are 0-1 where typical speech is 0.02-0.15 and silence/background is < 0.008.
const SILENCE_THRESHOLD = 0.01;
// What fraction of volume samples in the chunk must exceed the threshold to count as speech.
const SPEECH_RATIO = 0.05;

export function useAudioRecorder(onChunk) {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const onChunkRef = useRef(onChunk);
  const isRecordingRef = useRef(false);
  const mountIdRef = useRef(0);
  const analyserRef = useRef(null);
  const volumeSamplesRef = useRef([]);
  const volumeTimerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    onChunkRef.current = onChunk;
  }, [onChunk]);

  useEffect(() => {
    mountIdRef.current++;
    return () => {
      isRecordingRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (volumeTimerRef.current) {
        clearInterval(volumeTimerRef.current);
        volumeTimerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const start = useCallback(async () => {
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;

    const startMountId = mountIdRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    if (mountIdRef.current !== startMountId) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    streamRef.current = stream;

    // Set up Web Audio API analyser for volume monitoring
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyserRef.current = analyser;

    // Sample volume ~20 times per second during each 5-second recording window
    volumeSamplesRef.current = [];
    volumeTimerRef.current = setInterval(() => {
      if (!analyserRef.current) return;
      const data = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
      }
      const rms = Math.sqrt(sum / data.length);
      volumeSamplesRef.current.push(rms);
    }, 50);

    function hasSpeech() {
      const samples = volumeSamplesRef.current;
      if (samples.length === 0) return false;
      const aboveThreshold = samples.filter((v) => v > SILENCE_THRESHOLD).length;
      return aboveThreshold / samples.length >= SPEECH_RATIO;
    }

    function createAndStartRecorder() {
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const speechDetected = hasSpeech();
        // Reset samples for next window
        volumeSamplesRef.current = [];

        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size < 500) return;

        if (!speechDetected) {
          // Silent chunk — don't send to Whisper
          return;
        }

        onChunkRef.current(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
    }

    createAndStartRecorder();

    intervalRef.current = setInterval(() => {
      if (!streamRef.current || !streamRef.current.active) return;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      createAndStartRecorder();
    }, 5000);

    setIsRecording(true);
  }, []);

  const stop = useCallback(() => {
    isRecordingRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (volumeTimerRef.current) {
      clearInterval(volumeTimerRef.current);
      volumeTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  return { isRecording, start, stop };
}
