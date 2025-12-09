/*
    Copyright 2022-2025 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Newtonsoft.Json.Linq;

using Pv;

namespace CheetahTest
{
    [TestClass]
    public class MainTest
    {
        private static string _accessKey;
        private static string _device;
        private static readonly string ROOT_DIR = Path.Combine(AppContext.BaseDirectory, "../../../../../..");

        [ClassInitialize]
        public static void ClassInitialize(TestContext _)
        {
            _accessKey = Environment.GetEnvironmentVariable("ACCESS_KEY");
            _device = Environment.GetEnvironmentVariable("DEVICE");
        }

        [Serializable]
        private class TestDataJson
        {
            public TestsJson tests { get; set; }
        }

        [Serializable]
        private class TestsJson
        {
            public LanguageTestJson[] language_tests { get; set; }
        }

        [Serializable]
        private class LanguageTestJson
        {
            public string language { get; set; }

            public string[] models { get; set; }

            public string audio_file { get; set; }

            public string transcript { get; set; }

            public string[] punctuations { get; set; }

            public float error_rate { get; set; }
        }

        private static TestDataJson LoadJsonTestData()
        {
            string content = File.ReadAllText(Path.Combine(ROOT_DIR, "resources/.test/test_data.json"));
            return JObject.Parse(content).ToObject<TestDataJson>();
        }

        private static IEnumerable<object[]> LanguageTestParameters
        {
            get
            {
                TestDataJson testData = LoadJsonTestData();
                return testData.tests.language_tests
                    .SelectMany(x => x.models.Select(model => new object[] {
                        model,
                        x.audio_file,
                        x.transcript,
                        x.punctuations,
                        x.error_rate,
                    }));
            }
        }

        private static int LevenshteinDistance(string[] transcriptWords, string[] referenceWords)
        {
            int referenceWordsLen = referenceWords.Length;
            int transcriptWordsLen = transcriptWords.Length;

            int[,] dp = new int[referenceWordsLen + 1, transcriptWordsLen + 1];

            for (int i = 0; i <= referenceWordsLen; i++) dp[i, 0] = i;
            for (int j = 0; j <= transcriptWordsLen; j++) dp[0, j] = j;

            for (int i = 1; i <= referenceWordsLen; i++)
            {
                for (int j = 1; j <= transcriptWordsLen; j++)
                {
                    int cost = referenceWords[i - 1].ToUpper() == transcriptWords[j - 1].ToUpper() ? 0 : 1;

                    dp[i, j] = Math.Min(
                        Math.Min(dp[i - 1, j] + 1, dp[i, j - 1] + 1),
                        dp[i - 1, j - 1] + cost
                    );
                }
            }

            return dp[referenceWordsLen, transcriptWordsLen];
        }

        private static double GetErrorRate(string transcript, string referenceTranscript)
        {
            string[] transcriptWords = transcript.Split(' ');
            string[] referenceTranscriptWords = referenceTranscript.Split(' ');

            int editDistance = LevenshteinDistance(transcriptWords, referenceTranscriptWords);
            return (double)editDistance / referenceTranscriptWords.Length;
        }

        private static string GetModelPath(string modelFile)
        {
            return Path.Combine(ROOT_DIR, "lib/common", modelFile);
        }

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

        [TestMethod]
        public void TestGetAvailableDevices()
        {
            string[] devices = Cheetah.GetAvailableDevices();
            Assert.IsTrue(devices.Length > 0);
            foreach (string device in devices)
            {
                Assert.IsFalse(string.IsNullOrEmpty(device));
            }
        }

        [TestMethod]
        public void TestVersion()
        {
            using (Cheetah cheetah = Cheetah.Create(_accessKey, device: _device))
            {
                Assert.IsFalse(string.IsNullOrWhiteSpace(cheetah?.Version), "Cheetah did not return a valid version number.");
            }
        }

        [TestMethod]
        public void TestSampleRate()
        {
            using (Cheetah cheetah = Cheetah.Create(_accessKey, device: _device))
            {
                int num = 0;
                Assert.IsTrue(int.TryParse(cheetah.SampleRate.ToString(), out num), "Cheetah did not return a valid sample rate.");
            }
        }

        [TestMethod]
        public void TestFrameLength()
        {
            using (Cheetah cheetah = Cheetah.Create(_accessKey, device: _device))
            {
                int num = 0;
                Assert.IsTrue(int.TryParse(cheetah.FrameLength.ToString(), out num), "Cheetah did not return a valid frame length.");
            }
        }

        [TestMethod]
        [DynamicData(nameof(LanguageTestParameters))]
        public void TestProcess(
            string modelFile,
            string testAudioFile,
            string referenceTranscript,
            string[] punctuations,
            float targetErrorRate)
        {
            using (Cheetah cheetah = Cheetah.Create(
                accessKey: _accessKey,
                modelPath: GetModelPath(modelFile),
                device: _device,
                endpointDurationSec: 0.2f,
                enableAutomaticPunctuation: false))
            {
                string testAudioPath = Path.Combine(ROOT_DIR, "resources/audio_samples", testAudioFile);
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

                string normalizedTranscript = referenceTranscript;
                foreach (string punctuation in punctuations)
                {
                    normalizedTranscript = normalizedTranscript.Replace(punctuation, "");
                }

                Assert.IsTrue(GetErrorRate(transcript, normalizedTranscript) <= targetErrorRate);
            }
        }

        [TestMethod]
        [DynamicData(nameof(LanguageTestParameters))]
        public void TestProcessWithPunctuation(
            string modelFile,
            string testAudioFile,
            string referenceTranscript,
            string[] _,
            float targetErrorRate)
        {
            using (Cheetah cheetah = Cheetah.Create(
                accessKey: _accessKey,
                modelPath: GetModelPath(modelFile),
                device: _device,
                endpointDurationSec: 0.2f,
                enableAutomaticPunctuation: true))
            {
                string testAudioPath = Path.Combine(ROOT_DIR, "resources/audio_samples", testAudioFile);
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

                Assert.IsTrue(GetErrorRate(transcript, referenceTranscript) <= targetErrorRate);
            }
        }

        [TestMethod]
        public void TestMessageStack()
        {
            string modelPath = GetModelPath("cheetah_params.pv");

            Cheetah c;
            string[] messageList = new string[] { };

            try
            {
                c = Cheetah.Create(
                    accessKey: "invalid",
                    modelPath: modelPath,
                    device: _device,
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
                    device: _device,
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
            string modelPath = GetModelPath("cheetah_params.pv");

            Cheetah c = Cheetah.Create(
                accessKey: _accessKey,
                modelPath: modelPath,
                device: _device,
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