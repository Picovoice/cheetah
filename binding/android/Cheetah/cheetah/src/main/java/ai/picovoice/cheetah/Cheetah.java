/*
    Copyright 2022-2023 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/


package ai.picovoice.cheetah;

import android.content.Context;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Android binding for Cheetah Speech-to-Text engine.
 */
public class Cheetah {

    private static String _sdk = "android";

    static {
        System.loadLibrary("pv_cheetah");
    }

    private long handle;

    public static void setSdk(String sdk) {
        Cheetah._sdk = sdk;
    }

    /**
     * Constructor.
     *
     * @param accessKey                  AccessKey obtained from Picovoice Console
     * @param modelPath                  Absolute path to the file containing Cheetah model parameters.
     * @param endpointDuration           Duration of endpoint in seconds. A speech endpoint is detected when there is a
     *                                   chunk of audio (with a duration specified herein) after an utterance without
     *                                   any speech in it. Set duration to 0 to disable this.
     *                                   Default is 1 second in the Builder.
     * @param enableAutomaticPunctuation Set to `true` to enable automatic punctuation insertion.
     * @throws CheetahException if there is an error while initializing Cheetah.
     */
    private Cheetah(
            String accessKey,
            String modelPath,
            float endpointDuration,
            boolean enableAutomaticPunctuation) throws CheetahException {
        CheetahNative.setSdk(Cheetah._sdk);

        handle = CheetahNative.init(
                accessKey,
                modelPath,
                endpointDuration,
                enableAutomaticPunctuation);
    }

    private static String extractResource(
            Context context,
            InputStream srcFileStream,
            String dstFilename
    ) throws IOException {
        InputStream is = new BufferedInputStream(srcFileStream, 256);
        OutputStream os = new BufferedOutputStream(context.openFileOutput(dstFilename, Context.MODE_PRIVATE), 256);
        int r;
        while ((r = is.read()) != -1) {
            os.write(r);
        }
        os.flush();

        is.close();
        os.close();
        return new File(context.getFilesDir(), dstFilename).getAbsolutePath();
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
     * Builder for creating an instance of Cheetah with a mixture of default arguments.
     */
    public static class Builder {

        private String accessKey = null;
        private String modelPath = null;
        private float endpointDuration = 1f;
        private boolean enableAutomaticPunctuation = false;

        /**
         * Setter the AccessKey.
         *
         * @param accessKey AccessKey obtained from Picovoice Console
         */
        public Builder setAccessKey(String accessKey) {
            this.accessKey = accessKey;
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

        /**
         * Setter for the duration of endpoint in seconds.
         *
         * @param endpointDuration Duration of endpoint in seconds.
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
        public Cheetah build(Context context) throws CheetahException {
            if (accessKey == null || this.accessKey.equals("")) {
                throw new CheetahInvalidArgumentException("No AccessKey was provided to Cheetah");
            }

            if (modelPath == null) {
                throw new CheetahInvalidArgumentException("ModelPath must not be null");
            } else {
                File modelFile = new File(modelPath);
                String modelFilename = modelFile.getName();
                if (!modelFile.exists() && !modelFilename.equals("")) {
                    try {
                        modelPath = extractResource(context,
                                context.getAssets().open(modelPath),
                                modelFilename);
                    } catch (IOException ex) {
                        throw new CheetahIOException(ex);
                    }
                }
            }

            if (endpointDuration < 0f) {
                throw new CheetahInvalidArgumentException("endpointDuration must be greater than or equal to 0.0");
            }

            return new Cheetah(
                    accessKey,
                    modelPath,
                    endpointDuration,
                    enableAutomaticPunctuation);
        }
    }
}
