/*
    Copyright 2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.cheetah;

import java.io.File;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Set;
import java.util.stream.*;
import java.util.logging.Logger;

public class Cheetah {

    private final long libraryHandle;

    public static final String LIBRARY_PATH;
    public static final String MODEL_PATH;

    static {
        LIBRARY_PATH = Utils.getPackagedLibraryPath();
        MODEL_PATH = Utils.getPackagedModelPath();
    }

    /**
     * Constructor.
     *
     * @param accessKey     AccessKey obtained from Picovoice Console.
     * @param libraryPath   Absolute path to the native Cheetah library.
     * @param modelPath     Absolute path to the file containing model parameters.
     * @param endpointDuration Duration of endpoint in seconds. A speech endpoint is detected when there is a
     *                         chunk of audio (with a duration specified herein) after an utterance without
     *                         any speech in it. Set duration to 0 to disable this. Default is 1 second in the Builder.
     * @throws CheetahException if there is an error while initializing Cheetah.
     */
    public Cheetah(String accessKey, String libraryPath, String modelPath, float endpointDurationSec) throws CheetahException {
        try {
            System.load(libraryPath);
        } catch (Exception exception) {
            throw new CheetahException(exception);
        }
        libraryHandle = init(accessKey, modelPath, endpointDurationSec);
    }

    /**
     * Releases resources acquired by Cheetah.
     */
    public void delete() {
        delete(libraryHandle);
    }

    /**
     * Processes given audio data and returns its transcription.
     *
     * @param pcm A frame of audio samples. The number of samples per frame can be attained by
     *            calling {@link #getFrameLength()}. The incoming audio needs to have a sample rate
     *            equal to {@link #getSampleRate()} and be 16-bit linearly-encoded. Furthermore,
     *            Cheetah operates on single channel audio only.
     * @return Inferred transcription.
     * @throws CheetahException if there is an error while processing the audio frame.
     */
    public CheetahTranscript process(short[] pcm) throws CheetahException {
        return process(libraryHandle, pcm);
    }

    /**
     * Processes any remaining audio data and returns its transcription.
     *
     * @return Inferred transcription.
     * @throws CheetahException if there is an error while processing the audio frame.
     */
    public CheetahTranscript flush() throws CheetahException {
        return flush(libraryHandle);
    }

    /**
     * Getter for required number of audio samples per frame.
     *
     * @return Required number of audio samples per frame.
     */
    public native int getFrameLength();

    /**
     * Getter for required audio sample rate for PCM data.
     *
     * @return Required audio sample rate for PCM data.
     */
    public native int getSampleRate();

    /**
     * Getter for Cheetah version.
     *
     * @return Cheetah version.
     */
    public native String getVersion();

    private native long init(String accessKey, String modelPath, float endpointDurationSec);

    private native void delete(long object);

    private native CheetahTranscript process(long object, short[] pcm);

    private native CheetahTranscript flush(long object);

    public static class Builder {
        private String accessKey = null;
        private String libraryPath = null;
        private String modelPath = null;
        private float endpointDuration = 1f;

        public Builder setAccessKey(String accessKey) {
            this.accessKey = accessKey;
            return this;
        }

        public Builder setLibraryPath(String libraryPath) {
            this.libraryPath = libraryPath;
            return this;
        }

        public Builder setModelPath(String modelPath) {
            this.modelPath = modelPath;
            return this;
        }

        public Builder setEndpointDuration(float endpointDuration) {
            this.endpointDuration = endpointDuration;
            return this;
        }

        public Cheetah build() throws CheetahException {

            if (!Utils.isEnvironmentSupported()) {
                throw new CheetahRuntimeException("Could not initialize Cheetah. " +
                        "Execution environment not currently supported by Cheetah Java.");
            }

            if (accessKey == null) {
                throw new CheetahInvalidArgumentException("AccessKey must not be null");
            }

            if (libraryPath == null) {
                if (Utils.isResourcesAvailable()) {
                    libraryPath = LIBRARY_PATH;
                } else {
                    throw new CheetahInvalidArgumentException("Default library unavailable. Please " +
                            "provide a native Cheetah library path (-l <library_path>).");
                }
                if (!new File(libraryPath).exists()) {
                    throw new CheetahIOException(String.format("Couldn't find library file at " +
                            "'%s'", libraryPath));
                }
            }

            if (modelPath == null) {
                if (Utils.isResourcesAvailable()) {
                    modelPath = MODEL_PATH;
                } else {
                    throw new CheetahInvalidArgumentException("Default model unavailable. Please provide a " +
                            "valid Cheetah model path (-m <model_path>).");
                }
                if (!new File(modelPath).exists()) {
                    throw new CheetahIOException(String.format("Couldn't find model file at " +
                            "'%s'", modelPath));
                }
            }

            if (endpointDuration < 0f) {
                throw new CheetahInvalidArgumentException("endpointDuration must be greater than or equal to 0.0");
            }

            return new Cheetah(accessKey, libraryPath, modelPath, endpointDuration);
        }
    }
}