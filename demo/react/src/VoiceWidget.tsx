import React, { useCallback, useEffect, useState, useRef } from "react";
import { useCheetah } from "@picovoice/cheetah-react";

import cheetahModel from "./lib/cheetahModel";

export default function VoiceWidget() {
  const accessKeyRef = useRef<string>("");

  const { result, isLoaded, isListening, error, init, start, stop, release } =
    useCheetah();

  const [transcript, setTranscript] = useState<string>("");

  useEffect(() => {
    if (result !== null) {
      setTranscript((prev) => {
        let newTranscript = prev + result.partialTranscript;

        if (result.isComplete) {
          newTranscript += " ";
        }

        return newTranscript;
      });
    }
  }, [result]);

  const initEngine = useCallback(async () => {
    if (accessKeyRef.current.length === 0) {
      return;
    }

    await init(accessKeyRef.current, cheetahModel, {
      enableAutomaticPunctuation: true,
    });
  }, [init]);

  const toggleRecord = async () => {
    if (isListening) {
      await stop();
    } else {
      await start();
    }
  };

  return (
    <div className="voice-widget">
      <h2>VoiceWidget</h2>
      <h3>
        <label>
          AccessKey obtained from{" "}
          <a href="https://console.picovoice.ai/">Picovoice Console</a>:{" "}
          <input
            type="text"
            name="accessKey"
            onChange={(e) => {
              accessKeyRef.current = e.target.value;
            }}
          />
          <button
            className="init-button"
            onClick={initEngine}
            disabled={isLoaded}
          >
            Init Cheetah
          </button>
          <button
            className="release-button"
            onClick={release}
            disabled={error !== null || !isLoaded}
          >
            Release
          </button>
        </label>
      </h3>
      <h3>Loaded: {JSON.stringify(isLoaded)}</h3>
      <h3>Listening: {JSON.stringify(isListening)}</h3>
      <h3>Error: {JSON.stringify(error !== null)}</h3>
      {error && <p className="error-message">{error.toString()}</p>}
      <br />
      <label htmlFor="record-audio">Record audio to transcribe: </label>
      <br />
      <br />
      <button id="record-audio" onClick={toggleRecord}>
        {isListening ? "Stop Recording" : "Start Recording"}
      </button>
      <h3>Transcript:</h3>
      <p>{transcript}</p>
    </div>
  );
}
