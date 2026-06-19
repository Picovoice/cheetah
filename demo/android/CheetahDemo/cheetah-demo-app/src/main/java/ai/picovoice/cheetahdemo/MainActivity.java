/*
    Copyright 2022-2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.cheetahdemo;

import static java.lang.Math.max;
import static java.lang.Math.min;

import android.Manifest;
import android.animation.ArgbEvaluator;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.method.ScrollingMovementMethod;
import android.text.SpannableStringBuilder;
import android.view.View;
import android.view.LayoutInflater;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.ToggleButton;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.constraintlayout.helper.widget.Flow;
import androidx.constraintlayout.widget.ConstraintLayout;
import androidx.core.app.ActivityCompat;

import com.google.android.material.switchmaterial.SwitchMaterial;

import java.util.ArrayList;
import java.util.Objects;

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
import ai.picovoice.cheetah.CheetahTranscriptAnnotated;

public class MainActivity extends AppCompatActivity {
    private static final String ACCESS_KEY = "${YOUR_ACCESS_KEY_HERE}";

    private static final String flavor = BuildConfig.FLAVOR;
    private final VoiceProcessor voiceProcessor = VoiceProcessor.getInstance();

    SpannableStringBuilder transcriptContents = new SpannableStringBuilder();

    public Cheetah cheetah;
    private boolean verbose = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.cheetah_demo);

        TextView transcriptTextView = findViewById(R.id.transcriptTextView);
        transcriptTextView.setMovementMethod(new ScrollingMovementMethod());

        try {
            Cheetah.Builder builder = new Cheetah.Builder()
                    .setAccessKey(ACCESS_KEY)
                    .setDevice("best")
                    .setEndpointDuration(1f)
                    .setEnableAutomaticPunctuation(true)
                    .setEnableTextNormalization(true);

            String model = "cheetah_params";
            String language = flavor.substring(0, 2);
            if (!language.equals("en")) {
                model += "_" + language;
            }
            model += ".pv";
            builder.setModelPath("models/" + model);

            cheetah = builder.build(getApplicationContext());
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
                final CheetahTranscriptAnnotated partialResult = cheetah.processAnnotated(frame);
                updateTranscriptView(partialResult.getTranscript(), partialResult.getWordArray());

                if (partialResult.getIsEndpoint()) {
                    final CheetahTranscriptAnnotated finalResult = cheetah.flushAnnotated();
                    updateTranscriptView(finalResult.getTranscript() + " ", finalResult.getWordArray());
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

        SwitchMaterial verboseSwitch = findViewById(R.id.verbose);

        try {
            if (recordButton.isChecked()) {
                if (voiceProcessor.hasRecordAudioPermission(this)) {
                    recordingTextView.setText("Recording...");
                    voiceProcessor.start(cheetah.getFrameLength(), cheetah.getSampleRate());
                } else {
                    requestRecordPermission();
                }

                TextView transcriptTextView = findViewById(R.id.transcriptTextView);
                this.transcriptContents.clear();
                transcriptTextView.setText(this.transcriptContents);

                verboseSwitch.setEnabled(false);
                if (verboseSwitch.isChecked()) {
                    transcriptTextView.setTypeface(Typeface.MONOSPACE);
                } else {
                    transcriptTextView.setTypeface(Typeface.DEFAULT);
                }
            } else {
                recordingTextView.setText("Press START to start live audio transcription");
                voiceProcessor.stop();
                final CheetahTranscriptAnnotated result = cheetah.flushAnnotated();
                updateTranscriptView(result.getTranscript() + " ", result.getWordArray());
                verboseSwitch.setEnabled(true);
            }
        } catch (VoiceProcessorException | CheetahException e) {
            displayError(e.toString());
        }
    }

    private void scrollAndUpdate() {
        TextView transcriptTextView = findViewById(R.id.transcriptTextView);

        final int scrollAmount = transcriptTextView.getLayout().getLineTop(transcriptTextView.getLineCount()) -
                transcriptTextView.getHeight() +
                transcriptTextView.getLineHeight();

        if (scrollAmount > 0) {
            transcriptTextView.scrollTo(0, scrollAmount);
        }

        transcriptTextView.setText(this.transcriptContents);
    }

    private void updateTranscriptView(String transcript, CheetahTranscript.Word[] words) {
        SwitchMaterial verboseSwitch = findViewById(R.id.verbose);
        final boolean verbose = verboseSwitch.isChecked();

        runOnUiThread(() -> {
            if (verbose) {
                if (words.length > 0) {
                    TextView transcriptTextView = findViewById(R.id.transcriptTextView);
                    Paint paint = transcriptTextView.getPaint();
                    float charWidth = paint.measureText("M");
                    int usableWidth = transcriptTextView.getWidth() -
                                      transcriptTextView.getPaddingLeft() -
                                      transcriptTextView.getPaddingRight();
                    int charsThatFit = (int) (usableWidth / charWidth);

                    for (CheetahTranscript.Word word : words) {
                        final int column_b = 9;
                        final int column_c = 9;
                        final int column_d = 5;
                        final int column_a = charsThatFit - column_b - column_c - column_d - 3;
                        String a = word.getWord();
                        String b = String.format("%.2f s", word.getStartSec());
                        String c = String.format("%.2f s", word.getEndSec());
                        String d = String.format(" %.0f%%", 100 * word.getConfidence());
                        String spacesA = new String(new char[max(0, column_a - a.length())]).replace('\0', ' ');
                        String spacesB = new String(new char[max(0, column_b - b.length())]).replace('\0', ' ');
                        String spacesC = new String(new char[max(0, column_c - c.length())]).replace('\0', ' ');
                        String spacesD = new String(new char[max(0, column_d - d.length())]).replace('\0', ' ');
                        this.transcriptContents.append(String.format(
                                "%s%s|%s%s|%s%s|%s%s\n",
                                a.substring(0, min(column_a, a.length())), spacesA,
                                b.substring(0, min(column_b, b.length())), spacesB,
                                c.substring(0, min(column_c, c.length())), spacesC,
                                d.substring(0, min(column_d, d.length())), spacesD));
                    }
                    scrollAndUpdate();
                }
            } else {
                if (transcript.length() > 0) {
                    this.transcriptContents.append(transcript);
                    scrollAndUpdate();
                }
            }
        });
    }
}
