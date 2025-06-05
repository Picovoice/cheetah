/*
    Copyright 2022-2024 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.cheetah.testapp;

import android.content.Context;
import android.content.res.AssetManager;

import androidx.annotation.NonNull;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Before;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.HashSet;
import java.util.Set;

import ai.picovoice.cheetah.Cheetah;
import ai.picovoice.cheetah.CheetahTranscript;

public class BaseTest {
    static Set<String> extractedFiles;

    Context testContext;
    Context appContext;
    AssetManager assetManager;
    String testResourcesPath;
    String defaultModelPath;
    String accessKey;

    @Before
    public void Setup() throws IOException {
        extractedFiles = new HashSet<>();
        testContext = InstrumentationRegistry.getInstrumentation().getContext();
        appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assetManager = testContext.getAssets();
        testResourcesPath = new File(appContext.getFilesDir(), "test_resources").getAbsolutePath();
        defaultModelPath = new File(testResourcesPath, "model_files/cheetah_params.pv").getAbsolutePath();

        accessKey = appContext.getString(R.string.pvTestingAccessKey);
    }

    public static String getTestDataString() throws IOException {
        Context testContext = InstrumentationRegistry.getInstrumentation().getContext();
        AssetManager assetManager = testContext.getAssets();

        InputStream is = new BufferedInputStream(assetManager.open("test_resources/test_data.json"), 256);
        ByteArrayOutputStream result = new ByteArrayOutputStream();

        byte[] buffer = new byte[256];
        int bytesRead;
        while ((bytesRead = is.read(buffer)) != -1) {
            result.write(buffer, 0, bytesRead);
        }

        return result.toString("UTF-8");
    }

    protected static float getWordErrorRate(
            String transcript,
            String expectedTranscript,
            boolean useCER) {
        String splitter = (useCER) ? "" : " ";
        return (float) levenshteinDistance(
                transcript.split(splitter),
                expectedTranscript.split(splitter)) / transcript.length();
    }

    private static int levenshteinDistance(String[] words1, String[] words2) {
        int[][] res = new int[words1.length + 1][words2.length + 1];
        for (int i = 0; i <= words1.length; i++) {
            res[i][0] = i;
        }
        for (int j = 0; j <= words2.length; j++) {
            res[0][j] = j;
        }
        for (int i = 1; i <= words1.length; i++) {
            for (int j = 1; j <= words2.length; j++) {
                res[i][j] = Math.min(
                        Math.min(
                                res[i - 1][j] + 1,
                                res[i][j - 1] + 1),
                        res[i - 1][j - 1] + (words1[i - 1].equalsIgnoreCase(words2[j - 1]) ? 0 : 1)
                );
            }
        }
        return res[words1.length][words2.length];
    }

    public String getModelFilepath(String modelFilename) throws IOException {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String resPath = new File(
                context.getFilesDir(),
                "test_resources").getAbsolutePath();
        String modelPath = String.format("model_files/%s", modelFilename);
        extractTestFile(String.format("test_resources/%s", modelPath));
        return new File(resPath, modelPath).getAbsolutePath();
    }

    public String getAudioFilepath(String audioFilename) throws IOException {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String resPath = new File(
                context.getFilesDir(),
                "test_resources").getAbsolutePath();
        extractTestFile(String.format("test_resources/audio_samples/%s", audioFilename));
        return new File(resPath, String.format("audio_samples/%s", audioFilename)).getAbsolutePath();
    }

    private void extractTestFile(String filepath) throws IOException {
        File absPath = new File(
                appContext.getFilesDir(),
                filepath);

        if (extractedFiles.contains(filepath)) {
            return;
        }

        if (!absPath.exists()) {
            if (absPath.getParentFile() != null) {
                absPath.getParentFile().mkdirs();
            }
            absPath.createNewFile();
        }

        InputStream is = new BufferedInputStream(
                assetManager.open(filepath),
                256);
        OutputStream os = new BufferedOutputStream(
                new FileOutputStream(absPath),
                256);

        int r;
        while ((r = is.read()) != -1) {
            os.write(r);
        }
        os.flush();

        is.close();
        os.close();

        extractedFiles.add(filepath);
    }

    String processTestAudio(@NonNull Cheetah c, File testAudio) throws Exception {
        FileInputStream audioInputStream = new FileInputStream(testAudio);

        byte[] rawData = new byte[c.getFrameLength() * 2];
        short[] pcm = new short[c.getFrameLength()];
        ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);

        audioInputStream.skip(44);

        StringBuilder result = new StringBuilder();
        while (audioInputStream.available() > 0) {
            int numRead = audioInputStream.read(pcmBuff.array());
            if (numRead == c.getFrameLength() * 2) {
                pcmBuff.asShortBuffer().get(pcm);
                CheetahTranscript transcriptObj = c.process(pcm);
                result.append(transcriptObj.getTranscript());
            }
        }

        CheetahTranscript transcriptObj = c.flush();
        result.append(transcriptObj.getTranscript());

        return result.toString();
    }
}
