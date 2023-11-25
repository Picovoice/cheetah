/*
  Copyright 2023 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { useCallback, useEffect, useRef, useState } from 'react';

import { WebVoiceProcessor } from '@picovoice/web-voice-processor';

import {
  CheetahModel,
  CheetahOptions,
  CheetahTranscript,
  CheetahWorker,
} from '@picovoice/cheetah-web';

export const useCheetah = (): {
  result: {
    transcript: string;
    isComplete?: boolean;
  } | null;
  isLoaded: boolean;
  isListening: boolean;
  error: Error | null;
  init: (
    accessKey: string,
    model: CheetahModel,
    options?: CheetahOptions
  ) => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  release: () => Promise<void>;
} => {
  const cheetahRef = useRef<CheetahWorker | null>(null);

  const [result, setResult] = useState<{
    transcript: string;
    isComplete: boolean | undefined;
  } | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const errorCallback = useCallback((cheetahError: Error) => {
    setError(cheetahError);
  }, []);

  const transcriptCallback = useCallback(
    (cheetahTranscript: CheetahTranscript): void => {
      if (cheetahTranscript.isEndpoint) {
        cheetahRef.current?.flush();
      }

      setResult({
        transcript: cheetahTranscript.transcript,
        isComplete: cheetahTranscript.isFlushed,
      });
    },
    []
  );

  const init = useCallback(
    async (
      accessKey: string,
      model: CheetahModel,
      options: CheetahOptions = {}
    ): Promise<void> => {
      if (options.processErrorCallback) {
        // eslint-disable-next-line no-console
        console.warn(
          "'processErrorCallback' is only supported in the Cheetah Web SDK. Use the 'error' state to monitor for errors in the React SDK."
        );
      }

      try {
        if (!cheetahRef.current) {
          cheetahRef.current = await CheetahWorker.create(
            accessKey,
            transcriptCallback,
            model,
            { ...options, processErrorCallback: errorCallback }
          );
          setError(null);
          setIsLoaded(true);
        }
      } catch (e: any) {
        setError(e);
      }
    },
    [errorCallback]
  );

  const start = useCallback(async (): Promise<void> => {
    try {
      if (!cheetahRef.current) {
        setError(
          new Error('Cheetah has not been initialized or has been released')
        );
        return;
      }

      if (isListening) {
        return;
      }

      await WebVoiceProcessor.subscribe(cheetahRef.current);
      setError(null);
      setIsListening(true);
    } catch (e: any) {
      setError(e);
      setIsListening(false);
    }
  }, [isListening]);

  const stop = useCallback(async (): Promise<void> => {
    try {
      if (!cheetahRef.current) {
        setError(
          new Error('Cheetah has not been initialized or has been released')
        );
        return;
      }

      if (!isListening) {
        return;
      }

      await WebVoiceProcessor.unsubscribe(cheetahRef.current);
      cheetahRef.current?.flush();
      setError(null);
      setIsListening(false);
    } catch (e: any) {
      setError(e);
      setIsListening(false);
    }
  }, [isListening]);

  const release = useCallback(async (): Promise<void> => {
    if (cheetahRef.current) {
      await WebVoiceProcessor.unsubscribe(cheetahRef.current);
      cheetahRef.current?.terminate();
      cheetahRef.current = null;
      setError(null);
      setIsLoaded(false);
      setIsListening(false);
    }
  }, []);

  useEffect(
    () => (): void => {
      if (cheetahRef.current) {
        WebVoiceProcessor.unsubscribe(cheetahRef.current);
        cheetahRef.current.terminate();
        cheetahRef.current = null;
      }
    },
    []
  );

  return {
    result,
    isLoaded,
    isListening,
    error,
    init,
    start,
    stop,
    release,
  };
};
