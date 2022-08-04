/*
    Copyright 2022 Picovoice Inc.

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

use libc::{c_char, c_float, c_void};
#[cfg(unix)]
use libloading::os::unix::Symbol as RawSymbol;
#[cfg(windows)]
use libloading::os::windows::Symbol as RawSymbol;
use libloading::{Library, Symbol};

use crate::util::{pathbuf_to_cstring, pv_library_path, pv_model_path};

#[repr(C)]
struct CCheetah {}

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
type PvCheetahDeleteFn = unsafe extern "C" fn(object: *mut CCheetah);
type PvFreeFn = unsafe extern "C" fn(*mut c_void);

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
    message: String,
}

impl CheetahError {
    pub fn new(status: CheetahErrorStatus, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }
}

impl std::fmt::Display for CheetahError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {:?}", self.message, self.status)
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

fn check_fn_call_status(status: PvStatus, function_name: &str) -> Result<(), CheetahError> {
    match status {
        PvStatus::SUCCESS => Ok(()),
        _ => Err(CheetahError::new(
            CheetahErrorStatus::LibraryError(status),
            format!("Function '{}' in the cheetah library failed", function_name),
        )),
    }
}

struct CheetahInnerVTable {
    pv_cheetah_process: RawSymbol<PvCheetahProcessFn>,
    pv_cheetah_flush: RawSymbol<PvCheetahFlushFn>,
    pv_cheetah_delete: RawSymbol<PvCheetahDeleteFn>,
    pv_free: RawSymbol<PvFreeFn>,

    _lib_guard: Library,
}

impl CheetahInnerVTable {
    pub fn new(lib: Library) -> Result<Self, CheetahError> {
        // SAFETY: the library will be hold by this struct and therefore the symbols can't outlive the library
        unsafe {
            Ok(Self {
                pv_cheetah_process: load_library_fn(&lib, b"pv_cheetah_process")?,
                pv_cheetah_flush: load_library_fn(&lib, b"pv_cheetah_flush")?,
                pv_cheetah_delete: load_library_fn(&lib, b"pv_cheetah_delete")?,
                pv_free: load_library_fn(&lib, b"pv_free")?,

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
        if access_key == "" {
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
            let pv_cheetah_init = load_library_fn::<PvCheetahInitFn>(&lib, b"pv_cheetah_init")?;
            let pv_cheetah_frame_length =
                load_library_fn::<PvCheetahFrameLengthFn>(&lib, b"pv_cheetah_frame_length")?;
            let pv_sample_rate = load_library_fn::<PvSampleRateFn>(&lib, b"pv_sample_rate")?;
            let pv_cheetah_version =
                load_library_fn::<PvCheetahVersionFn>(&lib, b"pv_cheetah_version")?;

            let status = pv_cheetah_init(
                access_key.as_ptr(),
                pv_model_path.as_ptr(),
                endpoint_duration_sec,
                enable_automatic_punctuation,
                addr_of_mut!(ccheetah),
            );
            check_fn_call_status(status, "pv_cheetah_init")?;

            let version = match CStr::from_ptr(pv_cheetah_version()).to_str() {
                Ok(string) => string.to_string(),
                Err(err) => {
                    return Err(CheetahError::new(
                        CheetahErrorStatus::LibraryLoadError,
                        format!("Failed to get version info from Cheetah Library: {}", err),
                    ))
                }
            };

            (pv_cheetah_frame_length(), pv_sample_rate(), version)
        };

        Ok(Self {
            ccheetah,
            frame_length,
            sample_rate,
            version,
            vtable: CheetahInnerVTable::new(lib)?,
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

            check_fn_call_status(status, "pv_cheetah_process")?;

            let transcript =
                String::from(CStr::from_ptr(transcript_ptr).to_str().map_err(|_| {
                    CheetahError::new(
                        CheetahErrorStatus::LibraryError(PvStatus::RUNTIME_ERROR),
                        "Failed to convert transcript string",
                    )
                })?);

            (self.vtable.pv_free)(transcript_ptr as *mut c_void);

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
            check_fn_call_status(status, "pv_cheetah_process_file")?;

            let transcript =
                String::from(CStr::from_ptr(transcript_ptr).to_str().map_err(|_| {
                    CheetahError::new(
                        CheetahErrorStatus::LibraryError(PvStatus::RUNTIME_ERROR),
                        "Failed to convert transcript string",
                    )
                })?);

            (self.vtable.pv_free)(transcript_ptr as *mut c_void);

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
