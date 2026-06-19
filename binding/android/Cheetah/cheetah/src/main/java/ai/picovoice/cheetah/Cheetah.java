/*
    Copyright 2022-2026 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/


package ai.picovoice.cheetah;

import android.content.Context;

import org.json.JSONException;
import org.json.JSONObject;
import org.yaml.snakeyaml.Yaml;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import okhttp3.*;

/**
 * Android binding for Cheetah Speech-to-Text engine.
 */
public class Cheetah {
    private static final Set<String> VALID_LANGUAGES =
            new HashSet<>(Arrays.asList("de", "en", "es", "fr", "it", "pt"));

    private static final String PV_API_URL = "https://rest.picovoice.ai/";

    private static final OkHttpClient client = new OkHttpClient();

    private static String _sdk = "android";

    static {
        System.loadLibrary("pv_cheetah");
    }

    private long handle;

    public static void setSdk(String sdk) {
        Cheetah._sdk = sdk;
    }

    /**
     * Trains a model using the specified `new_words` and `boost_words` arguments.
     *
     * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
     * @param outputPath Absolute path to file where the trained model will be saved.
     * @param language Two character language code for the model (e.g. "en", "fr").
     *                 See https://picovoice.ai/docs/model-api/cheetah/ for supported languages.
     * @param newWords A dictionary of words to pronunciations to add to the new model.
     *                 Keys should be the word string. Values are a Sequence of pronunciations
     *                 for the given word, each pronunciation is a string of space separated
     *                 IPA phonemes. An empty Sequence will result in the training
     *                 generating a default pronunciation.
     * @param boostWords A list of words to "boost". When the engine has a situation with competing
     *                   homophones the engine will be more likely to select the boosted words.
     * @throws CheetahException if model training fails.
     */
    public static void trainModelFromWords(
            String accessKey,
            String outputPath,
            String language,
            Map<String, String[]> newWords,
            String[] boostWords) throws CheetahException {

        Map<String, Object> content = new LinkedHashMap();
        content.put("new", newWords);
        content.put("boost", boostWords);

        String yamlContent = new Yaml().dump(content);

        trainModelFromYaml(accessKey, outputPath, language, yamlContent);
    }

