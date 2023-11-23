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
import java.util.stream.Stream;


import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

public class CheetahTest {
    private final String accessKey = System.getProperty("pvTestingAccessKey");

    @Test
    void getVersion() throws CheetahException {
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .build();
        assertTrue(cheetah.getVersion() != null && !cheetah.getVersion().equals(""));
        cheetah.delete();
    }

    @Test
    void getFrameLength() throws CheetahException {
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .build();
        assertTrue(cheetah.getFrameLength() > 0);
        cheetah.delete();
    }

    @Test
    void getSampleRate() throws CheetahException {
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
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
                    .build();
        } catch (CheetahException e) {
            error = e.getMessageStack();
        }

        assertTrue(0 < error.length);
        assertTrue(error.length <= 8);

        try {
            new Cheetah.Builder()
                    .setAccessKey("invalid")
                    .build();
        } catch (CheetahException e) {
            for (int i = 0; i < error.length; i++) {
                assertEquals(e.getMessageStack()[i], error[i]);
            }
        }
    }

    @ParameterizedTest(name = "test transcribe with automatic punctuation set to ''{0}''")
    @MethodSource("transcribeProvider")
    void transcribe(boolean enableAutomaticPunctuation, String referenceTranscript) throws Exception {
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setEnableAutomaticPunctuation(enableAutomaticPunctuation)
                .build();

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
        assertEquals(referenceTranscript, transcript.toString());

        cheetah.delete();
    }

    private static Stream<Arguments> transcribeProvider() {
        return Stream.of(
                Arguments.of(true, 
                        "Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel."),
                Arguments.of(false, 
                        "Mr quilter is the apostle of the middle classes and we are glad to welcome his gospel")
        );
    }
}
