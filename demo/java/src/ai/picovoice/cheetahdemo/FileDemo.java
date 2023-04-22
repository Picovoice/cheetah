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

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.UnsupportedAudioFileException;
import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Map;

public class FileDemo {

    public static void runDemo(
            String accessKey,
            String modelPath,
            String libraryPath,
            boolean enableAutomaticPunctuation,
            File inputAudioFile) {

        AudioInputStream audioInputStream;
        try {
            audioInputStream = AudioSystem.getAudioInputStream(inputAudioFile);
        } catch (UnsupportedAudioFileException e) {
            System.err.println("Audio format not supported. Please provide an input file of .au, .aiff or .wav format");
            return;
        } catch (IOException e) {
            System.err.println("Could not find input audio file at " + inputAudioFile);
            return;
        }

        Cheetah cheetah = null;
        try {
            cheetah = new Cheetah.Builder()
                    .setAccessKey(accessKey)
                    .setLibraryPath(libraryPath)
                    .setModelPath(modelPath)
                    .setEnableAutomaticPunctuation(enableAutomaticPunctuation)
                    .build();

            AudioFormat audioFormat = audioInputStream.getFormat();

            if (audioFormat.getSampleRate() != 16000.0f || audioFormat.getSampleSizeInBits() != 16) {
                throw new IllegalArgumentException(String.format("Invalid input audio file format. " +
                        "Input file must be a %dkHz, 16-bit audio file.", cheetah.getSampleRate()));
            }

            if (audioFormat.getChannels() > 1) {
                System.out.println("Picovoice processes single-channel audio, but a multi-channel file was provided. " +
                        "Processing leftmost channel only.");
            }

            int frameIndex = 0;
            short[] cheetahFrame = new short[cheetah.getFrameLength()];

            ByteBuffer sampleBuffer = ByteBuffer.allocate(audioFormat.getFrameSize());
            sampleBuffer.order(ByteOrder.LITTLE_ENDIAN);
            while (audioInputStream.available() != 0) {
                int numBytesRead = audioInputStream.read(sampleBuffer.array());
                if (numBytesRead < 2) {
                    break;
                }

                cheetahFrame[frameIndex++] = sampleBuffer.getShort(0);

                if (frameIndex == cheetahFrame.length) {
                    CheetahTranscript transcriptObj = cheetah.process(cheetahFrame);
                    System.out.print(transcriptObj.getTranscript());
                    System.out.flush();

                    frameIndex = 0;
                }
            }

            CheetahTranscript endpointTranscriptObj = cheetah.flush();
            System.out.println(endpointTranscriptObj.getTranscript());
        } catch (Exception e) {
            System.out.println(e.toString());
        } finally {
            if (cheetah != null) {
                cheetah.delete();
            }
        }
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
            formatter.printHelp("cheetahfiledemo", options);
            System.exit(1);
            return;
        }

        if (cmd.hasOption("help")) {
            formatter.printHelp("cheetahfiledemo", options);
            return;
        }

        String accessKey = cmd.getOptionValue("access_key");
        String libraryPath = cmd.getOptionValue("library_path");
        String modelPath = cmd.getOptionValue("model_path");
        boolean enableAutomaticPunctuation = !cmd.hasOption("disable_automatic_punctuation");
        String inputAudioPath = cmd.getOptionValue("input_audio_path");

        if (accessKey == null || accessKey.length() == 0) {
            throw new IllegalArgumentException("AccessKey is required for Cheetah.");
        }

        if (inputAudioPath == null) {
            throw new IllegalArgumentException("No input audio file provided. This is a required argument.");
        }
        File inputAudioFile = new File(inputAudioPath);
        if (!inputAudioFile.exists()) {
            throw new IllegalArgumentException(String.format("Audio file at path %s does not exits.", inputAudioPath));
        }

        if (libraryPath == null) {
            libraryPath = Cheetah.LIBRARY_PATH;
        }

        if (modelPath == null) {
            modelPath = Cheetah.MODEL_PATH;
        }

        runDemo(
                accessKey,
                modelPath,
                libraryPath,
                enableAutomaticPunctuation,
                inputAudioFile);
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

        options.addOption(Option.builder("i")
                .longOpt("input_audio_path")
                .hasArg(true)
                .desc("Absolute path to input audio file.")
                .build());

        options.addOption(Option.builder("d")
                .longOpt("disable_automatic_punctuation")
                .desc("")
                .build());

        options.addOption(new Option("h", "help", false, ""));

        return options;
    }
}
