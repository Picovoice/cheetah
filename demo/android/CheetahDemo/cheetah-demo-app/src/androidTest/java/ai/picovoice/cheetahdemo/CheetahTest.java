/*
    Copyright 2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.cheetahdemo;

import android.content.Context;
import android.content.res.AssetManager;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.microsoft.appcenter.espresso.Factory;
import com.microsoft.appcenter.espresso.ReportHelper;

import org.junit.After;
import org.junit.Assume;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

import ai.picovoice.cheetah.Cheetah;
import ai.picovoice.cheetah.CheetahException;
import ai.picovoice.cheetah.CheetahTranscript;

import static org.junit.Assert.assertTrue;


@RunWith(AndroidJUnit4.class)
public class CheetahTest {

    @Rule
    public ReportHelper reportHelper = Factory.getReportHelper();
    Context testContext;
    Context appContext;
    AssetManager assetManager;
    String testResourcesPath;
    String defaultModelPath;

    String accessKey = "";

    private final String transcript = "MR QUILTER IS THE APOSTLE OF THE MIDDLE CLASSES AND WE ARE GLAD TO WELCOME HIS GOSPEL";

    @After
    public void TearDown() {
        reportHelper.label("Stopping App");
    }

    @Before
    public void Setup() throws IOException {
        testContext = InstrumentationRegistry.getInstrumentation().getContext();
        appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assetManager = testContext.getAssets();
        extractAssetsRecursively("test_resources");
        testResourcesPath = new File(appContext.getFilesDir(), "test_resources").getAbsolutePath();
        defaultModelPath = new File(testResourcesPath, "cheetah_params.pv").getAbsolutePath();

        accessKey = appContext.getString(R.string.pvTestingAccessKey);
    }

    @Test
    public void testTranscribe() throws Exception {
        Cheetah cheetah = new Cheetah.Builder().setAccessKey(accessKey)
            .setModelPath(defaultModelPath)
            .build(appContext);

        File audioFile = new File(testResourcesPath, "audio/test.wav");
        String result = "";

        FileInputStream audioInputStream = new FileInputStream(audioFile);

        byte[] rawData = new byte[cheetah.getFrameLength() * 2];
        short[] pcm = new short[cheetah.getFrameLength()];
        ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);

        audioInputStream.skip(44);

        while (audioInputStream.available() > 0) {
            int numRead = audioInputStream.read(pcmBuff.array());
            if (numRead == cheetah.getFrameLength() * 2) {
                pcmBuff.asShortBuffer().get(pcm);
                CheetahTranscript transcriptObj = cheetah.process(pcm);
                result += transcriptObj.getTranscript();
            }
        }

        CheetahTranscript transcriptObj = cheetah.flush();
        result += transcriptObj.getTranscript();

        assertTrue(result.equals(transcript));

        cheetah.delete();
    }

    @Test
    public void getVersion() throws CheetahException {
        Cheetah cheetah = new Cheetah.Builder().setAccessKey(accessKey)
            .setModelPath(defaultModelPath)
            .build(appContext);

        assertTrue(cheetah.getVersion() != null && !cheetah.getVersion().equals(""));

        cheetah.delete();
    }

    @Test
    public void getFrameLength() throws CheetahException {
        Cheetah cheetah = new Cheetah.Builder().setAccessKey(accessKey)
            .setModelPath(defaultModelPath)
            .build(appContext);

        assertTrue(cheetah.getFrameLength() > 0);

        cheetah.delete();
    }

    @Test
    public void getSampleRate() throws CheetahException {
        Cheetah cheetah = new Cheetah.Builder().setAccessKey(accessKey)
            .setModelPath(defaultModelPath)
            .build(appContext);

        assertTrue(cheetah.getSampleRate() > 0);

        cheetah.delete();
    }

    @Test
    public void testPerformance() throws Exception {
        String thresholdString = appContext.getString(R.string.performanceThresholdSec);
        Assume.assumeNotNull(thresholdString);
        Assume.assumeFalse(thresholdString.equals(""));

        Cheetah cheetah = new Cheetah.Builder().setAccessKey(accessKey)
            .setModelPath(defaultModelPath)
            .build(appContext);

        double performanceThresholdSec = Double.parseDouble(thresholdString);

        File testAudio = new File(testResourcesPath, "audio_samples/test.wav");
        FileInputStream audioInputStream = new FileInputStream(testAudio);

        byte[] rawData = new byte[cheetah.getFrameLength() * 2];
        short[] pcm = new short[cheetah.getFrameLength()];
        ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);

        audioInputStream.skip(44);

        long totalNSec = 0;
        while (audioInputStream.available() > 0) {
            int numRead = audioInputStream.read(pcmBuff.array());
            if (numRead == cheetah.getFrameLength() * 2) {
                pcmBuff.asShortBuffer().get(pcm);
                long before = System.nanoTime();
                cheetah.process(pcm);
                long after = System.nanoTime();
                totalNSec += (after - before);
            }
        }
        cheetah.delete();

        double totalSec = Math.round(((double) totalNSec) * 1e-6) / 1000.0;
        assertTrue(
                String.format("Expected threshold (%.3fs), process took (%.3fs)", performanceThresholdSec, totalSec),
                totalSec <= performanceThresholdSec
        );
    }

    private void extractAssetsRecursively(String path) throws IOException {

        String[] list = assetManager.list(path);
        if (list.length > 0) {
            File outputFile = new File(appContext.getFilesDir(), path);
            if (!outputFile.exists()) {
                outputFile.mkdirs();
            }

            for (String file : list) {
                String filepath = path + "/" + file;
                extractAssetsRecursively(filepath);
            }
        } else {
            extractTestFile(path);
        }
    }

    private void extractTestFile(String filepath) throws IOException {

        InputStream is = new BufferedInputStream(assetManager.open(filepath), 256);
        File absPath = new File(appContext.getFilesDir(), filepath);
        OutputStream os = new BufferedOutputStream(new FileOutputStream(absPath), 256);
        int r;
        while ((r = is.read()) != -1) {
            os.write(r);
        }
        os.flush();

        is.close();
        os.close();
    }
}
