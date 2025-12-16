/*
    Copyright 2022-2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.cheetah;

import java.io.File;
import java.util.ArrayList;

/**
 * Cheetah Class.
 */
public class Cheetah {

    private static String sdk = "java";

    public static final String LIBRARY_PATH;
    public static final String MODEL_PATH;

    static {
        LIBRARY_PATH = Utils.getPackagedLibraryPath();
        MODEL_PATH = Utils.getPackagedModelPath();
    }

    public static void setSdk(String sdk) {
        Cheetah.sdk = sdk;
    }

    private long handle;

    /**
     * Constructor.
     *
     * @param accessKey                  AccessKey obtained from Picovoice Console.
     * @param modelPath                  Absolute path to the file containing model parameters.
     * @param device                     String representation of the device (e.g., CPU or GPU) to use. If set to `best`, 
     *                                   the most suitable device is selected automatically. If set to `gpu`, the engine
     *                                   uses the first available GPU device. To select a specific GPU device, set this
     *                                   argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the target
     *                                   GPU. If set to `cpu`, the engine will run on the CPU with the default number of
     *                                   threads. To specify the number of threads, set this argument to
     *                                   `cpu:${NUM_THREADS}`, where `${NUM_THREADS}` is the desired number of threads.
     * @param libraryPath                Absolute path to the native Cheetah library.
     * @param endpointDurationSec        Duration of endpoint in seconds. A speech endpoint is detected when there is a
     *                                   chunk of audio (with a duration specified herein) after an utterance without
     *                                   any speech in it. Set duration to 0 to disable this. 
     *                                   Default is 1 second in the Builder.
     * @param enableAutomaticPunctuation Set to `true` to enable automatic punctuation insertion.
     * @throws CheetahException if there is an error while initializing Cheetah.
     */
    private Cheetah(
            String accessKey,
            String modelPath,
            String device,
            String libraryPath,
            float endpointDurationSec,
            boolean enableAutomaticPunctuation) throws CheetahException {
        try {
            ArrayList<String> libraryDependencies = Utils.getLibraryDependencyPaths(libraryPath);
            for (String dependency : libraryDependencies) {
                System.load(dependency);
            }
            System.load(libraryPath);
        } catch (Exception exception) {
            throw new CheetahException(exception);
        }
        CheetahNative.setSdk(Cheetah.sdk);

        handle = CheetahNative.init(
                accessKey,
                modelPath,
                device,
                endpointDurationSec,
                enableAutomaticPunctuation);
    }

    /**
     * Releases resources acquired by Cheetah.
     */
    public void delete() {
        if (handle != 0) {
            CheetahNative.delete(handle);
            handle = 0;
        }
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
        if (handle == 0) {
            throw new CheetahInvalidStateException("Attempted to call Cheetah process after delete.");
        }

        if (pcm == null) {
            throw new CheetahInvalidArgumentException("Passed null frame to Cheetah process.");
        }

        if (pcm.length != getFrameLength()) {
            throw new CheetahInvalidArgumentException(
                    String.format("Cheetah process requires frames of length %d. " +
                            "Received frame of size %d.", getFrameLength(), pcm.length));
        }
        return CheetahNative.process(handle, pcm);
    }

    /**
     * Processes any remaining audio data and returns its transcription.
     *
     * @return Inferred transcription.
     * @throws CheetahException if there is an error while processing the audio frame.
     */
    public CheetahTranscript flush() throws CheetahException {
        if (handle == 0) {
            throw new CheetahInvalidStateException("Attempted to call Cheetah flush after delete.");
        }
        return CheetahNative.flush(handle);
    }

    /**
     * Getter for required number of audio samples per frame.
     *
     * @return Required number of audio samples per frame.
     */
    public int getFrameLength() {
        return CheetahNative.getFrameLength();
    }

    /**
     * Getter for required audio sample rate for PCM data.
     *
     * @return Required audio sample rate for PCM data.
     */
    public int getSampleRate() {
        return CheetahNative.getSampleRate();
    }

    /**
     * Getter for Cheetah version.
     *
     * @return Cheetah version.
     */
    public String getVersion() {
        return CheetahNative.getVersion();
    }

    /**
     * Retrieves a list of available hardware devices that Cheetah can use to run inference.
     *
     * @param libraryPath Path to a native Cheetah library. Set to `null` to use default library.
     *
     * @return List of available hardware devices that Cheetah can use to run inference.
     * @throws CheetahException if the library file cannot be loaded.
     */
    public static String[] getAvailableDevices(String libraryPath) throws CheetahException {
        try {
            System.load(libraryPath);
        } catch (Exception exception) {
            throw new CheetahException(exception);
        }
        return CheetahNative.listHardwareDevices();
    }

    /**
     * Retrieves a list of available hardware devices that Cheetah can use to run inference.
     *
     * @return List of available hardware devices that Cheetah can use to run inference.
     * @throws CheetahException if the default library file cannot be loaded.
     */
    public static String[] getAvailableDevices() throws CheetahException {
        if (Utils.isResourcesAvailable()) {
            return Cheetah.getAvailableDevices(LIBRARY_PATH);
        } else {
            throw new CheetahInvalidArgumentException("Default library unavailable. " +
                    "Please provide a valid native Cheetah library path.");
        }
    }

    /**
     * Builder for creating an instance of Cheetah with a mixture of default arguments.
     */
    public static class Builder {
        private String accessKey = null;
        private String libraryPath = null;
        private String device = null;
        private String modelPath = null;
        private float endpointDuration = 1f;
        private boolean enableAutomaticPunctuation = false;

        public Builder setAccessKey(String accessKey) {
            this.accessKey = accessKey;
            return this;
        }

        public Builder setLibraryPath(String libraryPath) {
            this.libraryPath = libraryPath;
            return this;
        }

        /**
         * Setter for the absolute path to the file containing Cheetah model parameters.
         *
         * @param modelPath Absolute path to the file containing Cheetah model parameters.
         */
        public Builder setModelPath(String modelPath) {
            this.modelPath = modelPath;
            return this;
        }

        public Builder setDevice(String device) {
            this.device = device;
            return this;
        }

        /**
         * Setter for the duration of endpoint in seconds.
         *
         * @param endpointDuration Duration of endpoint in seconds. A speech endpoint is detected when there is a
         *                         chunk of audio (with a duration specified herein) after an utterance without
         *                         any speech in it.
         */
        public Builder setEndpointDuration(float endpointDuration) {
            this.endpointDuration = endpointDuration;
            return this;
        }

        /**
         * Setter for enabling automatic punctuation insertion.
         *
         * @param enableAutomaticPunctuation Set to `true` to enable automatic punctuation insertion.
         */
        public Builder setEnableAutomaticPunctuation(boolean enableAutomaticPunctuation) {
            this.enableAutomaticPunctuation = enableAutomaticPunctuation;
            return this;
        }

        /**
         * Validates properties and creates an instance of the Cheetah speech-to-text engine.
         *
         * @return An instance of Cheetah Engine
         * @throws CheetahException if there is an error while initializing Cheetah.
         */
        public Cheetah build() throws CheetahException {
            if (!Utils.isEnvironmentSupported()) {
                throw new CheetahRuntimeException("Could not initialize Cheetah. " +
                        "Execution environment not currently supported by Cheetah Java.");
            }

            if (accessKey == null) {
                throw new CheetahInvalidArgumentException("AccessKey must not be null");
            }

            if (device == null) {
                device = "best";
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

            return new Cheetah(
                    accessKey,
                    modelPath,
                    device,
                    libraryPath,
                    endpointDuration,
                    enableAutomaticPunctuation);
        }
    }
}
