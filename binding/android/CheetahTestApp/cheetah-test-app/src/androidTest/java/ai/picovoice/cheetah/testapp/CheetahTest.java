/*
    Copyright 2022-2023 Picovoice Inc.

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

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;

import ai.picovoice.cheetah.Cheetah;
import ai.picovoice.cheetah.CheetahException;


@RunWith(AndroidJUnit4.class)
public class CheetahTest extends BaseTest {

    private final String transcript =
            "Mr quilter is the apostle of the middle classes and we are glad to welcome his gospel";
    private final String transcriptWithPunctuation =
            "Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel.";

    @Test
    public void testTranscribe() throws Exception {
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setModelPath(defaultModelPath)
                .build(appContext);

        File audioFile = new File(testResourcesPath, "audio/test.wav");
        String result = processTestAudio(cheetah, audioFile);
        cheetah.delete();

        assertEquals(transcript, result);
    }

    @Test
    public void testTranscribeWithPunctuation() throws Exception {
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setModelPath(defaultModelPath)
                .setEnableAutomaticPunctuation(true)
                .build(appContext);

        File audioFile = new File(testResourcesPath, "audio/test.wav");
        String result = processTestAudio(cheetah, audioFile);
        cheetah.delete();

        assertEquals(transcriptWithPunctuation, result);
    }

    @Test
    public void getVersion() throws CheetahException {
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setModelPath(defaultModelPath)
                .build(appContext);

        String version = cheetah.getVersion();
        cheetah.delete();

        assertTrue(version != null && !version.equals(""));
    }

    @Test
    public void getFrameLength() throws CheetahException {
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setModelPath(defaultModelPath)
                .build(appContext);

        int frameLength = cheetah.getFrameLength();
        cheetah.delete();

        assertTrue(frameLength > 0);
    }

    @Test
    public void getSampleRate() throws CheetahException {
        Cheetah cheetah = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setModelPath(defaultModelPath)
                .build(appContext);

        int sampleRate = cheetah.getSampleRate();
        cheetah.delete();

        assertTrue(sampleRate > 0);
    }

    @Test
    public void testErrorStack() {
        String[] error = {};
        try {
            new Cheetah.Builder()
                    .setAccessKey("invalid")
                    .setModelPath(defaultModelPath)
                    .build(appContext);
        } catch (CheetahException e) {
            error = e.getMessageStack();
        }

        assertTrue(0 < error.length);
        assertTrue(error.length <= 8);

        try {
            new Cheetah.Builder()
                    .setAccessKey("invalid")
                    .setModelPath(defaultModelPath)
                    .build(appContext);
        } catch (CheetahException e) {
            for (int i = 0; i < error.length; i++) {
                assertEquals(e.getMessageStack()[i], error[i]);
            }
        }
    }
}
