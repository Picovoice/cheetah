/*
    Copyright 2022 Picovoice Inc.

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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class CheetahTest {
    private final String accessKey = System.getProperty("pvTestingAccessKey");

    @Test
    void getVersion() throws Exception {
        Cheetah cheetah = new Cheetah(
                accessKey,
                Utils.getPackagedLibraryPath(),
                Utils.getPackagedModelPath(),
                1
        );
        assertTrue(cheetah.getVersion() != null && !cheetah.getVersion().equals(""));

        cheetah.delete();
    }

    @Test
    void transcribe() throws Exception {
        Cheetah cheetah = new Cheetah(
                accessKey,
                Utils.getPackagedLibraryPath(),
                Utils.getPackagedModelPath(),
                1
        );

        int frameLen = cheetah.getFrameLength();
        String audioFilePath = Paths.get(System.getProperty("user.dir"))
                .resolve("../../resources/audio_samples/test.wav")
                .toString();
        File testAudioPath = new File(audioFilePath);

        AudioInputStream audioInputStream = AudioSystem.getAudioInputStream(testAudioPath);
        assertEquals(audioInputStream.getFormat().getFrameRate(), 16000);

        int byteDepth = audioInputStream.getFormat().getFrameSize();
        byte[] pcm = new byte[frameLen * byteDepth];
        short[] cheetahFrame = new short[frameLen];

        String transcript = "";
        int numBytesRead = 0;
        boolean isFinalized = false;
        while ((numBytesRead = audioInputStream.read(pcm)) != -1) {
            if (numBytesRead / byteDepth == frameLen) {
                ByteBuffer.wrap(pcm).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer().get(cheetahFrame);
                CheetahTranscript transcriptObj = cheetah.process(cheetahFrame);
                transcript += transcriptObj.getTranscript();
            }
        }
        CheetahTranscript finalTranscriptObj = cheetah.flush();
        transcript += finalTranscriptObj.getTranscript();

        String referenceTranscript = "MR QUILTER IS THE APOSTLE OF THE MIDDLE CLASSES AND WE ARE GLAD TO WELCOME HIS GOSPEL";
        assertEquals(referenceTranscript, transcript);

        cheetah.delete();
    }
}
