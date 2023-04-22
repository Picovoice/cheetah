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

import ai.picovoice.cheetah.*;
import org.apache.commons.cli.*;

import java.io.File;
import java.io.IOException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Map;
import javax.sound.sampled.*;

public class MicDemo {
    public static void runDemo(
            String accessKey,
            String modelPath,
            String libraryPath,
            float endpointDuration,
            boolean enableAutomaticPunctuation,
            int audioDeviceIndex,
            String outputPath) {

        // for file output
        File outputFile = null;
        ByteArrayOutputStream outputStream = null;
        long totalBytesCaptured = 0;
        AudioFormat format = new AudioFormat(16000f, 16, 1, true, false);

        // get audio capture device
        DataLine.Info dataLineInfo = new DataLine.Info(TargetDataLine.class, format);
        TargetDataLine micDataLine;
        try {
            micDataLine = getAudioDevice(audioDeviceIndex, dataLineInfo);
            micDataLine.open(format);
        } catch (LineUnavailableException e) {
            System.err.println("Failed to get a valid capture device. Use --show_audio_devices to " +
                    "show available capture devices and their indices");
            System.exit(1);
            return;
        }

        Cheetah cheetah = null;
        try {
            cheetah = new Cheetah.Builder()
                    .setAccessKey(accessKey)
                    .setLibraryPath(libraryPath)
                    .setModelPath(modelPath)
                    .setEndpointDuration(endpointDuration)
                    .setEnableAutomaticPunctuation(enableAutomaticPunctuation)
                    .build();

            if (outputPath != null) {
                outputFile = new File(outputPath);
                outputStream = new ByteArrayOutputStream();
            }

            micDataLine.start();

            System.out.println("Cheetah version : " + cheetah.getVersion());
            System.out.println("Now listening...");

            // buffers for processing audio
            int frameLength = cheetah.getFrameLength();
            ByteBuffer captureBuffer = ByteBuffer.allocate(frameLength * 2);
            captureBuffer.order(ByteOrder.LITTLE_ENDIAN);
            short[] cheetahBuffer = new short[frameLength];

            int numBytesRead;
            while (System.in.available() == 0) {

                // read a buffer of audio
                numBytesRead = micDataLine.read(captureBuffer.array(), 0, captureBuffer.capacity());
                totalBytesCaptured += numBytesRead;

                // write to output if we're recording
                if (outputStream != null) {
                    outputStream.write(captureBuffer.array(), 0, numBytesRead);
                }

                // don't pass to cheetah if we don't have a full buffer
                if (numBytesRead != frameLength * 2) {
                    continue;
                }

                // copy into 16-bit buffer
                captureBuffer.asShortBuffer().get(cheetahBuffer);

                // process with cheetah
                CheetahTranscript transcriptObj = cheetah.process(cheetahBuffer);
                System.out.print(transcriptObj.getTranscript());
                if (transcriptObj.getIsEndpoint()) {
                    CheetahTranscript endpointTranscriptObj = cheetah.flush();
                    System.out.println(endpointTranscriptObj.getTranscript());
                }
                System.out.flush();
            }
            System.out.println("Stopping...");
        } catch (Exception e) {
            System.err.println(e.toString());
        } finally {
            if (outputStream != null && outputFile != null) {

                // need to transfer to input stream to write
                ByteArrayInputStream writeArray = new ByteArrayInputStream(outputStream.toByteArray());
                AudioInputStream writeStream = new AudioInputStream(
                        writeArray,
                        format,
                        totalBytesCaptured / format.getFrameSize());

                try {
                    AudioSystem.write(writeStream, AudioFileFormat.Type.WAVE, outputFile);
                } catch (IOException e) {
                    System.err.printf("Failed to write audio to '%s'.\n", outputFile.getPath());
                    e.printStackTrace();
                }
            }

            if (cheetah != null) {
                cheetah.delete();
            }
        }
    }

    private static void showAudioDevices() {
        // get available audio devices
        Mixer.Info[] allMixerInfo = AudioSystem.getMixerInfo();
        Line.Info captureLine = new Line.Info(TargetDataLine.class);

        for (int i = 0; i < allMixerInfo.length; i++) {

            // check if supports capture in the format we need
            Mixer mixer = AudioSystem.getMixer(allMixerInfo[i]);
            if (mixer.isLineSupported(captureLine)) {
                System.out.printf("Device %d: %s\n", i, allMixerInfo[i].getName());
            }
        }
    }

    private static TargetDataLine getDefaultCaptureDevice(DataLine.Info dataLineInfo) throws LineUnavailableException {
        if (!AudioSystem.isLineSupported(dataLineInfo)) {
            throw new LineUnavailableException("Default capture device does not support the audio " +
                    "format required by Picovoice (16kHz, 16-bit, linearly-encoded, single-channel PCM).");
        }

        return (TargetDataLine) AudioSystem.getLine(dataLineInfo);
    }

