/*
    Copyright 2022-2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

using System;

using Pv;

namespace CheetahDemo
{
    /// <summary>
    /// Microphone Demo for Cheetah Speech-to-Text engine. It creates an input audio stream from a microphone. 
    /// </summary>
    public class MicDemo
    {

        /// <summary>
        /// Creates an input audio stream and instantiates an instance of Cheetah object.
        /// </summary>
        /// <param name="accessKey">AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).</param>
        /// <param name="modelPath">Absolute path to the file containing model parameters. If not set it will be set to the default location.</param>  
        /// <param name="device">
        /// String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
        /// suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU device. To select a specific
        /// GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the target GPU. If set to
        /// `cpu`, the engine will run on the CPU with the default number of threads. To specify the number of threads, set this
        /// argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}` is the desired number of threads.
        /// </param>
        /// <param name="endpointDurationSec">
        /// Duration of endpoint in seconds. A speech endpoint is detected when there is a segment of audio(with a duration specified herein) after 
        /// an utterance without any speech in it. Set to `0` to disable
        /// </param>
        /// <param name="enableAutomaticPunctuation">
        /// Set to `true` to enable automatic punctuation insertion.
        /// </param>
        /// <param name="audioDeviceIndex">Optional argument. If provided, audio is recorded from this input device. Otherwise, the default audio input device is used.</param>        
        public static void RunDemo(
            string accessKey,
            string modelPath,
            string device,
            float endpointDurationSec,
            bool enableAutomaticPunctuation,
            int audioDeviceIndex)
        {

            using (Cheetah cheetah = Cheetah.Create(
                accessKey: accessKey,
                modelPath: modelPath,
                device: device,
                endpointDurationSec: endpointDurationSec,
                enableAutomaticPunctuation: enableAutomaticPunctuation))
            {

                // create recorder
                using (PvRecorder recorder = PvRecorder.Create(cheetah.FrameLength, audioDeviceIndex))
                {
                    Console.WriteLine($"Using device: {recorder.SelectedDevice}");
                    Console.CancelKeyPress += delegate (object sender, ConsoleCancelEventArgs e)
                    {
                        e.Cancel = true;
                        recorder.Stop();
                        Console.WriteLine("Stopping...");
                    };


                    recorder.Start();
                    Console.WriteLine(">>> Press `CTRL+C` to exit:\n");

                    try
                    {
                        while (recorder.IsRecording)
                        {
                            short[] frame = recorder.Read();

                            CheetahTranscript result = cheetah.Process(frame);
                            if (!string.IsNullOrEmpty(result.Transcript))
                            {
                                Console.Write(result.Transcript);
                            }
                            if (result.IsEndpoint)
                            {
                                CheetahTranscript finalTranscriptObj = cheetah.Flush();
                                Console.WriteLine(finalTranscriptObj.Transcript);
                            }

                        }
                    }
                    catch (CheetahActivationLimitException)
                    {
                        Console.WriteLine($"AccessKey '{accessKey}' has reached its processing limit.");
                    }
                }
            }
        }

        /// <summary>
        /// Lists available audio input devices.
        /// </summary>
        public static void ShowAudioDevices()
        {
            string[] devices = PvRecorder.GetAvailableDevices();
            for (int i = 0; i < devices.Length; i++)
            {
                Console.WriteLine($"index: {i}, device name: {devices[i]}");
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

            string accessKey = null;
            string modelPath = null;
            string device = null;
            float endpointDurationSec = 3.0f;
            bool enableAutomaticPunctuation = true;
            int audioDeviceIndex = -1;
            bool showAudioDevices = false;
            bool showHelp = false;

            // parse command line arguments
            int argIndex = 0;
            while (argIndex < args.Length)
            {
                if (args[argIndex] == "--access_key")
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
                else if (args[argIndex] == "--device")
                {
                    if (++argIndex < args.Length)
                    {
                        device = args[argIndex++];
                    }
                }
                else if (args[argIndex] == "--endpoint_duration")
                {
                    argIndex++;
                    if (argIndex < args.Length && float.TryParse(args[argIndex], out endpointDurationSec))
                    {
                        argIndex++;
                    }
                }
                else if (args[argIndex] == "--disable_automatic_punctuation")
                {
                    enableAutomaticPunctuation = false;
                    argIndex++;
                }
                else if (args[argIndex] == "--show_audio_devices")
                {
                    showAudioDevices = true;
                    argIndex++;
                }
                else if (args[argIndex] == "--audio_device_index")
                {
                    if (++argIndex < args.Length && int.TryParse(args[argIndex], out int deviceIndex))
                    {
                        audioDeviceIndex = deviceIndex;
                        argIndex++;
                    }
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

            // print audio device info and exit
            if (showAudioDevices)
            {
                ShowAudioDevices();
                Console.Read();
                return;
            }

            // run demo with validated arguments
            RunDemo(
                accessKey,
                modelPath,
                device,
                endpointDurationSec,
                enableAutomaticPunctuation,
                audioDeviceIndex);
        }

        private static void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            Console.WriteLine(e.ExceptionObject.ToString());
            Console.Read();
            Environment.Exit(1);
        }

        private static readonly string HELP_STR = "Available options: \n " +
            "\t--access_key (required): AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)\n" +
            "\t--model_path: Absolute path to the file containing model parameters.\n" +
            "\t--device: Device to run inference on (`best`, `cpu:{num_threads}` or `gpu:{gpu_index}`). Default: automatically selects best device.\n" +
            "\t--endpoint_duration: Duration of endpoint in seconds. " +
            "A speech endpoint is detected when there is a chunk of audio (with a duration specified herein)" +
            " after an utterance without any speech in it. Set duration to 0 to disable this. Default is 3 seconds\n" +
            "\t--disable_automatic_punctuation: Disable automatic punctuation.\n" +
            "\t--audio_device_index: Index of input audio device.\n" +
            "\t--show_audio_devices: Print available recording devices.\n";
    }
}