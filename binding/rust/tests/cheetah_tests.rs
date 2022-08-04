/*
    Copyright 2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#[cfg(test)]
mod tests {
    use itertools::Itertools;
    use rodio::{source::Source, Decoder};
    use std::env;
    use std::fs::File;
    use std::io::BufReader;

    use cheetah::CheetahBuilder;

    #[test]
    fn test_process() {
        let access_key = env::var("PV_ACCESS_KEY")
            .expect("Pass the AccessKey in using the PV_ACCESS_KEY env variable");

        let audio_path = format!(
            "{}{}",
            env!("CARGO_MANIFEST_DIR"),
            "/../../resources/audio_samples/test.wav",
        );

        let audio_file = BufReader::new(File::open(&audio_path).expect(&audio_path));
        let source = Decoder::new(audio_file).unwrap();

        let cheetah = CheetahBuilder::new()
            .access_key(access_key)
            .init()
            .expect("Unable to create Cheetah");

        assert_eq!(cheetah.sample_rate(), source.sample_rate());

        let mut result = String::new();
        for frame in &source.chunks(cheetah.frame_length() as usize) {
            let frame = frame.collect_vec();
            if frame.len() == cheetah.frame_length() as usize {
                let partial_transcript = cheetah.process(&frame).unwrap();
                result = format!("{}{}", result, partial_transcript.transcript);
            }
        }

        let final_transcript = cheetah.flush().unwrap();
        result = format!("{}{}", result, final_transcript.transcript);

        assert_eq!(
            result,
            "Mr quilter is the apostle of the middle classes and we are glad to welcome his gospel"
        )
    }

    #[test]
    fn test_version() {
        let access_key = env::var("PV_ACCESS_KEY")
            .expect("Pass the AccessKey in using the PV_ACCESS_KEY env variable");

        let cheetah = CheetahBuilder::new()
            .access_key(access_key)
            .init()
            .expect("Unable to create Cheetah");

        assert_ne!(cheetah.version(), "")
    }
}