    private static TargetDataLine getAudioDevice(
            int deviceIndex,
            DataLine.Info dataLineInfo
    ) throws LineUnavailableException {
        if (deviceIndex >= 0) {
            try {
                Mixer.Info mixerInfo = AudioSystem.getMixerInfo()[deviceIndex];
                Mixer mixer = AudioSystem.getMixer(mixerInfo);

                if (mixer.isLineSupported(dataLineInfo)) {
                    return (TargetDataLine) mixer.getLine(dataLineInfo);
                } else {
                    System.err.printf("Audio capture device at index %s does not support the audio format " +
                            "required by Picovoice. Using default capture device.", deviceIndex);
                }
            } catch (Exception e) {
                System.err.printf("No capture device found at index %s. Using default capture device.", deviceIndex);
            }
        }

        // use default capture device if we couldn't get the one requested
        return getDefaultCaptureDevice(dataLineInfo);
    }

    public static void main(String[] args) {
        Options options = buildCommandLineOptions();
        CommandLineParser parser = new DefaultParser();
        HelpFormatter formatter = new HelpFormatter();

        CommandLine cmd;
        try {
            cmd = parser.parse(options, args);
        } catch (ParseException e) {
            System.out.println(e.getMessage());
            formatter.printHelp("cheetahmicdemo", options);
            System.exit(1);
            return;
        }

        if (cmd.hasOption("help")) {
            formatter.printHelp("cheetahmicdemo", options);
            return;
        }

        if (cmd.hasOption("show_audio_devices")) {
            showAudioDevices();
            return;
        }

        String accessKey = cmd.getOptionValue("access_key");
        String modelPath = cmd.getOptionValue("model_path");
        String libraryPath = cmd.getOptionValue("library_path");
        String endpointDurationStr = cmd.getOptionValue("endpoint_duration_sec");
        boolean enableAutomaticPunctuation = !cmd.hasOption("disable_automatic_punctuation");
        String audioDeviceIndexStr = cmd.getOptionValue("audio_device_index");
        String outputPath = cmd.getOptionValue("output_path");

        if (accessKey == null || accessKey.length() == 0) {
            throw new IllegalArgumentException("AccessKey is required for Cheetah.");
        }

        if (libraryPath == null) {
            libraryPath = Cheetah.LIBRARY_PATH;
        }

        if (modelPath == null) {
            modelPath = Cheetah.MODEL_PATH;
        }

        float endpointDuration = 1f;
        if (endpointDurationStr != null) {
            try {
                endpointDuration = Float.parseFloat(endpointDurationStr);
            } catch (Exception e) {
                throw new IllegalArgumentException("Failed to parse endpoint_duration_sec value. " +
                        "Must be a floating-point number greater than or equal to zero.");
            }

            if (endpointDuration < 0) {
                throw new IllegalArgumentException(String.format("Failed to parse endpoint_duration_sec value (%s). " +
                        "Must be a floating-point number greater than or equal to zero.", endpointDuration));
            }
        }

        int audioDeviceIndex = -1;
        if (audioDeviceIndexStr != null) {
            try {
                audioDeviceIndex = Integer.parseInt(audioDeviceIndexStr);
                if (audioDeviceIndex < 0) {
                    throw new IllegalArgumentException(String.format("Audio device index %s is not a " +
                            "valid positive integer.", audioDeviceIndexStr));
                }
            } catch (Exception e) {
                throw new IllegalArgumentException(String.format("Audio device index '%s' is not a " +
                        "valid positive integer.", audioDeviceIndexStr));
            }
        }

        runDemo(
                accessKey,
                modelPath,
                libraryPath,
                endpointDuration,
                enableAutomaticPunctuation,
                audioDeviceIndex,
                outputPath);
    }

    private static Options buildCommandLineOptions() {
        Options options = new Options();

        options.addOption(Option.builder("a")
                .longOpt("access_key")
                .hasArg(true)
                .desc("AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).")
                .build());

        options.addOption(Option.builder("m")
                .longOpt("model_path")
                .hasArg(true)
                .desc("Absolute path to the file containing model parameters.")
                .build());

        options.addOption(Option.builder("l")
                .longOpt("library_path")
                .hasArg(true)
                .desc("Absolute path to the Cheetah native runtime library.")
                .build());

        options.addOption(Option.builder("e")
                .longOpt("endpoint_duration_sec")
                .hasArg(true)
                .desc("Duration of endpoint in seconds. A speech endpoint is detected when there is a " +
                      "chunk of audio (with a duration specified herein) after an utterance without " +
                      "any speech in it. Set duration to 0 to disable this. Default is 1 second.")
                .build());

        options.addOption(Option.builder("d")
                .longOpt("disable_automatic_punctuation")
                .desc("")
                .build());

        options.addOption(Option.builder("o")
                .longOpt("output_path")
                .hasArg(true)
                .desc("Absolute path to recorded audio for debugging.")
                .build());

        options.addOption(Option.builder("di")
                .longOpt("audio_device_index")
                .hasArg(true)
                .desc("Index of input audio device.")
                .build());

        options.addOption(new Option("sd", "show_audio_devices", false, "Print available recording devices."));

        options.addOption(new Option("h", "help", false, ""));

        return options;
    }
}
