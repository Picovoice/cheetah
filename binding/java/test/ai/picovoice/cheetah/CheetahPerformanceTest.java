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

import org.junit.jupiter.api.Test;

import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import java.io.File;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Paths;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class CheetahPerformanceTest {
    private final String accessKey = System.getProperty("pvTestingAccessKey");
    private final int numTestIterations = Integer.parseInt(System.getProperty("numTestIterations"));
    private final double initPerformanceThresholdSec =
            Double.parseDouble(System.getProperty("initPerformanceThresholdSec"));
    private final double procPerformanceThresholdSec =
            Double.parseDouble(System.getProperty("procPerformanceThresholdSec"));


    @Test
    void initPerformance() throws Exception {
        long[] perfResults = new long[numTestIterations];
        for (int i = 0; i < numTestIterations + 1; i++) {
            long before = System.nanoTime();
            Cheetah cheetah = new Cheetah.Builder()
                    .setAccessKey(accessKey)
                    .setModelPath(Utils.getPackagedModelPath())
                    .setLibraryPath(Utils.getPackagedLibraryPath())
                    .build();

            long initTime = (System.nanoTime() - before);

            if (i > 0) {
                perfResults[i - 1] = initTime;
            }
            cheetah.delete();
        }

        long avgPerfNSec = Arrays.stream(perfResults).sum() / numTestIterations;
        double avgPerfSec = Math.round(((double) avgPerfNSec) * 1e-6) / 1000.0;
        System.out.printf("Average init performance: %.3fs\n", avgPerfSec);
        assertTrue(
                avgPerfSec <= initPerformanceThresholdSec,
                String.format(
                        "Expected threshold (%.3fs), init took an average of %.3fs",
                        initPerformanceThresholdSec,
                        avgPerfSec)
        );
    }

    @Test
    void procPerformance() throws Exception {
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setModelPath(Utils.getPackagedModelPath())
                .setLibraryPath(Utils.getPackagedLibraryPath())
                .build();

        int frameLen = cheetah.getFrameLength();
        String audioFilePath = Paths.get(System.getProperty("user.dir"))
                .resolve("../../resources/audio_samples/test.wav")
                .toString();
        File testAudioPath = new File(audioFilePath);

        short[] cheetahFrame = new short[frameLen];
        long[] perfResults = new long[numTestIterations];
        for (int i = 0; i < numTestIterations + 1; i++) {
            AudioInputStream audioInputStream = AudioSystem.getAudioInputStream(testAudioPath);
            int byteDepth = audioInputStream.getFormat().getFrameSize();
            byte[] pcm = new byte[frameLen * byteDepth];

            long totalProcTime = 0;
            int numBytesRead;
            while ((numBytesRead = audioInputStream.read(pcm)) != -1) {
                if (numBytesRead / byteDepth == frameLen) {
                    ByteBuffer.wrap(pcm).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(cheetahFrame);
                    long before = System.nanoTime();
                    cheetah.process(cheetahFrame);
                    totalProcTime += (System.nanoTime() - before);
                }
            }
            if (i > 0) {
                perfResults[i - 1] = totalProcTime;
            }
            audioInputStream.close();
        }
        cheetah.delete();

        long avgPerfNSec = Arrays.stream(perfResults).sum() / numTestIterations;
        double avgPerfSec = Math.round(((double) avgPerfNSec) * 1e-6) / 1000.0;
        System.out.printf("Average proc performance: %.3fs\n", avgPerfSec);
        assertTrue(
                avgPerfSec <= procPerformanceThresholdSec,
                String.format(
                        "Expected threshold (%.3fs), proc took an average of %.3fs",
                        procPerformanceThresholdSec,
                        avgPerfSec)
        );
    }
}
