/*
    Copyright 2022-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

using System;
using System.IO;
using System.Text;

using Pv;

namespace CheetahDemo
{
    /// <summary>
    /// File Demo for Cheetah Speech-to-Text engine. The demo takes an input audio file and returns prints the the transcription.
    /// </summary>                
    public class FileDemo
    {

        /// <summary>
        /// Reads through input file and prints the transcription returned by Cheetah.
        /// </summary>
        /// <param name="inputAudioPath">Required argument. Absolute path to input audio file.</param>
        /// <param name="accessKey">AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).</param>
        /// <param name="modelPath">Absolute path to the file containing model parameters. If not set it will be set to the default location.</param>
        /// <param name="enableAutomaticPunctuation">
        /// Set to `true` to enable automatic punctuation insertion.
        /// </param>
        /// </param>
        public static void RunDemo(
            string accessKey,
            string inputAudioPath,
            string modelPath,
            bool enableAutomaticPunctuation)
        {
            // init Cheetah speech-to-text engine
            using (Cheetah cheetah = Cheetah.Create(
                accessKey: accessKey,
                modelPath: modelPath,
                enableAutomaticPunctuation: enableAutomaticPunctuation))
            {

                using (BinaryReader reader = new BinaryReader(File.Open(inputAudioPath, FileMode.Open)))
                {
                    ValidateWavFile(reader, cheetah.SampleRate, 16, out short numChannels);

                    short[] cheetahFrame = new short[cheetah.FrameLength];
                    int frameIndex = 0;

                    while (reader.BaseStream.Position != reader.BaseStream.Length)
                    {
                        cheetahFrame[frameIndex++] = reader.ReadInt16();

                        if (frameIndex == cheetahFrame.Length)
                        {
                            try
                            {
                                CheetahTranscript transcriptObj = cheetah.Process(cheetahFrame);
                                if (!string.IsNullOrEmpty(transcriptObj.Transcript))
                                {
                                    Console.Write(transcriptObj.Transcript);
                                }
                            }
                            catch (CheetahActivationLimitException)
                            {
                                cheetah.Dispose();
                                Console.WriteLine($"AccessKey '{accessKey}' has reached its processing limit.");
                            }

                            frameIndex = 0;
                        }

                        // skip right channel
                        if (numChannels == 2)
                        {
                            reader.ReadInt16();
                        }
                    }
                    CheetahTranscript finalTranscriptObj = cheetah.Flush();
                    string transcript = finalTranscriptObj.Transcript;
                    if (!string.IsNullOrEmpty(transcript))
                    {
                        Console.WriteLine(transcript);
                    }
                }
            }
        }


        /// <summary>
        ///  Reads RIFF header of a WAV file and validates its properties against Picovoice audio processing requirements
        /// </summary>
        /// <param name="reader">WAV file stream reader</param>
        /// <param name="requiredSampleRate">Required sample rate in Hz</param>     
        /// <param name="requiredBitDepth">Required number of bits per sample</param>             
        /// <param name="numChannels">Number of channels can be returned by function</param>
        public static void ValidateWavFile(BinaryReader reader, int requiredSampleRate, short requiredBitDepth, out short numChannels)
        {
            byte[] riffHeader = reader?.ReadBytes(44);

            int riff = BitConverter.ToInt32(riffHeader, 0);
            int wave = BitConverter.ToInt32(riffHeader, 8);
            if (riff != BitConverter.ToInt32(Encoding.UTF8.GetBytes("RIFF"), 0) ||
                wave != BitConverter.ToInt32(Encoding.UTF8.GetBytes("WAVE"), 0))
            {
                throw new ArgumentException("input_audio_path", $"Invalid input audio file format. Input file must be a {requiredSampleRate}kHz, 16-bit WAV file.");
            }

            numChannels = BitConverter.ToInt16(riffHeader, 22);
            int sampleRate = BitConverter.ToInt32(riffHeader, 24);
            short bitDepth = BitConverter.ToInt16(riffHeader, 34);
            if (sampleRate != requiredSampleRate || bitDepth != requiredBitDepth)
            {
                throw new ArgumentException("input_audio_path", $"Invalid input audio file format. Input file must be a {requiredSampleRate}Hz, 16-bit WAV file.");
            }

            if (numChannels == 2)
            {
                Console.WriteLine("Picovoice processes single-channel audio but stereo file is provided. Processing left channel only.");
            }
        }

        public static void Main(string[] args)
        {
            AppDomain.CurrentDomain.UnhandledException += OnUnhandledException;
            if (args.Length == 0)
            {
                Console.WriteLine(HELP_STR);
                Console.Read();
                return;
            }

            string inputAudioPath = null;
            string accessKey = null;
            string modelPath = null;
            bool enableAutomaticPunctuation = true;
            bool showHelp = false;

            // parse command line arguments
            int argIndex = 0;
            while (argIndex < args.Length)
            {
                if (args[argIndex] == "--input_audio_path")
                {
                    if (++argIndex < args.Length)
                    {
                        inputAudioPath = args[argIndex++];
                    }
                }
                else if (args[argIndex] == "--access_key")
                {
                    if (++argIndex < args.Length)
                    {
                        accessKey = args[argIndex++];
                    }
                }
                else if (args[argIndex] == "--model_path")
                {
                    if (++argIndex < args.Length)
                    {
                        modelPath = args[argIndex++];
                    }
                }
                else if (args[argIndex] == "--disable_automatic_punctuation")
                {
                    enableAutomaticPunctuation = false;
                    argIndex++;
                }
                else if (args[argIndex] == "-h" || args[argIndex] == "--help")
                {
                    showHelp = true;
                    argIndex++;
                }
                else
                {
                    argIndex++;
                }
            }

            // print help text and exit
            if (showHelp)
            {
                Console.WriteLine(HELP_STR);
                Console.Read();
                return;
            }

            // argument validation
            if (string.IsNullOrEmpty(inputAudioPath))
            {
                throw new ArgumentNullException("input_audio_path");
            }
            if (!File.Exists(inputAudioPath))
            {
                throw new ArgumentException($"Audio file at path {inputAudioPath} does not exist", "--input_audio_path");
            }

            RunDemo(
                accessKey,
                inputAudioPath,
                modelPath,
                enableAutomaticPunctuation);
        }

        private static void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            Console.WriteLine(e.ExceptionObject.ToString());
            Console.Read();
            Environment.Exit(1);
        }

        private static readonly string HELP_STR = "Available options: \n" +
            "\t--input_audio_path (required): Absolute path to input audio file.\n" +
            "\t--access_key (required): AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)\n" +
            "\t--model_path: Absolute path to the file containing model parameters.\n" +
            "\t--disable_automatic_punctuation: Disable automatic punctuation.\n";

    }
}