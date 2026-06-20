/*
    Copyright 2022-2026 Picovoice Inc.

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
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.text.method.ScrollingMovementMethod;
import android.text.SpannableStringBuilder;
import android.view.View;
import android.view.ViewGroup;
import android.view.LayoutInflater;
import android.widget.TextView;
import android.widget.ToggleButton;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

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

    VerboseResultsViewAdaptor searchResultsViewAdaptor;

    public Cheetah cheetah;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.cheetah_demo);

        TextView transcriptTextView = findViewById(R.id.transcriptTextView);
        transcriptTextView.setMovementMethod(new ScrollingMovementMethod());

        RecyclerView verboseResultsView = findViewById(R.id.verboseResultsView);
        verboseResultsView.setItemAnimator(null);
        LinearLayoutManager linearLayoutManager = new LinearLayoutManager(getApplicationContext());
        verboseResultsView.setLayoutManager(linearLayoutManager);

        searchResultsViewAdaptor = new VerboseResultsViewAdaptor(getApplicationContext());
        verboseResultsView.setAdapter(searchResultsViewAdaptor);

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

        try {
            if (recordButton.isChecked()) {
                if (voiceProcessor.hasRecordAudioPermission(this)) {
                    recordingTextView.setText("Recording...");
                    voiceProcessor.start(cheetah.getFrameLength(), cheetah.getSampleRate());
                } else {
                    requestRecordPermission();
                }

                TextView transcriptTextView = findViewById(R.id.transcriptTextView);
                transcriptTextView.setText("");
                searchResultsViewAdaptor.clearData();

            } else {
                recordingTextView.setText("Press START to start live audio transcription");
                voiceProcessor.stop();
                final CheetahTranscriptAnnotated result = cheetah.flushAnnotated();
                updateTranscriptView(result.getTranscript() + " ", result.getWordArray());
            }
        } catch (VoiceProcessorException | CheetahException e) {
            displayError(e.toString());
        }
    }

    private void updateTranscriptView(String transcript, CheetahTranscript.Word[] words) {
        System.out.println(transcript);

        runOnUiThread(() -> {
            if (transcript.length() > 0) {
                TextView transcriptTextView = findViewById(R.id.transcriptTextView);

                final int scrollAmount = transcriptTextView.getLayout().getLineTop(transcriptTextView.getLineCount()) -
                        transcriptTextView.getHeight() +
                        transcriptTextView.getLineHeight();
                if (scrollAmount > 0) {
                    transcriptTextView.scrollTo(0, scrollAmount);
                }

                transcriptTextView.append(transcript);
            }
        });

        searchResultsViewAdaptor.addData(Arrays.asList(words));
    }

    private static class VerboseResultsViewAdaptor extends RecyclerView.Adapter<VerboseResultsViewAdaptor.ViewHolder> {
        private final ArrayList<CheetahTranscript.Word> data;
        private final LayoutInflater inflater;
        private RecyclerView recyclerView;

        VerboseResultsViewAdaptor(Context context) {
            this.inflater = LayoutInflater.from(context);
            this.data = new ArrayList<CheetahTranscript.Word>();
        }

        @Override
        public void onAttachedToRecyclerView(@NonNull RecyclerView rv) {
            super.onAttachedToRecyclerView(rv);
            this.recyclerView = rv;
        }

        @Override
        public void onDetachedFromRecyclerView(@NonNull RecyclerView rv) {
            super.onDetachedFromRecyclerView(rv);
            this.recyclerView = null;
        }

        public void addData(List<CheetahTranscript.Word> data) {
            if (data.size() > 0) {
                this.data.addAll(data);
                notifyItemRangeInserted(this.data.size() - data.size(), data.size());
                recyclerView.scrollToPosition(this.data.size() - 1);
            }
        }

        public void clearData() {
            final int size = this.data.size();
            this.data.clear();
            notifyItemRangeRemoved(0, size);
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View view = inflater.inflate(R.layout.recyclerview_row, parent, false);
            return new ViewHolder(view);
        }

        @SuppressLint("DefaultLocale")
        @Override
        public void onBindViewHolder(ViewHolder holder, int position) {
            CheetahTranscript.Word word = data.get(position);
            holder.word.setText(word.getWord());
            holder.startSec.setText(String.format("%.2fs", word.getStartSec()));
            holder.endSec.setText(String.format("%.2fs", word.getEndSec()));
            holder.confidence.setText(String.format("%.0f%%", word.getConfidence() * 100));
        }

        @Override
        public int getItemCount() {
            return data.size();
        }

        public static class ViewHolder extends RecyclerView.ViewHolder {
            TextView word;
            TextView startSec;
            TextView endSec;
            TextView confidence;

            ViewHolder(View itemView) {
                super(itemView);
                word = itemView.findViewById(R.id.word);
                startSec = itemView.findViewById(R.id.startSec);
                endSec = itemView.findViewById(R.id.endSec);
                confidence = itemView.findViewById(R.id.confidence);
            }
        }
    }
}
