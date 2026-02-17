import { useEffect, useRef, useState, useCallback } from 'react';

export function useAudioRecorder(onChunk) {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const onChunkRef = useRef(onChunk);
  const isRecordingRef = useRef(false);
  // Counter to detect stale async start() calls from React Strict Mode double-mount
  const mountIdRef = useRef(0);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    onChunkRef.current = onChunk;
  }, [onChunk]);

  useEffect(() => {
    // Increment mount counter so stale async start() calls can detect they're orphaned
    mountIdRef.current++;
    return () => {
      isRecordingRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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

    // Capture the current mount ID before the async gap
    const startMountId = mountIdRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // After the await, check if the component was re-mounted (Strict Mode).
    // If so, this is a stale call — clean up the orphaned stream and bail out.
    if (mountIdRef.current !== startMountId) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    streamRef.current = stream;

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
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size < 500) return;
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
