/*
    Copyright 2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

using System;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;

namespace Pv
{
    /// <summary>
    /// Status codes returned by Cheetah library
    /// </summary>
    public enum PvStatus
    {
        SUCCESS = 0,
        OUT_OF_MEMORY = 1,
        IO_ERROR = 2,
        INVALID_ARGUMENT = 3,
        STOP_ITERATION = 4,
        KEY_ERROR = 5,
        INVALID_STATE = 6,
        RUNTIME_ERROR = 7,
        ACTIVATION_ERROR = 8,
        ACTIVATION_LIMIT_REACHED = 9,
        ACTIVATION_THROTTLED = 10,
        ACTIVATION_REFUSED = 11
    }

    /// <summary>
    /// .NET binding for Cheetah Speech-to-Text Engine.
    /// </summary>
    public class Cheetah : IDisposable
    {
        private const string LIBRARY = "libpv_cheetah";
        private IntPtr _libraryPointer = IntPtr.Zero;

        public static readonly string DEFAULT_MODEL_PATH;

        static Cheetah()
        {
#if NETCOREAPP3_1
            NativeLibrary.SetDllImportResolver(typeof(Cheetah).Assembly, ImportResolver);
#endif
            DEFAULT_MODEL_PATH = Utils.PvModelPath();
        }

#if NETCOREAPP3_1
        private static IntPtr ImportResolver(string libraryName, Assembly assembly, DllImportSearchPath? searchPath)
        {
            IntPtr libHandle = IntPtr.Zero;
            NativeLibrary.TryLoad(Utils.PvLibraryPath(libraryName), out libHandle);
            return libHandle;
        }
#endif
        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern PvStatus pv_cheetah_init(
            string accessKey,
            string modelPath,
            float endpointDurationSec,
            out IntPtr handle);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern Int32 pv_sample_rate();

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern void pv_cheetah_delete(IntPtr handle);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern PvStatus pv_cheetah_process(
            IntPtr handle,
            Int16[] pcm,
            out IntPtr transcriptPtr,
            out bool isEndpoint);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern PvStatus pv_cheetah_flush(
            IntPtr handle,
            out IntPtr transcriptPtr);

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern IntPtr pv_cheetah_version();

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern Int32 pv_cheetah_frame_length();

        [DllImport(LIBRARY, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        private static extern void pv_free(IntPtr memoryPtr);

        /// <summary>
        /// Factory method for Cheetah Speech-to-Text engine.
        /// </summary>
        /// <param name="accessKey">AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).</param>
        /// <param name="modelPath">
        /// Absolute path to the file containing model parameters. If not set it will be set to the 
        /// default location.
        /// </param>
        /// <param name="endpointDurationSec">
        /// Duration of endpoint in seconds. A speech endpoint is detected when there is a segment of audio(with a duration specified herein) after 
        /// an utterance without any speech in it. Set to `0` to disable
        /// </param>
        /// <returns>An instance of Cheetah Speech-to-Text engine.</returns>                             
        public static Cheetah Create(string accessKey, string modelPath = null, float endpointDurationSec = 1.0f)
        {
            return new Cheetah(accessKey, modelPath ?? DEFAULT_MODEL_PATH, endpointDurationSec);
        }

        /// <summary>
        /// Creates an instance of the Cheetah Speech-to-Text engine.
        /// </summary>
        /// <param name="accessKey">AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).</param>
        /// <param name="modelPath">
        /// Absolute path to the file containing model parameters. If not set it will be set to the 
        /// default location.
        /// </param>   
        /// <param name="endpointDurationSec">
        /// Duration of endpoint in seconds. A speech endpoint is detected when there is a segment of audio(with a duration specified herein) after 
        /// an utterance without any speech in it.Set to `0` to disable
        /// </param>
        private Cheetah(
            string accessKey,
            string modelPath,
            float endpointDurationSec = 1.0f)
        {
            if (string.IsNullOrEmpty(accessKey))
            {
                throw new CheetahInvalidArgumentException("No AccessKey provided to Cheetah");
            }

            if (!File.Exists(modelPath))
            {
                throw new CheetahIOException($"Couldn't find model file at '{modelPath}'");
            }

            if (endpointDurationSec < 0)
            {
                throw new CheetahInvalidArgumentException("`endpointDurationSec` must be either `0` or a positive number");
            }

            PvStatus status = pv_cheetah_init(
                accessKey,
                modelPath,
                endpointDurationSec,
                out _libraryPointer);
            if (status != PvStatus.SUCCESS)
            {
                throw PvStatusToException(status);
            }

            Version = Marshal.PtrToStringAnsi(pv_cheetah_version());
            SampleRate = pv_sample_rate();
            FrameLength = pv_cheetah_frame_length();
        }

        /// <summary>
        /// Processes a given audio data and returns its transcription.
        /// </summary>
        /// <param name="pcm">
        /// Audio data. A frame of audio samples. The number of samples per frame can be attained by calling `pv_cheetah_frame_length()`. 
        /// The incoming audio needs to have a sample rate equal to `pv_sample_rate()` and be 16-bit linearly-encoded.Cheetah operates on single-channel audio.
        /// </param>
        /// <returns>
        /// Inferred transcription.
        /// </returns>
        public CheetahTranscript Process(Int16[] pcm)
        {
            if (pcm.Length == 0 | pcm == null)
            {
                throw new CheetahInvalidArgumentException("Input audio frame is empty");
            }

            if (pcm.Length != FrameLength)
            {
                throw new CheetahInvalidArgumentException($"Input audio frame size ({pcm.Length}) was not the size specified by Cheetah engine ({FrameLength}). " +
                    $"Use cheetah.FrameLength to get the correct size.");
            }

            IntPtr transcriptPtr = IntPtr.Zero;
            bool isEndpoint = false;
            PvStatus status = pv_cheetah_process(_libraryPointer, pcm, out transcriptPtr, out isEndpoint);
            if (status != PvStatus.SUCCESS)
            {
                throw PvStatusToException(status, "Cheetah failed to process the audio frame.");
            }

            string transcript = Marshal.PtrToStringAnsi(transcriptPtr);
            pv_free(transcriptPtr);
            return new CheetahTranscript(transcript, isEndpoint);
        }

        /// <summary>
        ///  Marks the end of the audio stream, flushes internal state of the object, and returns any remaining transcript.
        /// </summary>
        /// <returns>
        /// Inferred transcription.
        /// </returns>
        public string Flush()
        {
            IntPtr transcriptPtr = IntPtr.Zero;
            PvStatus status = pv_cheetah_flush(_libraryPointer, out transcriptPtr);
            if (status != PvStatus.SUCCESS)
            {
                throw PvStatusToException(status, "Cheetah failed to process the audio frame.");
            }

            string transcript = Marshal.PtrToStringAnsi(transcriptPtr);
            pv_free(transcriptPtr);
            return transcript;
        }

        /// <summary>
        /// Gets the version number of the Cheetah library.
        /// </summary>
        /// <returns>Version of Cheetah</returns>
        public string Version { get; private set; }

        /// <summary>
        /// Get the required number of audio samples per frame.
        /// </summary>
        /// <returns>Required number of audio samples per frame.</returns>
        public Int32 FrameLength { get; private set; }

        /// <summary>
        /// Get the audio sample rate required by Cheetah
        /// </summary>
        /// <returns>Required sample rate.</returns>
        public Int32 SampleRate { get; private set; }

        /// <summary>
        /// Coverts status codes to relavent .NET exceptions
        /// </summary>
        /// <param name="status">Picovoice library status code.</param>
        /// <returns>.NET exception</returns>
        private static Exception PvStatusToException(PvStatus status, string message = "")
        {
            switch (status)
            {
                case PvStatus.OUT_OF_MEMORY:
                    return new CheetahMemoryException(message);
                case PvStatus.IO_ERROR:
                    return new CheetahIOException(message);
                case PvStatus.INVALID_ARGUMENT:
                    return new CheetahInvalidArgumentException(message);
                case PvStatus.STOP_ITERATION:
                    return new CheetahStopIterationException(message);
                case PvStatus.KEY_ERROR:
                    return new CheetahKeyException(message);
                case PvStatus.INVALID_STATE:
                    return new CheetahInvalidStateException(message);
                case PvStatus.RUNTIME_ERROR:
                    return new CheetahRuntimeException(message);
                case PvStatus.ACTIVATION_ERROR:
                    return new CheetahActivationException(message);
                case PvStatus.ACTIVATION_LIMIT_REACHED:
                    return new CheetahActivationLimitException(message);
                case PvStatus.ACTIVATION_THROTTLED:
                    return new CheetahActivationThrottledException(message);
                case PvStatus.ACTIVATION_REFUSED:
                    return new CheetahActivationRefusedException(message);
                default:
                    return new CheetahException("Unmapped error code returned from Cheetah.");
            }
        }

        /// <summary>
        /// Frees memory that was allocated for Cheetah
        /// </summary>
        public void Dispose()
        {
            if (_libraryPointer != IntPtr.Zero)
            {
                pv_cheetah_delete(_libraryPointer);
                _libraryPointer = IntPtr.Zero;

                // ensures finalizer doesn't trigger if already manually disposed
                GC.SuppressFinalize(this);
            }
        }

        ~Cheetah()
        {
            Dispose();
        }
    }
}
