package ai.picovoice.cheetahdemo;

import static org.junit.Assert.assertTrue;

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
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

import ai.picovoice.cheetah.Cheetah;

@RunWith(AndroidJUnit4.class)
public class PerformanceTest {
    @Rule
    public ReportHelper reportHelper = Factory.getReportHelper();
    Context testContext;
    Context appContext;
    AssetManager assetManager;
    String testResourcesPath;
    String defaultModelPath;
    String accessKey;

    int numTestIterations = 30;

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

        String iterationString = appContext.getString(R.string.numTestIterations);
        try {
            numTestIterations = Integer.parseInt(iterationString);
        } catch (NumberFormatException ignored) {}
    }

    @Test
    public void testInitPerformance() throws Exception {
        String initThresholdString = appContext.getString(R.string.initPerformanceThresholdSec);
        Assume.assumeNotNull(initThresholdString);
        Assume.assumeFalse(initThresholdString.equals(""));

        double initPerformanceThresholdSec = Double.parseDouble(initThresholdString);

        long totalNSec = 0;
        for (int i = 0; i < numTestIterations; i++) {
            long before = System.nanoTime();
            Cheetah cheetah = new Cheetah.Builder().setAccessKey(accessKey)
                    .setModelPath(defaultModelPath)
                    .build(appContext);
            long after = System.nanoTime();
            totalNSec += (after - before);
            cheetah.delete();
        }

        double avgNSec = totalNSec / (double) numTestIterations;
        double avgSec = ((double) Math.round(avgNSec * 1e-6)) / 1000.0;
        assertTrue(
                String.format("Expected threshold (%.3fs), init took (%.3fs)", initPerformanceThresholdSec, avgSec),
                avgSec <= initPerformanceThresholdSec
        );
    }

    @Test
    public void testProcPerformance() throws Exception {
        String procThresholdString = appContext.getString(R.string.procPerformanceThresholdSec);
        Assume.assumeNotNull(procThresholdString);
        Assume.assumeFalse(procThresholdString.equals(""));

        double procPerformanceThresholdSec = Double.parseDouble(procThresholdString);

        Cheetah cheetah = new Cheetah.Builder().setAccessKey(accessKey)
                .setModelPath(defaultModelPath)
                .build(appContext);

        File testAudio = new File(testResourcesPath, "audio/test.wav");

        long totalNSec = 0;
        for (int i = 0; i < numTestIterations; i++) {
            FileInputStream audioInputStream = new FileInputStream(testAudio);

            byte[] rawData = new byte[cheetah.getFrameLength() * 2];
            short[] pcm = new short[cheetah.getFrameLength()];
            ByteBuffer pcmBuff = ByteBuffer.wrap(rawData).order(ByteOrder.LITTLE_ENDIAN);

            audioInputStream.skip(44);
            while (audioInputStream.available() > 0) {
                int numRead = audioInputStream.read(pcmBuff.array());
                if (numRead == cheetah.getFrameLength() * 2) {
                    pcmBuff.asShortBuffer().get(pcm);
                    long beforeProc = System.nanoTime();
                    cheetah.process(pcm);
                    long afterProc = System.nanoTime();
                    totalNSec += (afterProc - beforeProc);
                }
            }
        }
        cheetah.delete();

        double avgNSec = totalNSec / (double) numTestIterations;
        double avgSec = ((double) Math.round(avgNSec * 1e-6)) / 1000.0;
        assertTrue(
                String.format("Expected threshold (%.3fs), process took (%.3fs)", procPerformanceThresholdSec, avgSec),
                avgSec <= procPerformanceThresholdSec
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
