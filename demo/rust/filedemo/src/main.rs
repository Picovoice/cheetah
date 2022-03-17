/*
    Copyright 2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

use std::io::{stdout, Write};
use std::path::PathBuf;
use itertools::Itertools;
use hound;

use clap::{App, Arg};
use cheetah::CheetahBuilder;

fn cheetah_demo(input_audio_path: PathBuf, access_key: &str, model_path: Option<&str>) {
    let mut cheetah_builder = CheetahBuilder::new(access_key);

    if let Some(model_path) = model_path {
        cheetah_builder.model_path(model_path);
    }

    let cheetah = cheetah_builder.init().expect("Failed to create Cheetah");

    let mut wav_reader = match hound::WavReader::open(input_audio_path.clone()) {
        Ok(reader) => reader,
        Err(err) => panic!(
            "Failed to open .wav audio file {}: {}",
            input_audio_path.display(),
            err
        ),
    };

    if wav_reader.spec().sample_rate != cheetah.sample_rate() {
        panic!(
            "Audio file should have the expected sample rate of {}, got {}",
            cheetah.sample_rate(),
            wav_reader.spec().sample_rate
        );
    }

    if wav_reader.spec().channels != 1u16 {
        panic!(
            "Audio file should have the expected number of channels 1, got {}",
            wav_reader.spec().channels
        );
    }

    if wav_reader.spec().bits_per_sample != 16u16
        || wav_reader.spec().sample_format != hound::SampleFormat::Int
    {
        panic!("WAV format should be in the signed 16 bit format",);
    }

    for frame in &wav_reader.samples().chunks(cheetah.frame_length() as usize) {
        let frame: Vec<i16> = frame.map(|s| s.unwrap()).collect_vec();

        if frame.len() == cheetah.frame_length() as usize {
            let partial_transcript = cheetah.process(&frame).unwrap();
            print!("{}", partial_transcript.transcript);
            stdout().flush().expect("Failed to flush");
        }
    }

    let final_transcript = cheetah.flush().unwrap();
    println!("{}", final_transcript.transcript);
}

fn main() {
    let matches = App::new("Picovoice Cheetah Rust File Demo")
        .arg(
            Arg::with_name("input_audio_path")
                .long("input_audio_path")
                .value_name("PATH")
                .help("Path to input audio file (mono, WAV, 16-bit, 16kHz).")
                .takes_value(true)
                .required(true),
        )
        .arg(
            Arg::with_name("access_key")
                .long("access_key")
                .value_name("ACCESS_KEY")
                .help("AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)")
                .takes_value(true)
                .required(true),
        )
        .arg(
            Arg::with_name("model_path")
                .long("model_path")
                .value_name("PATH")
                .help("Path to the file containing model parameter.")
                .takes_value(true),
        )
        .get_matches();

    let input_audio_path = PathBuf::from(matches.value_of("input_audio_path").unwrap());

    let model_path = matches.value_of("model_path");

    let access_key = matches
        .value_of("access_key")
        .expect("AccessKey is REQUIRED for Cheetah operation");

    cheetah_demo(input_audio_path, access_key, model_path);
}
