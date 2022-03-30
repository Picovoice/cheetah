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

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Bundle;
import android.os.Process;
import android.text.method.ScrollingMovementMethod;
import android.view.View;
import android.widget.TextView;
import android.widget.ToggleButton;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import java.util.ArrayList;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

import ai.picovoice.cheetah.*;

public class MainActivity extends AppCompatActivity {
    private static final String ACCESS_KEY = "${YOUR_ACCESS_KEY_HERE}";

    private final MicrophoneReader microphoneReader = new MicrophoneReader();
    final private ArrayList<Short> pcmData = new ArrayList<>();
    public Cheetah cheetah;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.cheetah_demo);

        TextView transcriptTextView = findViewById(R.id.transcriptTextView);
        transcriptTextView.setMovementMethod(new ScrollingMovementMethod());

        try {
            String modelPath = "cheetah_params.pv";
            cheetah = new Cheetah.Builder()
                    .setAccessKey(ACCESS_KEY)
                    .setModelPath(modelPath)
                    .setEndpointDuration(1f)
                    .build(getApplicationContext());
        } catch (CheetahInvalidArgumentException e) {
            displayError(String.format("(%s)\n Ensure your AccessKey '%s' is valid", e.getMessage(), ACCESS_KEY));
        } catch (CheetahActivationException e) {
            displayError("AccessKey activation error");
        } catch (CheetahActivationLimitException e) {
            displayError("AccessKey reached its device limit");
        } catch (CheetahActivationRefusedException e) {
            displayError("AccessKey refused");
        } catch (CheetahActivationThrottledException e) {
            displayError("AccessKey has been throttled");
        } catch (CheetahException e) {
            displayError("Failed to initialize Cheetah " + e.getMessage());
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        cheetah.delete();
    }

    private void displayError(String message) {
        TextView errorText = findViewById(R.id.errorTextView);
        errorText.setText(message);
        errorText.setVisibility(View.VISIBLE);

        ToggleButton recordButton = findViewById(R.id.recordButton);
        recordButton.setEnabled(false);
    }

    private boolean hasRecordPermission() {
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestRecordPermission() {
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, 0);
    }

    @SuppressLint("SetTextI18n")
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (grantResults.length == 0 || grantResults[0] == PackageManager.PERMISSION_DENIED) {
            ToggleButton toggleButton = findViewById(R.id.recordButton);
            toggleButton.toggle();
        } else {
            TextView recordingTextView = findViewById(R.id.recordingTextView);
            recordingTextView.setText("Recording...");
            microphoneReader.start();
        }
    }

    @SuppressLint({"SetTextI18n", "DefaultLocale"})
    public void onRecordClick(View view) {
        ToggleButton recordButton = findViewById(R.id.recordButton);

        if (cheetah == null) {
            displayError("Cheetah is not initialized");
            recordButton.setChecked(false);
            return;
        }

        try {
            if (recordButton.isChecked()) {
                if (hasRecordPermission()) {
                    microphoneReader.start();
                } else {
                    requestRecordPermission();
                }
            } else {
                microphoneReader.stop();
            }
        } catch (InterruptedException e) {
            displayError("Audio stop command interrupted\n" + e.toString());
        }
    }

    private void updateTranscriptView(String transcript) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (transcript.length() != 0) {
                    TextView transcriptTextView = findViewById(R.id.transcriptTextView);
                    transcriptTextView.append(transcript);

                    final int scrollAmount = transcriptTextView.getLayout().getLineTop(transcriptTextView.getLineCount()) - transcriptTextView.getHeight() + transcriptTextView.getLineHeight();

                    if (scrollAmount > 0) {
                        transcriptTextView.scrollTo(0, scrollAmount);
                    }
                }
            }
        });
    }

    private class MicrophoneReader {
        private final AtomicBoolean started = new AtomicBoolean(false);
        private final AtomicBoolean stop = new AtomicBoolean(false);
        private final AtomicBoolean stopped = new AtomicBoolean(false);

        void start() {
            if (started.get()) {
                return;
            }

            started.set(true);

            Executors.newSingleThreadExecutor().submit((Callable<Void>) () -> {
                Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO);
                read();
                return null;
            });
        }

        void stop() throws InterruptedException {
            if (!started.get()) {
                return;
            }

            stop.set(true);

            synchronized (stopped) {
                while (!stopped.get()) {
                    stopped.wait(500);
                }
            }

            started.set(false);
            stop.set(false);
            stopped.set(false);
        }

        private void read() throws CheetahException {
            final int minBufferSize = AudioRecord.getMinBufferSize(
                    cheetah.getSampleRate(),
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT);
            final int bufferSize = Math.max(cheetah.getSampleRate() / 2, minBufferSize);

            AudioRecord audioRecord = null;

            short[] buffer = new short[cheetah.getFrameLength()];
            pcmData.clear();

            try {
                audioRecord = new AudioRecord(
                        MediaRecorder.AudioSource.MIC,
                        cheetah.getSampleRate(),
                        AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT,
                        bufferSize);
                audioRecord.startRecording();


                while (!stop.get()) {
                    if (audioRecord.read(buffer, 0, buffer.length) == buffer.length) {
                        CheetahTranscript transcriptObj = cheetah.process(buffer);
                        updateTranscriptView(transcriptObj.getTranscript());

                        if (transcriptObj.getIsEndpoint()) {
                            transcriptObj = cheetah.flush();
                            updateTranscriptView(transcriptObj.getTranscript() + " ");
                        }
                    }
                }

                final CheetahTranscript transcriptObj = cheetah.flush();
                updateTranscriptView(transcriptObj.getTranscript());

                audioRecord.stop();
            } catch (IllegalArgumentException | IllegalStateException | SecurityException e) {
                throw new CheetahException(e);
            } finally {
                if (audioRecord != null) {
                    audioRecord.release();
                }

                stopped.set(true);
                stopped.notifyAll();
            }
        }
    }
}
