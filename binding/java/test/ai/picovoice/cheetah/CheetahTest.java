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

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;

import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.stream.Stream;


import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

public class CheetahTest {
    private final String accessKey = System.getProperty("pvTestingAccessKey");
    private final String device = System.getProperty("pvTestingDevice");

    private static int levenshteinDistance(String[] transcript, String[] reference) {
        int m = transcript.length;
        int n = reference.length;
        int[][] dp = new int[m + 1][n + 1];

        for (int i = 0; i <= m; i++) {
            dp[i][0] = i;
        }

        for (int j = 0; j <= n; j++) {
            dp[0][j] = j;
        }

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (transcript[i - 1].equalsIgnoreCase(reference[j - 1])) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], Math.min(dp[i - 1][j], dp[i][j - 1]));
                }
            }
        }
        return dp[m][n];
    }

    private static float getErrorRate(String transcript, String reference) {
        String[] transcriptWords = transcript.split("\\s+");
        String[] referenceWords = reference.split("\\s+");
        int distance = levenshteinDistance(transcriptWords, referenceWords);

        return (float) distance / (float) referenceWords.length;
    }

    private static ProcessTestData[] loadProcessTestData() throws IOException {
        final Path testDataPath = Paths.get(System.getProperty("user.dir"))
                .resolve("../../resources/.test")
                .resolve("test_data.json");
        final String testDataContent = new String(Files.readAllBytes(testDataPath), StandardCharsets.UTF_8);
        final JsonObject testDataJson = JsonParser.parseString(testDataContent).getAsJsonObject();

        final JsonArray testParameters = testDataJson
                .getAsJsonObject("tests")
                .getAsJsonArray("language_tests");

        final ProcessTestData[] processTestData = new ProcessTestData[testParameters.size()];
        for (int i = 0; i < testParameters.size(); i++) {
            final JsonObject testData = testParameters.get(i).getAsJsonObject();
            final String language = testData.get("language").getAsString();
            final String testAudioFile = testData.get("audio_file").getAsString();
            final String transcript = testData.get("transcript").getAsString();
            final float errorRate = testData.get("error_rate").getAsFloat();

            final JsonArray punctuationsJson = testData.getAsJsonArray("punctuations");
            final String[] punctuations = new String[punctuationsJson.size()];
            for (int j = 0; j < punctuationsJson.size(); j++) {
                punctuations[j] = punctuationsJson.get(j).getAsString();
            }

            final JsonArray modelsJson = testData.getAsJsonArray("models");
            final String[] models = new String[modelsJson.size()];
            for (int j = 0; j < modelsJson.size(); j++) {
                models[j] = modelsJson.get(j).getAsString();
            }

            processTestData[i] = new ProcessTestData(
                    language,
                    models,
                    testAudioFile,
                    transcript,
                    punctuations,
                    errorRate);
        }
        return processTestData;
    }

    private static Stream<Arguments> processTestProvider() throws IOException {
        final ProcessTestData[] processTestData = loadProcessTestData();
        final ArrayList<Arguments> testArgs = new ArrayList<>();
        for (ProcessTestData processTestDataItem : processTestData) {
            for (String modelPath : processTestDataItem.models) {
                testArgs.add(Arguments.of(
                        processTestDataItem.language,
                        modelPath,
                        processTestDataItem.audioFile,
                        processTestDataItem.transcript,
                        processTestDataItem.punctuations,
                        false,
                        processTestDataItem.errorRate));
                testArgs.add(Arguments.of(
                        processTestDataItem.language,
                        modelPath,
                        processTestDataItem.audioFile,
                        processTestDataItem.transcript,
                        processTestDataItem.punctuations,
                        true,
                        processTestDataItem.errorRate));
            }
        }

        return testArgs.stream();
    }

    @Test
    void getVersion() throws CheetahException {
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setDevice(device)
                .build();
        assertTrue(cheetah.getVersion() != null && !cheetah.getVersion().equals(""));
        cheetah.delete();
    }

    @Test
    void getFrameLength() throws CheetahException {
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setDevice(device)
                .build();
        assertTrue(cheetah.getFrameLength() > 0);
        cheetah.delete();
    }

    @Test
    void getSampleRate() throws CheetahException {
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setDevice(device)
                .build();
        assertTrue(cheetah.getSampleRate() > 0);
        cheetah.delete();
    }

    @Test
    void getErrorStack() {
        String[] error = {};
        try {
            new Cheetah.Builder()
                    .setAccessKey("invalid")
                    .setDevice(device)
                    .build();
        } catch (CheetahException e) {
            error = e.getMessageStack();
        }

        assertTrue(0 < error.length);
        assertTrue(error.length <= 8);

        try {
            new Cheetah.Builder()
                    .setAccessKey("invalid")
                    .setDevice(device)
                    .build();
        } catch (CheetahException e) {
            for (int i = 0; i < error.length; i++) {
                assertEquals(e.getMessageStack()[i], error[i]);
            }
        }
    }

    @ParameterizedTest(name = "test process data for ''{1}'' with punctuation ''{5}''")
    @MethodSource("processTestProvider")
    void process(
            String language,
            String modelFile,
            String testAudioFile,
            String referenceTranscript,
            String[] punctuations,
            boolean enableAutomaticPunctuation,
            float targetErrorRate) throws Exception {
        String modelPath = Paths.get(System.getProperty("user.dir"))
                .resolve(String.format("../../lib/common/%s", modelFile))
                .toString();

        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setModelPath(modelPath)
                .setDevice(device)
                .setEnableAutomaticPunctuation(enableAutomaticPunctuation)
                .build();

        int frameLen = cheetah.getFrameLength();
        String audioFilePath = Paths.get(System.getProperty("user.dir"))
                .resolve(String.format("../../resources/audio_samples/%s", testAudioFile))
                .toString();
        File testAudioPath = new File(audioFilePath);

        AudioInputStream audioInputStream = AudioSystem.getAudioInputStream(testAudioPath);
        assertEquals(16000, audioInputStream.getFormat().getFrameRate());

        int byteDepth = audioInputStream.getFormat().getFrameSize();
        byte[] pcm = new byte[frameLen * byteDepth];
        short[] cheetahFrame = new short[frameLen];

        StringBuilder transcript = new StringBuilder();
        int numBytesRead = 0;
        while ((numBytesRead = audioInputStream.read(pcm)) != -1) {
            if (numBytesRead / byteDepth == frameLen) {
                ByteBuffer.wrap(pcm).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(cheetahFrame);
                CheetahTranscript transcriptObj = cheetah.process(cheetahFrame);
                transcript.append(transcriptObj.getTranscript());
            }
        }
        CheetahTranscript finalTranscriptObj = cheetah.flush();
        transcript.append(finalTranscriptObj.getTranscript());

        cheetah.delete();

        String normalizedTranscript = referenceTranscript;
        if (!enableAutomaticPunctuation) {
            for (String punctuation : punctuations) {
                normalizedTranscript = normalizedTranscript.replace(punctuation, "");
            }
        }

        assertTrue(getErrorRate(transcript.toString(), normalizedTranscript) < targetErrorRate);
    }

    private static class ProcessTestData {
        public final String language;
        public final String[] models;
        public final String audioFile;
        public final String transcript;
        public final String[] punctuations;
        public final float errorRate;

        public ProcessTestData(
                String language,
                String[] models,
                String audioFile,
                String transcript,
                String[] punctuations,
                float errorRate) {
            this.language = language;
            this.models = models;
            this.audioFile = audioFile;
            this.transcript = transcript;
            this.punctuations = punctuations;
            this.errorRate = errorRate;
        }
    }
}
