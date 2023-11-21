/*
    Copyright 2022-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#[cfg(test)]
mod tests {
    use distance::*;
    use itertools::Itertools;
    use rodio::{source::Source, Decoder};
    use serde_json::{json, Value};
    use std::env;
    use std::fs::File;
    use std::io::BufReader;

    use cheetah::CheetahBuilder;

    fn load_test_data() -> Value {
        let test_json: Value = json!([{
            "language": "en",
            "transcript": "Mr quilter is the apostle of the middle classes and we are glad to welcome his gospel",
            "transcript_with_punctuation": "Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel.",
            "error_rate": 0.025,
            "audio_file": "test.wav"
        }]);
        test_json
    }

    fn character_error_rate(transcript: &str, expected_transcript: &str) -> f32 {
        let distance = levenshtein(transcript, expected_transcript);
        return distance as f32 / expected_transcript.len() as f32;
    }

    fn run_test_process(
        _: &str,
        transcript: &str,
        test_punctuation: bool,
        error_rate: f32,
        test_audio: &str,
    ) {
        let access_key = env::var("PV_ACCESS_KEY")
            .expect("Pass the AccessKey in using the PV_ACCESS_KEY env variable");

        let audio_path = format!(
            "{}{}{}",
            env!("CARGO_MANIFEST_DIR"),
            "/../../resources/audio_samples/",
            test_audio
        );

        let audio_file = BufReader::new(File::open(&audio_path).expect(&audio_path));
        let source = Decoder::new(audio_file).unwrap();

        let cheetah = CheetahBuilder::new()
            .access_key(access_key)
            .enable_automatic_punctuation(test_punctuation)
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

        assert!(character_error_rate(&result, &transcript) < error_rate);
    }

    #[test]
    fn test_process() {
        let test_json: Value = load_test_data();

        for t in test_json.as_array().unwrap() {
            let language = t["language"].as_str().unwrap();
            let transcript = t["transcript"].as_str().unwrap();
            let error_rate = t["error_rate"].as_f64().unwrap() as f32;

            let test_audio = t["audio_file"].as_str().unwrap();

            run_test_process(
                language,
                transcript,
                false,
                error_rate,
                &test_audio,
            );
        }
    }

    #[test]
    fn test_process_punctuation() {
        let test_json: Value = load_test_data();

        for t in test_json.as_array().unwrap() {
            let language = t["language"].as_str().unwrap();
            let transcript_with_punctuation = t["transcript_with_punctuation"].as_str().unwrap();
            let error_rate = t["error_rate"].as_f64().unwrap() as f32;

            let test_audio = t["audio_file"].as_str().unwrap();

            run_test_process(
                language,
                transcript_with_punctuation,
                true,
                error_rate,
                &test_audio,
            );
        }
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

    #[test]
    fn test_error_stack() {
        let mut error_stack = Vec::new();

        let res = CheetahBuilder::new()
            .access_key("invalid")
            .enable_automatic_punctuation(true)
            .init();
        if let Err(err) = res {
            error_stack = err.message_stack
        }

        assert!(0 < error_stack.len() && error_stack.len() <= 8);

        let res = CheetahBuilder::new()
            .access_key("invalid")
            .enable_automatic_punctuation(true)
            .init();
        if let Err(err) = res {
            assert_eq!(error_stack.len(), err.message_stack.len());
            for i in 0..error_stack.len() {
                assert_eq!(error_stack[i], err.message_stack[i])
            }
        }
    }
}
