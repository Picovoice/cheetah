/*
    Copyright 2024-2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.cheetah.testapp;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import androidx.test.ext.junit.runners.AndroidJUnit4;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import ai.picovoice.cheetah.Cheetah;
import ai.picovoice.cheetah.CheetahException;


@RunWith(Parameterized.class)
public class LanguageTests extends BaseTest {
    @Parameterized.Parameter(value = 0)
    public String language;

    @Parameterized.Parameter(value = 1)
    public String modelFile;

    @Parameterized.Parameter(value = 2)
    public String testAudioFile;

    @Parameterized.Parameter(value = 3)
    public String expectedTranscript;

    @Parameterized.Parameter(value = 4)
    public String[] punctuations;

    @Parameterized.Parameter(value = 5)
    public float errorRate;

    @Parameterized.Parameters(name = "{0}")
    public static Collection<Object[]> initParameters() throws IOException {
        String testDataJsonString = getTestDataString();

        JsonParser parser = new JsonParser();
        JsonObject testDataJson = parser.parse(testDataJsonString).getAsJsonObject();
        JsonArray languageTests = testDataJson
                .getAsJsonObject("tests")
                .getAsJsonArray("language_tests");

        List<Object[]> parameters = new ArrayList<>();
        for (int i = 0; i < languageTests.size(); i++) {
            JsonObject testData = languageTests.get(i).getAsJsonObject();

            String language = testData.get("language").getAsString();
            String audioFile = testData.get("audio_file").getAsString();
            String transcript = testData.get("transcript").getAsString();
            float errorRate = testData.get("error_rate").getAsFloat();

            final JsonArray punctuationsJson = testData.getAsJsonArray("punctuations");
            final String[] punctuations = new String[punctuationsJson.size()];
            for (int j = 0; j < punctuationsJson.size(); j++) {
                punctuations[j] = punctuationsJson.get(j).getAsString();
            }

            final JsonArray modelsJson = testData.getAsJsonArray("models");
            final String[] modelFiles = new String[modelsJson.size()];
            for (int j = 0; j < modelsJson.size(); j++) {
                modelFiles[j] = modelsJson.get(j).getAsString();
            }

            for (String modelFile : modelFiles) {
                parameters.add(new Object[]{
                        language,
                        modelFile,
                        audioFile,
                        transcript,
                        punctuations,
                        errorRate
                });
            }
        }

        return parameters;
    }

    @Test
    public void testTranscribe() throws Exception {
        String modelPath = getModelFilepath(modelFile);
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setModelPath(modelPath)
                .setDevice(device)
                .build(appContext);

        File audioFile = new File(getAudioFilepath(testAudioFile));
        String result = processTestAudio(cheetah, audioFile);
        cheetah.delete();

        String transcript = expectedTranscript;
        for (String punctuation : punctuations) {
            transcript = transcript.replace(punctuation, "");
        }

        boolean useCER = language.equals("ja");
        assertTrue(getWordErrorRate(result, transcript, useCER) < errorRate);
    }

    @Test
    public void testTranscribeWithPunctuation() throws Exception {
        String modelPath = getModelFilepath(modelFile);
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setModelPath(modelPath)
                .setDevice(device)
                .setEnableAutomaticPunctuation(true)
                .build(appContext);

        File audioFile = new File(getAudioFilepath(testAudioFile));
        String result = processTestAudio(cheetah, audioFile);
        cheetah.delete();

        boolean useCER = language.equals("ja");
        assertTrue(getWordErrorRate(result, expectedTranscript, useCER) < errorRate);
    }
}
