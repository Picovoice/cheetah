/*
    Copyright 2026 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.cheetah.testapp;

import static org.junit.Assert.assertTrue;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import ai.picovoice.cheetah.Cheetah;
import ai.picovoice.cheetah.CheetahException;

import androidx.test.ext.junit.runners.AndroidJUnit4;

@RunWith(AndroidJUnit4.class)
public class TrainTests extends BaseTest {

    @Test
    public void testTrainModel() throws CheetahException, IOException {
        String outputPath = appContext.getFileStreamPath("custom_cheetah_params.pv").getAbsolutePath();

        Map<String, String[]> newWords = new HashMap<>();
        newWords.put("picovoice", new String[]{"t l k dʒ ɛ dʒ"});

        Cheetah.trainModelFromWords(
                accessKey,
                outputPath,
                "en",
                newWords,
                new String[]{"computer"}
        );

        Cheetah c = new Cheetah.Builder()
                .setAccessKey(accessKey)
                .setDevice(device)
                .setModelPath(outputPath)
                .build(appContext);

        assertTrue(c.getVersion() != null && !c.getVersion().equals(""));
        assertTrue(c.getFrameLength() > 0);
        assertTrue(c.getSampleRate() > 0);

        c.delete();
    }
}