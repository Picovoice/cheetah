/*
    Copyright 2022-2023 Picovoice Inc.

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
import android.os.Bundle;
import android.text.method.ScrollingMovementMethod;
import android.view.View;
import android.widget.TextView;
import android.widget.ToggleButton;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import ai.picovoice.android.voiceprocessor.VoiceProcessor;
import ai.picovoice.android.voiceprocessor.VoiceProcessorException;
import ai.picovoice.cheetah.Cheetah;
import ai.picovoice.cheetah.CheetahActivationException;
import ai.picovoice.cheetah.CheetahActivationLimitException;
import ai.picovoice.cheetah.CheetahActivationRefusedException;
import ai.picovoice.cheetah.CheetahActivationThrottledException;
import ai.picovoice.cheetah.CheetahException;
import ai.picovoice.cheetah.CheetahInvalidArgumentException;
import ai.picovoice.cheetah.CheetahTranscript;

public class MainActivity extends AppCompatActivity {
    private static final String ACCESS_KEY = "${YOUR_ACCESS_KEY_HERE}";

    private static final String MODEL_FILE = "cheetah_params.pv";

    private final VoiceProcessor voiceProcessor = VoiceProcessor.getInstance();

    public Cheetah cheetah;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.cheetah_demo);

        TextView transcriptTextView = findViewById(R.id.transcriptTextView);
        transcriptTextView.setMovementMethod(new ScrollingMovementMethod());

        try {
            cheetah = new Cheetah.Builder()
                    .setAccessKey(ACCESS_KEY)
                    .setModelPath(MODEL_FILE)
                    .setEndpointDuration(1f)
                    .setEnableAutomaticPunctuation(true)
                    .build(getApplicationContext());
        } catch (CheetahInvalidArgumentException e) {
            displayError(e.getMessage());
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

        voiceProcessor.addFrameListener(frame -> {
            try {
                final CheetahTranscript partialResult = cheetah.process(frame);
                updateTranscriptView(partialResult.getTranscript());

                if (partialResult.getIsEndpoint()) {
                    final CheetahTranscript finalResult = cheetah.flush();
                    updateTranscriptView(finalResult.getTranscript() + " ");
                }
            } catch (CheetahException e) {
                runOnUiThread(() -> displayError(e.toString()));
            }
        });

        voiceProcessor.addErrorListener(error -> {
            runOnUiThread(() -> displayError(error.toString()));
        });
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

    private void requestRecordPermission() {
        ActivityCompat.requestPermissions(
                this,
                new String[]{Manifest.permission.RECORD_AUDIO},
                0);
    }

    @SuppressLint("SetTextI18n")
    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (grantResults.length == 0 || grantResults[0] == PackageManager.PERMISSION_DENIED) {
            ToggleButton toggleButton = findViewById(R.id.recordButton);
            toggleButton.toggle();
        } else {
            TextView recordingTextView = findViewById(R.id.recordingTextView);
            recordingTextView.setText("Recording...");
            try {
                voiceProcessor.start(cheetah.getFrameLength(), cheetah.getSampleRate());
            } catch (VoiceProcessorException e) {
                displayError(e.toString());
            }
        }
    }

    @SuppressLint({"SetTextI18n", "DefaultLocale"})
    public void onRecordClick(View view) {
        ToggleButton recordButton = findViewById(R.id.recordButton);
        TextView recordingTextView = findViewById(R.id.recordingTextView);
        if (cheetah == null) {
            displayError("Cheetah is not initialized");
            recordButton.setChecked(false);
            return;
        }

        try {
            if (recordButton.isChecked()) {
                if (voiceProcessor.hasRecordAudioPermission(this)) {
                    recordingTextView.setText("Recording...");
                    voiceProcessor.start(cheetah.getFrameLength(), cheetah.getSampleRate());
                } else {
                    requestRecordPermission();
                }
            } else {
                recordingTextView.setText("");
                voiceProcessor.stop();
                final CheetahTranscript result = cheetah.flush();
                updateTranscriptView(result.getTranscript() + " ");
            }
        } catch (VoiceProcessorException | CheetahException e) {
            displayError(e.toString());
        }
    }

    private void updateTranscriptView(String transcript) {
        runOnUiThread(() -> {
            if (transcript.length() != 0) {
                TextView transcriptTextView = findViewById(R.id.transcriptTextView);
                transcriptTextView.append(transcript);

                final int scrollAmount = transcriptTextView.getLayout().getLineTop(transcriptTextView.getLineCount()) -
                        transcriptTextView.getHeight() +
                        transcriptTextView.getLineHeight();

                if (scrollAmount > 0) {
                    transcriptTextView.scrollTo(0, scrollAmount);
                }
            }
        });
    }
}
