/*
    Copyright 2022-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

use std::io::stdout;
use std::io::Write;
use std::sync::atomic::{AtomicBool, Ordering};

use cheetah::CheetahBuilder;
use clap::{App, Arg, ArgGroup};
use pv_recorder::PvRecorderBuilder;

static RECORDING: AtomicBool = AtomicBool::new(false);

fn cheetah_demo(
    audio_device_index: i32,
    access_key: &str,
    model_path: Option<&str>,
    endpoint_duration_sec: f32,
    enable_automatic_punctuation: bool,
) {
    let mut cheetah_builder = CheetahBuilder::new();

    if let Some(model_path) = model_path {
        cheetah_builder.model_path(model_path);
    }

    let cheetah = cheetah_builder
        .enable_automatic_punctuation(enable_automatic_punctuation)
        .endpoint_duration_sec(endpoint_duration_sec)
        .access_key(access_key)
        .init()
        .expect("Failed to create Cheetah");

    let recorder = PvRecorderBuilder::new(cheetah.frame_length() as i32)
        .device_index(audio_device_index)
        .init()
        .expect("Failed to initialize pvrecorder");

    ctrlc::set_handler(|| {
        RECORDING.store(false, Ordering::SeqCst);
    })
    .expect("Unable to setup signal handler");

    println!("Cheetah version : {}", cheetah.version());

    RECORDING.store(true, Ordering::SeqCst);
    recorder.start().expect("Failed to start audio recording");
    while RECORDING.load(Ordering::SeqCst) {
        let frame = recorder.read().expect("Failed to read audio frame");
        let partial_transcript = cheetah.process(&frame).unwrap();
        print!("{}", partial_transcript.transcript);
        stdout().flush().expect("Failed to flush");
        if partial_transcript.is_endpoint {
            let final_transcript = cheetah.flush().unwrap();
            println!("{}", final_transcript.transcript);
        }
    }

    println!();
    recorder.stop().expect("Failed to stop audio recording");
}

fn show_audio_devices() {
    let audio_devices = PvRecorderBuilder::default().get_available_devices();
    match audio_devices {
        Ok(audio_devices) => {
            for (idx, device) in audio_devices.iter().enumerate() {
                println!("index: {}, device name: {:?}", idx, device);
            }
        }
        Err(err) => panic!("Failed to get audio devices: {}", err),
    };
}

fn main() {
    let matches = App::new("Picovoice Cheetah Rust Mic Demo")
        .group(
            ArgGroup::with_name("actions_group")
                .arg("access_key")
                .arg("show_audio_devices")
                .required(true)
                .multiple(true),
        )
        .arg(
            Arg::with_name("access_key")
                .long("access_key")
                .short('a')
                .value_name("ACCESS_KEY")
                .help("AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)")
                .takes_value(true),
        )
        .arg(
            Arg::with_name("model_path")
                .long("model_path")
                .short('m')
                .value_name("PATH")
                .help("Path to the file containing model parameter.")
                .takes_value(true),
        )
        .arg(
            Arg::with_name("endpoint_duration_sec")
                .long("endpoint_duration_sec")
                .short('e')
                .value_name("ENDPOINT_DURATION")
                .help("Duration of endpoint in seconds. A speech endpoint is detected when there is a segment. Set to `0` to disable endpoint detection.")
                .takes_value(true)
                .default_value("0.0")
        )
        .arg(
            Arg::with_name("disable_automatic_punctuation")
                .long("disable_automatic_punctuation")
                .short('d')
                .help("Set to disable automatic punctuation insertion."),
        )
        .arg(
            Arg::with_name("audio_device_index")
                .long("audio_device_index")
                .short('i')
                .value_name("INDEX")
                .help("Index of input audio device.")
                .takes_value(true)
                .default_value("-1"),
        )
        .arg(
            Arg::with_name("show_audio_devices")
                .long("show_audio_devices")
                .short('s'),
        )
        .get_matches();

    if matches.is_present("show_audio_devices") {
        return show_audio_devices();
    }

    let audio_device_index = matches
        .value_of("audio_device_index")
        .unwrap()
        .parse()
        .unwrap();

    let access_key = matches
        .value_of("access_key")
        .expect("AccessKey is REQUIRED for Cheetah operation");

    let model_path = matches.value_of("model_path");

    let endpoint_duration_sec = matches
        .value_of("endpoint_duration_sec")
        .unwrap()
        .parse()
        .unwrap();

    let enable_automatic_punctuation = !matches.contains_id("disable_automatic_punctuation");

    cheetah_demo(
        audio_device_index,
        access_key,
        model_path,
        endpoint_duration_sec,
        enable_automatic_punctuation,
    );
}
