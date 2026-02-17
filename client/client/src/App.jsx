import React, { useState } from 'react';
import StartScreen from './components/StartScreen.jsx';
import RecordingScreen from './components/RecordingScreen.jsx';

export default function App() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <StartScreen onStart={() => setStarted(true)} />;
  }

  return <RecordingScreen onEnd={() => setStarted(false)} />;
}