    /**
     * Trains a model using a YAML configuration string.
     *
     * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
     * @param outputPath Absolute path to file where the trained model will be saved.
     * @param language Two character language code for the model (e.g. "en", "fr").
     *                 See https://picovoice.ai/docs/model-api/cheetah/ for supported languages.
     * @param yamlContent YAML configuration in string to be used for training.
     * @throws CheetahException if model training fails.
     */
    public static void trainModelFromYaml(
            String accessKey,
            String outputPath,
            String language,
            String yamlContent) throws CheetahException {

        if (!VALID_LANGUAGES.contains(language)) {
            throw new CheetahInvalidArgumentException(
                    "Invalid language ('" + language + "')"
            );
        }

        String payload;

        try {
            payload = new JSONObject()
                    .put("engine", "cheetah")
                    .put("model_type", "default")
                    .put("yaml_content", yamlContent)
                    .toString();
        } catch (JSONException e) {
            throw new CheetahRuntimeException(
                    "Failed to create request payload " + e.getMessage()
            );
        }

        Request request = new Request.Builder()
                .url(PV_API_URL + language + "/api/cat")
                .post(RequestBody.create(
                        payload,
                        MediaType.parse("application/json")
                ))
                .addHeader("x-api-key", accessKey)
                .build();

        try (Response res = client.newCall(request).execute()) {
            if (!res.isSuccessful()) {
                String errorBody = res.body() != null ? res.body().string() : "";
                throw new CheetahRuntimeException("Failed to train model: " + errorBody);
            }

            if (res.body() == null) {
                throw new CheetahRuntimeException("Empty response body");
            }

            byte[] data = res.body().bytes();

            if (data.length == 0) {
                throw new CheetahRuntimeException("Empty response body");
            }

            File file = new File(outputPath);
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(data);
            } catch (IOException e) {
                throw new CheetahRuntimeException(
                        "Failed to save Cheetah model file: " + e.getMessage()
                );
            }
        } catch (IOException e) {
            throw new CheetahRuntimeException(
                    "Request failed: " + e.getMessage()
            );
        }
    }

    /**
     * Constructor.
     *
     * @param accessKey                  AccessKey obtained from Picovoice Console
     * @param modelPath                  Absolute path to the file containing Cheetah model parameters.
     * @param device                     String representation of the device (e.g., CPU or GPU) to use. If set to
     *                                   `best`, the most suitable device is selected automatically. If set to `gpu`,
     *                                   the engine uses the first available GPU device. To select a specific GPU
     *                                   device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the
     *                                   index of the target GPU. If set to `cpu`, the engine will run on the CPU with
     *                                   the default number of threads. To specify the number of threads, set this
     *                                   argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}` is the desired
     *                                   number of threads.
     * @param endpointDuration           Duration of endpoint in seconds. A speech endpoint is detected when there is a
     *                                   chunk of audio (with a duration specified herein) after an utterance without
     *                                   any speech in it. Set duration to 0 to disable this.
     *                                   Default is 1 second in the Builder.
     * @param enableAutomaticPunctuation Set to `true` to enable automatic punctuation insertion.
     * @param enableTextNormalization    Set to `true` to enable text normalization. Enabling this feature improves the
     *                                   readability and formatting of Cheetah's transcriptions (e.g. converts number
     *                                   words to digits) at the cost of some additional latency.
     * @throws CheetahException if there is an error while initializing Cheetah.
     */
    private Cheetah(
            String accessKey,
            String modelPath,
            String device,
            float endpointDuration,
            boolean enableAutomaticPunctuation,
            boolean enableTextNormalization) throws CheetahException {
        CheetahNative.setSdk(Cheetah._sdk);

        handle = CheetahNative.init(
                accessKey,
                modelPath,
                device,
                endpointDuration,
                enableAutomaticPunctuation,
                enableTextNormalization);
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
     * Processes given audio data and returns its transcription.
     *
     * @param pcm A frame of audio samples. The number of samples per frame can be attained by
     *            calling {@link #getFrameLength()}. The incoming audio needs to have a sample rate
     *            equal to {@link #getSampleRate()} and be 16-bit linearly-encoded. Furthermore,
     *            Cheetah operates on single channel audio only.
     * @return Inferred transcription.
     * @throws CheetahException if there is an error while processing the audio frame.
     */
    public CheetahTranscriptAnnotated processAnnotated(short[] pcm) throws CheetahException {
        if (handle == 0) {
            throw new CheetahInvalidStateException("Attempted to call Cheetah processAnnotated after delete.");
        }

        if (pcm == null) {
            throw new CheetahInvalidArgumentException("Passed null frame to Cheetah processAnnotated.");
        }

        if (pcm.length != getFrameLength()) {
            throw new CheetahInvalidArgumentException(
                    String.format("Cheetah processAnnotated requires frames of length %d. " +
                            "Received frame of size %d.", getFrameLength(), pcm.length));
        }

        CheetahTranscript transcript = CheetahNative.process(handle, pcm);
        return new CheetahTranscriptAnnotated(
            transcript.getTranscript(),
            transcript.getWordArray(),
            transcript.getIsEndpoint());
    }

    /**
     * Processes any remaining audio data and returns its transcription.
     *
     * @return Inferred transcription.
     * @throws CheetahException if there is an error while processing the audio frame.
     */
    public CheetahTranscriptAnnotated flushAnnotated() throws CheetahException {
        if (handle == 0) {
            throw new CheetahInvalidStateException("Attempted to call Cheetah flushAnnotated after delete.");
        }

        CheetahTranscript transcript =  CheetahNative.flush(handle);
        return new CheetahTranscriptAnnotated(
            transcript.getTranscript(),
            transcript.getWordArray(),
            transcript.getIsEndpoint());
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
     * Lists all available devices that Cheetah can use for inference.
     * Each entry in the list can be used as the `device` argument when initializing Cheetah.
     *
     * @return Array of all available devices that Cheetah can be used for inference.
     * @throws CheetahException if getting available devices fails.
     */
    public static String[] getAvailableDevices() throws CheetahException {
        return CheetahNative.listHardwareDevices();
    }

    /**
     * Builder for creating an instance of Cheetah with a mixture of default arguments.
     */
    public static class Builder {

        private String accessKey = null;
        private String modelPath = null;
        private String device = "best";
        private float endpointDuration = 1f;
        private boolean enableAutomaticPunctuation = false;
        private boolean enableTextNormalization = false;

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
         * Setter for the device to use for inference.
         *
         * @param device String representation of the device (e.g., CPU or GPU) to use for inference.
         *               If set to `best`, the most suitable device is selected automatically. If set to `gpu`,
         *               the engine uses the first available GPU device. To select a specific GPU device, set this
         *               argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the target GPU. If
         *               set to `cpu`, the engine will run on the CPU with the default number of threads. To specify
         *               the number of threads, set this argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}`
         *               is the desired number of threads.
         */
        public Builder setDevice(String device) {
            this.device = device;
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
         * Setter for enabling text normalization.
         *
         * @param enableTextNormalization Set to `true` to enable text normalization. Enabling this feature improves the
         *                                readability and formatting of Cheetah's transcriptions (e.g. converts number
         *                                words to digits) at the cost of some additional latency.
         */
        public Builder setEnableTextNormalization(boolean enableTextNormalization) {
            this.enableTextNormalization = enableTextNormalization;
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
                    device,
                    endpointDuration,
                    enableAutomaticPunctuation,
                    enableTextNormalization);
        }
    }
}
