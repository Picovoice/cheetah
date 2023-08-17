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

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Pv;

namespace CheetahTest
{
    [TestClass]
    public class MainTest
    {
        private static string ACCESS_KEY;

        private static readonly string _relativeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);

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

        [ClassInitialize]
        public static void ClassInitialize(TestContext _)
        {
            ACCESS_KEY = Environment.GetEnvironmentVariable("ACCESS_KEY");
        }

        [TestMethod]
        public void TestVersion()
        {
            using (Cheetah cheetah = Cheetah.Create(ACCESS_KEY)) {
                Assert.IsFalse(string.IsNullOrWhiteSpace(cheetah?.Version), "Cheetah did not return a valid version number.");
            }
        }

        [TestMethod]
        public void TestSampleRate()
        {
            using (Cheetah cheetah = Cheetah.Create(ACCESS_KEY)) {
                int num = 0;
                Assert.IsTrue(int.TryParse(cheetah.SampleRate.ToString(), out num), "Cheetah did not return a valid sample rate.");
            }
        }

        [TestMethod]
        public void TestFrameLength()
        {
            using (Cheetah cheetah = Cheetah.Create(ACCESS_KEY)) {
                int num = 0;
                Assert.IsTrue(int.TryParse(cheetah.FrameLength.ToString(), out num), "Cheetah did not return a valid frame length.");
            }
        }

        [TestMethod]
        [DataRow(true, "Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel.")]
        [DataRow(false, "Mr quilter is the apostle of the middle classes and we are glad to welcome his gospel")]
        public void TestProcess(bool enableAutomaticPunctuation, string expectedTranscript)
        {
            using (Cheetah cheetah = Cheetah.Create(
                accessKey: ACCESS_KEY,
                endpointDurationSec: 0.2f,
                enableAutomaticPunctuation: enableAutomaticPunctuation)) {
                string testAudioPath = Path.Combine(_relativeDir, "resources/audio_samples/test.wav");
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
                Assert.AreEqual(transcript, expectedTranscript);
                Assert.IsTrue(isEndpoint);
            }
        }

        [TestMethod]
        [DataRow(true, "Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel.")]
        [DataRow(false, "Mr quilter is the apostle of the middle classes and we are glad to welcome his gospel")]
        public void TestCustomModel(bool enableAutomaticPunctuation, string expectedTranscript)
        {
            string testModelPath = Path.Combine(_relativeDir, "lib/common/cheetah_params.pv");
            using (Cheetah cheetah = Cheetah.Create(
                accessKey: ACCESS_KEY,
                modelPath: testModelPath,
                enableAutomaticPunctuation: enableAutomaticPunctuation)) {
                string testAudioPath = Path.Combine(_relativeDir, "resources/audio_samples/test.wav");
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
                Assert.AreEqual(transcript, expectedTranscript);
            }
        }
    }
}