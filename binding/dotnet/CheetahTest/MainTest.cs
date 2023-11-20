/*
    Copyright 2022-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;

using Fastenshtein;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Pv;

namespace CheetahTest
{
    [TestClass]
    public class MainTest
    {
        private static string ACCESS_KEY;

        private static readonly string _relativeDir = AppContext.BaseDirectory;

        private List<short> GetPcmFromFile(string audioFilePath, int expectedSampleRate)
        {
            List<short> data = new List<short>();
            using (BinaryReader reader = new BinaryReader(File.Open(audioFilePath, FileMode.Open)))
            {
                reader.ReadBytes(24); // skip over part of the header
                Assert.AreEqual(reader.ReadInt32(), expectedSampleRate, "Specified sample rate did not match test file.");
                reader.ReadBytes(16); // skip over the rest of the header

                while (reader.BaseStream.Position != reader.BaseStream.Length)
                {
                    data.Add(reader.ReadInt16());
                }
            }

            return data;
        }

        public static IEnumerable<object[]> TestParameters
        {
            get
            {
                List<object[]> testParameters = new List<object[]>();

                string transcript = "Mr quilter is the apostle of the middle classes and we are glad to welcome his gospel";
                string transcriptWithPunctuation = "Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel.";

                testParameters.Add(new object[]
                {
                    "en",
                    "test.wav",
                    transcript,
                    transcriptWithPunctuation,
                    0.025f
                });

                return testParameters;
            }
        }

        static float GetErrorRate(string transcript, string referenceTranscript)
            => Levenshtein.Distance(transcript, referenceTranscript) / (float)referenceTranscript.Length;

        [ClassInitialize]
        public static void ClassInitialize(TestContext _)
        {
            ACCESS_KEY = Environment.GetEnvironmentVariable("ACCESS_KEY");
        }

        [TestMethod]
        public void TestVersion()
        {
            using (Cheetah cheetah = Cheetah.Create(ACCESS_KEY))
            {
                Assert.IsFalse(string.IsNullOrWhiteSpace(cheetah?.Version), "Cheetah did not return a valid version number.");
            }
        }

        [TestMethod]
        public void TestSampleRate()
        {
            using (Cheetah cheetah = Cheetah.Create(ACCESS_KEY))
            {
                int num = 0;
                Assert.IsTrue(int.TryParse(cheetah.SampleRate.ToString(), out num), "Cheetah did not return a valid sample rate.");
            }
        }

        [TestMethod]
        public void TestFrameLength()
        {
            using (Cheetah cheetah = Cheetah.Create(ACCESS_KEY))
            {
                int num = 0;
                Assert.IsTrue(int.TryParse(cheetah.FrameLength.ToString(), out num), "Cheetah did not return a valid frame length.");
            }
        }

        [TestMethod]
        [DynamicData(nameof(TestParameters))]
        public void TestProcess(
            string language,
            string testAudioFile,
            string referenceTranscript,
            string _,
            float targetErrorRate)
        {
            using (Cheetah cheetah = Cheetah.Create(
                accessKey: ACCESS_KEY,
                endpointDurationSec: 0.2f,
                enableAutomaticPunctuation: false))
            {
                string testAudioPath = Path.Combine(_relativeDir, "resources/audio_samples", testAudioFile);
                List<short> pcm = GetPcmFromFile(testAudioPath, cheetah.SampleRate);

                int frameLen = cheetah.FrameLength;
                int framecount = (int)Math.Floor((float)(pcm.Count / frameLen));

                string transcript = "";
                bool isEndpoint = false;
                for (int i = 0; i < framecount; i++)
                {
                    int start = i * cheetah.FrameLength;
                    List<short> frame = pcm.GetRange(start, frameLen);
                    CheetahTranscript transcriptObj = cheetah.Process(frame.ToArray());
                    transcript += transcriptObj.Transcript;
                    isEndpoint = transcriptObj.IsEndpoint;
                }
                CheetahTranscript finalTranscriptObj = cheetah.Flush();
                transcript += finalTranscriptObj.Transcript;

                Assert.IsTrue(GetErrorRate(transcript, referenceTranscript) < targetErrorRate);
            }
        }

        [TestMethod]
        [DynamicData(nameof(TestParameters))]
        public void TestProcessWithPunctuation(
            string language,
            string testAudioFile,
            string _,
            string referenceTranscript,
            float targetErrorRate)
        {
            using (Cheetah cheetah = Cheetah.Create(
                accessKey: ACCESS_KEY,
                endpointDurationSec: 0.2f,
                enableAutomaticPunctuation: true))
            {
                string testAudioPath = Path.Combine(_relativeDir, "resources/audio_samples", testAudioFile);
                List<short> pcm = GetPcmFromFile(testAudioPath, cheetah.SampleRate);

                int frameLen = cheetah.FrameLength;
                int framecount = (int)Math.Floor((float)(pcm.Count / frameLen));

                string transcript = "";
                bool isEndpoint = false;
                for (int i = 0; i < framecount; i++)
                {
                    int start = i * cheetah.FrameLength;
                    List<short> frame = pcm.GetRange(start, frameLen);
                    CheetahTranscript transcriptObj = cheetah.Process(frame.ToArray());
                    transcript += transcriptObj.Transcript;
                    isEndpoint = transcriptObj.IsEndpoint;
                }
                CheetahTranscript finalTranscriptObj = cheetah.Flush();
                transcript += finalTranscriptObj.Transcript;

                Assert.IsTrue(GetErrorRate(transcript, referenceTranscript) < targetErrorRate);
            }
        }

        [TestMethod]
        [DynamicData(nameof(TestParameters))]
        public void TestCustomModel(
            string language,
            string testAudioFile,
            string referenceTranscript,
            string _,
            float targetErrorRate)
        {
            string testModelPath = Path.Combine(_relativeDir, "lib/common/cheetah_params.pv");
            using (Cheetah cheetah = Cheetah.Create(
                accessKey: ACCESS_KEY,
                modelPath: testModelPath,
                enableAutomaticPunctuation: false))
            {
                string testAudioPath = Path.Combine(_relativeDir, "resources/audio_samples", testAudioFile);
                List<short> pcm = GetPcmFromFile(testAudioPath, cheetah.SampleRate);

                int frameLen = cheetah.FrameLength;
                int framecount = (int)Math.Floor((float)(pcm.Count / frameLen));

                string transcript = "";
                for (int i = 0; i < framecount; i++)
                {
                    int start = i * cheetah.FrameLength;
                    List<short> frame = pcm.GetRange(start, frameLen);
                    CheetahTranscript transcriptObj = cheetah.Process(frame.ToArray());
                    transcript += transcriptObj.Transcript;
                }
                CheetahTranscript finalTranscriptObj = cheetah.Flush();
                transcript += finalTranscriptObj.Transcript;

                Assert.IsTrue(GetErrorRate(transcript, referenceTranscript) < targetErrorRate);
            }
        }

        [TestMethod]
        public void TestMessageStack()
        {
            string modelPath = Path.Combine(_relativeDir, "lib/common/cheetah_params.pv");

            Cheetah c;
            string[] messageList = new string[] { };

            try
            {
                c = Cheetah.Create(
                    accessKey: "invalid",
                    modelPath: modelPath,
                    enableAutomaticPunctuation: true);
                Assert.IsNull(c);
                c.Dispose();
            }
            catch (CheetahException e)
            {
                messageList = e.MessageStack;
            }

            Assert.IsTrue(0 < messageList.Length);
            Assert.IsTrue(messageList.Length < 8);

            try
            {
                c = Cheetah.Create(
                    accessKey: "invalid",
                    modelPath: modelPath,
                    enableAutomaticPunctuation: true);
                Assert.IsNull(c);
                c.Dispose();
            }
            catch (CheetahException e)
            {
                for (int i = 0; i < messageList.Length; i++)
                {
                    Assert.AreEqual(messageList[i], e.MessageStack[i]);
                }
            }
        }

        [TestMethod]
        public void TestProcessFlushMessageStack()
        {
            string modelPath = Path.Combine(_relativeDir, "lib/common/cheetah_params.pv");

            Cheetah c = Cheetah.Create(
                accessKey: ACCESS_KEY,
                modelPath: modelPath,
                enableAutomaticPunctuation: false);
            short[] testPcm = new short[c.FrameLength];

            var obj = typeof(Cheetah).GetField("_libraryPointer", BindingFlags.NonPublic | BindingFlags.Instance);
            IntPtr address = (IntPtr)obj.GetValue(c);
            obj.SetValue(c, IntPtr.Zero);

            try
            {
                CheetahTranscript res = c.Process(testPcm);
                Assert.IsTrue(res.Transcript.Length == -1);
            }
            catch (CheetahException e)
            {
                Assert.IsTrue(0 < e.MessageStack.Length);
                Assert.IsTrue(e.MessageStack.Length < 8);
            }

            try
            {
                CheetahTranscript res = c.Flush();
                Assert.IsTrue(res.Transcript.Length == -1);
            }
            catch (CheetahException e)
            {
                Assert.IsTrue(0 < e.MessageStack.Length);
                Assert.IsTrue(e.MessageStack.Length < 8);
            }

            obj.SetValue(c, address);
            c.Dispose();
        }
    }
}