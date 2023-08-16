package ai.picovoice.cheetah.testapp;

import static org.junit.Assert.assertTrue;

import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.Assume;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

import ai.picovoice.cheetah.Cheetah;

@RunWith(AndroidJUnit4.class)
public class PerformanceTest extends BaseTest {

    int numTestIterations = 30;

    @Before
    public void Setup() throws IOException {
        super.Setup();

        String iterationString = appContext.getString(R.string.numTestIterations);
        try {
            numTestIterations = Integer.parseInt(iterationString);
        } catch (NumberFormatException ignored) {
        }
    }


    @Test
    public void testInitPerformance() throws Exception {
        String initThresholdString = appContext.getString(R.string.initPerformanceThresholdSec);
        Assume.assumeNotNull(initThresholdString);
        Assume.assumeFalse(initThresholdString.equals(""));

        double initPerformanceThresholdSec = Double.parseDouble(initThresholdString);

        long totalNSec = 0;
        for (int i = 0; i < numTestIterations + 1; i++) {
            long before = System.nanoTime();
            Cheetah cheetah = new Cheetah.Builder()
                    .setAccessKey(accessKey)
                    .setModelPath(defaultModelPath)
                    .build(appContext);
            long after = System.nanoTime();

            // throw away first run to account for cold start
            if (i > 0) {
                totalNSec += (after - before);
            }
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
        for (int i = 0; i < numTestIterations + 1; i++) {
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

                    // throw away first run to account for cold start
                    if (i > 0) {
                        totalNSec += (afterProc - beforeProc);
                    }
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
}
