/*
    Copyright 2022-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

use std::cmp::PartialEq;
use std::ffi::{CStr, CString};
use std::path::{Path, PathBuf};
use std::ptr::addr_of_mut;
use std::sync::Arc;

use libc::{c_char, c_float};
#[cfg(unix)]
use libloading::os::unix::Symbol as RawSymbol;
#[cfg(windows)]
use libloading::os::windows::Symbol as RawSymbol;
use libloading::{Library, Symbol};

use crate::util::{pathbuf_to_cstring, pv_library_path, pv_model_path};

#[repr(C)]
struct CCheetah {
    // Fields suggested by the Rustonomicon: https://doc.rust-lang.org/nomicon/ffi.html#representing-opaque-structs
    _data: [u8; 0],
    _marker: core::marker::PhantomData<(*mut u8, core::marker::PhantomPinned)>,
}

#[repr(C)]
#[derive(PartialEq, Clone, Debug)]
#[allow(non_camel_case_types)]
pub enum PvStatus {
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
    ACTIVATION_REFUSED = 11,
}

type PvCheetahInitFn = unsafe extern "C" fn(
    access_key: *const c_char,
    model_path: *const c_char,
    endpoint_duration_sec: c_float,
    enable_automatic_punctuation: bool,
    object: *mut *mut CCheetah,
) -> PvStatus;
type PvCheetahFrameLengthFn = unsafe extern "C" fn() -> i32;
type PvSampleRateFn = unsafe extern "C" fn() -> i32;
type PvCheetahVersionFn = unsafe extern "C" fn() -> *mut c_char;
type PvCheetahProcessFn = unsafe extern "C" fn(
    object: *mut CCheetah,
    pcm: *const i16,
    transcript: *mut *mut c_char,
    is_endpoint: *mut bool,
) -> PvStatus;
type PvCheetahFlushFn =
    unsafe extern "C" fn(object: *mut CCheetah, transcript: *mut *mut c_char) -> PvStatus;
type PvCheetahTranscriptDeleteFn = unsafe extern "C" fn(transcript: *mut c_char);
type PvCheetahDeleteFn = unsafe extern "C" fn(object: *mut CCheetah);
type PvGetErrorStackFn =
    unsafe extern "C" fn(message_stack: *mut *mut *mut c_char, message_stack_depth: *mut i32) -> PvStatus;
type PvFreeErrorStackFn = unsafe extern "C" fn(message_stack: *mut *mut c_char);
type PvSetSdkFn = unsafe extern "C" fn(sdk: *const c_char);

#[derive(Clone, Debug)]
pub enum CheetahErrorStatus {
    LibraryError(PvStatus),
    LibraryLoadError,
    FrameLengthError,
    ArgumentError,
}

#[derive(Clone, Debug)]
pub struct CheetahError {
    status: CheetahErrorStatus,
    pub message: String,
    pub message_stack: Vec<String>,
}

impl CheetahError {
    pub fn new(status: CheetahErrorStatus, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
            message_stack: Vec::new(),
        }
    }

    pub fn new_with_stack(
        status: CheetahErrorStatus,
        message: impl Into<String>,
        message_stack: impl Into<Vec<String>>
    ) -> Self {
        Self {
            status,
            message: message.into(),
            message_stack: message_stack.into(),
        }
    }
}

impl std::fmt::Display for CheetahError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> Result<(), std::fmt::Error> {
        let mut message_string = String::new();
        message_string.push_str(&format!("{} with status '{:?}'", self.message, self.status));

        if !self.message_stack.is_empty() {
            message_string.push(':');
            for x in 0..self.message_stack.len() {
                message_string.push_str(&format!("  [{}] {}\n", x, self.message_stack[x]))
            };
        }
        write!(f, "{}", message_string)
    }
}

impl std::error::Error for CheetahError {}

pub struct CheetahBuilder {
    access_key: String,
    model_path: PathBuf,
    library_path: PathBuf,
    endpoint_duration_sec: f32,
    enable_automatic_punctuation: bool,
}

impl Default for CheetahBuilder {
    fn default() -> Self {
        Self::new()
    }
}

impl CheetahBuilder {
    const DEFAULT_ENDPOINT_DURATION_SEC: f32 = 1.0;
    const DEFAULT_ENABLE_AUTOMATIC_PUNCTUATION: bool = false;

    pub fn new() -> Self {
        Self {
            access_key: String::from(""),
            model_path: pv_model_path(),
            library_path: pv_library_path(),
            endpoint_duration_sec: Self::DEFAULT_ENDPOINT_DURATION_SEC,
            enable_automatic_punctuation: Self::DEFAULT_ENABLE_AUTOMATIC_PUNCTUATION,
        }
    }

    pub fn access_key<S: Into<String>>(&mut self, access_key: S) -> &mut Self {
        self.access_key = access_key.into();
        self
    }

    pub fn model_path<P: Into<PathBuf>>(&mut self, model_path: P) -> &mut Self {
        self.model_path = model_path.into();
        self
    }

    pub fn library_path<P: Into<PathBuf>>(&mut self, library_path: P) -> &mut Self {
        self.library_path = library_path.into();
        self
    }

    pub fn endpoint_duration_sec(&mut self, endpoint_duration_sec: f32) -> &mut Self {
        self.endpoint_duration_sec = endpoint_duration_sec;
        self
    }

    pub fn enable_automatic_punctuation(
        &mut self,
        enable_automatic_punctuation: bool,
    ) -> &mut Self {
        self.enable_automatic_punctuation = enable_automatic_punctuation;
        self
    }

    pub fn init(&self) -> Result<Cheetah, CheetahError> {
        let inner = CheetahInner::init(
            &self.access_key,
            &self.model_path,
            &self.library_path,
            self.endpoint_duration_sec,
            self.enable_automatic_punctuation,
        );
        match inner {
            Ok(inner) => Ok(Cheetah {
                inner: Arc::new(inner),
            }),
            Err(err) => Err(err),
        }
    }
}

#[derive(Clone)]
pub struct CheetahTranscript {
    pub transcript: String,
    pub is_endpoint: bool,
}

#[derive(Clone)]
pub struct Cheetah {
    inner: Arc<CheetahInner>,
}

impl Cheetah {
    pub fn process(&self, pcm: &[i16]) -> Result<CheetahTranscript, CheetahError> {
        self.inner.process(pcm)
    }

    pub fn flush(&self) -> Result<CheetahTranscript, CheetahError> {
        self.inner.flush()
    }

    pub fn frame_length(&self) -> u32 {
        self.inner.frame_length as u32
    }

    pub fn sample_rate(&self) -> u32 {
        self.inner.sample_rate as u32
    }

    pub fn version(&self) -> &str {
        &self.inner.version
    }
}

unsafe fn load_library_fn<T>(
    library: &Library,
    function_name: &[u8],
) -> Result<RawSymbol<T>, CheetahError> {
    library
        .get(function_name)
        .map(|s: Symbol<T>| s.into_raw())
        .map_err(|err| {
            CheetahError::new(
                CheetahErrorStatus::LibraryLoadError,
                format!(
                    "Failed to load function symbol from cheetah library: {}",
                    err
                ),
            )
        })
}

fn check_fn_call_status(
    vtable: &CheetahInnerVTable,
    status: PvStatus,
    function_name: &str,
) -> Result<(), CheetahError> {
    match status {
        PvStatus::SUCCESS => Ok(()),
        _ => unsafe {
            let mut message_stack_ptr: *mut c_char = std::ptr::null_mut();
            let mut message_stack_ptr_ptr = addr_of_mut!(message_stack_ptr);

            let mut message_stack_depth: i32 = 0;
            let err_status = (vtable.pv_get_error_stack)(
                addr_of_mut!(message_stack_ptr_ptr),
                addr_of_mut!(message_stack_depth),
            );

            if err_status != PvStatus::SUCCESS {
                return Err(CheetahError::new(
                    CheetahErrorStatus::LibraryError(err_status),
                    "Unable to get Cheetah error state",
                ));
            };

            let mut message_stack = Vec::new();
            for i in 0..message_stack_depth as usize {
                let message = CStr::from_ptr(*message_stack_ptr_ptr.add(i));
                let message = message.to_string_lossy().into_owned();
                message_stack.push(message);
            }

            (vtable.pv_free_error_stack)(message_stack_ptr_ptr);

            Err(CheetahError::new_with_stack(
                CheetahErrorStatus::LibraryError(status),
                format!("'{function_name}' failed"),
                message_stack,
            ))
        },
    }
}

struct CheetahInnerVTable {
    pv_cheetah_init: RawSymbol<PvCheetahInitFn>,
    pv_cheetah_process: RawSymbol<PvCheetahProcessFn>,
    pv_cheetah_flush: RawSymbol<PvCheetahFlushFn>,
    pv_cheetah_transcript_delete: RawSymbol<PvCheetahTranscriptDeleteFn>,
    pv_cheetah_delete: RawSymbol<PvCheetahDeleteFn>,
    pv_cheetah_frame_length: RawSymbol<PvCheetahFrameLengthFn>,
    pv_cheetah_version: RawSymbol<PvCheetahVersionFn>,
    pv_sample_rate: RawSymbol<PvSampleRateFn>,
    pv_get_error_stack: RawSymbol<PvGetErrorStackFn>,
    pv_free_error_stack: RawSymbol<PvFreeErrorStackFn>,
    pv_set_sdk: RawSymbol<PvSetSdkFn>,

    _lib_guard: Library,
}

impl CheetahInnerVTable {
    pub fn new(lib: Library) -> Result<Self, CheetahError> {
        // SAFETY: the library will be hold by this struct and therefore the symbols can't outlive the library
        unsafe {
            Ok(Self {
                pv_cheetah_init: load_library_fn(&lib, b"pv_cheetah_init")?,
                pv_cheetah_process: load_library_fn(&lib, b"pv_cheetah_process")?,
                pv_cheetah_flush: load_library_fn(&lib, b"pv_cheetah_flush")?,
                pv_cheetah_transcript_delete: load_library_fn(&lib, b"pv_cheetah_transcript_delete")?,
                pv_cheetah_delete: load_library_fn(&lib, b"pv_cheetah_delete")?,
                pv_cheetah_frame_length: load_library_fn(&lib, b"pv_cheetah_frame_length")?,
                pv_cheetah_version: load_library_fn(&lib, b"pv_cheetah_version")?,
                pv_sample_rate: load_library_fn(&lib, b"pv_sample_rate")?,
                pv_get_error_stack: load_library_fn(&lib, b"pv_get_error_stack")?,
                pv_free_error_stack: load_library_fn(&lib, b"pv_free_error_stack")?,
                pv_set_sdk: load_library_fn(&lib, b"pv_set_sdk")?,

                _lib_guard: lib,
            })
        }
    }
}

struct CheetahInner {
    ccheetah: *mut CCheetah,
    frame_length: i32,
    sample_rate: i32,
    version: String,
    vtable: CheetahInnerVTable,
}

impl CheetahInner {
    pub fn init<P: AsRef<Path>>(
        access_key: &str,
        model_path: P,
        library_path: P,
        endpoint_duration_sec: f32,
        enable_automatic_punctuation: bool,
    ) -> Result<Self, CheetahError> {
        if access_key.is_empty() {
            return Err(CheetahError::new(
                CheetahErrorStatus::ArgumentError,
                "AccessKey is empty",
            ));
        }

        if !model_path.as_ref().exists() {
            return Err(CheetahError::new(
                CheetahErrorStatus::ArgumentError,
                format!(
                    "Couldn't find model file at {}",
                    model_path.as_ref().display()
                ),
            ));
        }

        if !library_path.as_ref().exists() {
            return Err(CheetahError::new(
                CheetahErrorStatus::ArgumentError,
                format!(
                    "Couldn't find Cheetah's dynamic library at {}",
                    library_path.as_ref().display()
                ),
            ));
        }

        if endpoint_duration_sec < 0.0 {
            return Err(CheetahError::new(
                CheetahErrorStatus::ArgumentError,
                "Endpoint duration must be non-negative",
            ));
        }

        let lib = unsafe { Library::new(library_path.as_ref()) }.map_err(|err| {
            CheetahError::new(
                CheetahErrorStatus::LibraryLoadError,
                format!("Failed to load cheetah dynamic library: {}", err),
            )
        })?;

        let vtable = CheetahInnerVTable::new(lib)?;

        let sdk_string = match CString::new("rust") {
            Ok(sdk_string) => sdk_string,
            Err(err) => {
                return Err(CheetahError::new(
                    CheetahErrorStatus::ArgumentError,
                    format!("sdk_string is not a valid C string {err}"),
                ))
            }
        };

        let access_key = match CString::new(access_key) {
            Ok(access_key) => access_key,
            Err(err) => {
                return Err(CheetahError::new(
                    CheetahErrorStatus::ArgumentError,
                    format!("AccessKey is not a valid C string {}", err),
                ))
            }
        };

        let mut ccheetah = std::ptr::null_mut();
        let pv_model_path = pathbuf_to_cstring(&model_path);

        // SAFETY: most of the unsafe comes from the `load_library_fn` which is
        // safe, because we don't use the raw symbols after this function
        // anymore.
        let (frame_length, sample_rate, version) = unsafe {
            (vtable.pv_set_sdk)(sdk_string.as_ptr());

            let status = (vtable.pv_cheetah_init)(
                access_key.as_ptr(),
                pv_model_path.as_ptr(),
                endpoint_duration_sec,
                enable_automatic_punctuation,
                addr_of_mut!(ccheetah),
            );
            check_fn_call_status(&vtable, status, "pv_cheetah_init")?;

            let version = CStr::from_ptr((vtable.pv_cheetah_version)())
                .to_string_lossy()
                .into_owned();

            (
                (vtable.pv_cheetah_frame_length)(),
                (vtable.pv_sample_rate)(),
                version,
            )
        };

        Ok(Self {
            ccheetah,
            sample_rate,
            frame_length,
            version,
            vtable,
        })
    }

    pub fn process(&self, pcm: &[i16]) -> Result<CheetahTranscript, CheetahError> {
        if pcm.len() != self.frame_length as usize {
            return Err(CheetahError::new(
                CheetahErrorStatus::FrameLengthError,
                format!(
                    "Input data frame size ({}) does not match required size of {}",
                    pcm.len(),
                    self.frame_length
                ),
            ));
        }

        let (transcript, is_endpoint) = unsafe {
            let mut transcript_ptr: *mut c_char = std::ptr::null_mut();
            let mut is_endpoint: bool = false;

            let status = (self.vtable.pv_cheetah_process)(
                self.ccheetah,
                pcm.as_ptr(),
                addr_of_mut!(transcript_ptr),
                addr_of_mut!(is_endpoint),
            );

            check_fn_call_status(&self.vtable, status, "pv_cheetah_process")?;

            let transcript =
                String::from(CStr::from_ptr(transcript_ptr).to_str().map_err(|_| {
                    CheetahError::new(
                        CheetahErrorStatus::LibraryError(PvStatus::RUNTIME_ERROR),
                        "Failed to convert transcript string",
                    )
                })?);

            (self.vtable.pv_cheetah_transcript_delete)(transcript_ptr);

            (transcript, is_endpoint)
        };

        Ok(CheetahTranscript {
            transcript,
            is_endpoint,
        })
    }

    pub fn flush(&self) -> Result<CheetahTranscript, CheetahError> {
        let (transcript, is_endpoint) = unsafe {
            let mut transcript_ptr: *mut c_char = std::ptr::null_mut();

            let status =
                (self.vtable.pv_cheetah_flush)(self.ccheetah, addr_of_mut!(transcript_ptr));
            check_fn_call_status(&self.vtable, status, "pv_cheetah_flush")?;

            let transcript =
                String::from(CStr::from_ptr(transcript_ptr).to_str().map_err(|_| {
                    CheetahError::new(
                        CheetahErrorStatus::LibraryError(PvStatus::RUNTIME_ERROR),
                        "Failed to convert transcript string",
                    )
                })?);

            (self.vtable.pv_cheetah_transcript_delete)(transcript_ptr);

            (transcript, false)
        };

        Ok(CheetahTranscript {
            transcript,
            is_endpoint,
        })
    }
}

unsafe impl Send for CheetahInner {}
unsafe impl Sync for CheetahInner {}

impl Drop for CheetahInner {
    fn drop(&mut self) {
        unsafe {
            (self.vtable.pv_cheetah_delete)(self.ccheetah);
        }
    }
}

#[cfg(test)]
mod tests {
    use std::env;

    use crate::util::{pv_library_path, pv_model_path};
    use crate::cheetah::{CheetahInner};

    #[test]
    fn test_process_error_stack() {
        let access_key = env::var("PV_ACCESS_KEY")
            .expect("Pass the AccessKey in using the PV_ACCESS_KEY env variable");

        let mut inner = CheetahInner::init(
            &access_key.as_str(),
            pv_model_path(),
            pv_library_path(),
            1.0,
            true,
        ).expect("Unable to create Cheetah");

        let test_pcm = vec![0; inner.frame_length as usize];
        let address = inner.ccheetah;
        inner.ccheetah = std::ptr::null_mut();

        let res = inner.process(&test_pcm);

        inner.ccheetah = address;
        if let Err(err) = res {
            assert!(err.message_stack.len() > 0);
            assert!(err.message_stack.len() < 8);
        } else {
            assert!(res.unwrap().transcript.len() == 0);
        }
    }
}
