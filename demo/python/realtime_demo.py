#!/bin/python3
from cheetah_demo import _abs_path, init_cheetah
import pyaudio
import struct
import argparse
import signal


def init_argparser() :
    """Define arguments and parse them"""
    parser = argparse.ArgumentParser()

    parser.add_argument(
        '--library_path',
        help="absolute path to Cheetah's dynamic library",
        type=str,
        default=_abs_path('../../lib/linux/x86_64/libpv_cheetah.so'))

    parser.add_argument(
        '--acoustic_model_file_path',
        help='absolute path to acoustic model parameter file',
        type=str,
        default=_abs_path('../../lib/common/acoustic_model.pv'))

    parser.add_argument(
        '--language_model_file_path',
        help='absolute path to language model parameter file',
        type=str,
        default=_abs_path('../../lib/common/language_model.pv'))

    parser.add_argument(
        '--license_file_path',
        help='absolute path to license file',
        type=str,
        default=_abs_path('../../resources/license/cheetah_eval_linux_public.lic'))

    parser.add_argument(
        '--audio_device',
        help='audio input device to record speech from. Omit to leave as system default',
        type=int,
		default=None)

    return parser.parse_args()



def init_input_audio_stream (cheetah_instance, device=None):
	"""
	Initialize audio stream using `PyAudio`.  
	If no input device is specified, use the system default.
	See PyAudio docs for description of the params.
	"""
	pa = pyaudio.PyAudio()
	return pa.open(
		rate=cheetah_instance.sample_rate,	# num samples/second. Use Cheetah's predefined sample rate
		channels=1,							# Cheetah requires single-channel input
		format=pyaudio.paInt16,				# each sample is 16-bit (2 bytes)
		input=True,							# use as input
		frames_per_buffer=cheetah_instance.frame_length,	# the buffer will be available for analysis when it is filled
		input_device_index=device			# if None, system default will be used
	)


interrupted = True
def break_loop (signal, frame):
	"""
	Set the `interrupted` flag to True if it not already True  
	If `interrupted` is already set, gracefully exit program as normal.  
	The `interrupted` flag should be checked by an infinite loop to conditionally break
	"""
	global interrupted
	if interrupted:
		exit(0)			# if interrupt flag already set, exit as normal
	interrupted = True	# otherwise, set the interrupt flag

# use `break_loop` to handle SIGINT (ctrl+C)
signal.signal(signal.SIGINT, break_loop)



def listen_and_parse ( input_stream, cheetah ):
	"""
	Use a loop to listen and process speech in real time.  
	Once the loop is broken (by sending SIGINT; ctrl+C), transcribe.
	"""
	print("Listening... use SIGINT (ctrl+C) to stop listening and transcibe." )

	# unset the `interrupted` flag first; this flag will be checked with each loop
	global interrupted
	interrupted = False		# unset interrupted flag

	# listen until SIGINT (user should )
	while not interrupted:
		# reach in a "chunk"; each chunk contains the specified number of frames (i.e samples)
		pcm = input_stream.read ( cheetah.frame_length )
		# unpack the chunk to make it processable
		pcm = struct.unpack_from ("h" * cheetah.frame_length, pcm)
		# process with Cheetah
		cheetah.process(pcm)

	# once the loop is broken, transcribe
	transcript = cheetah.transcribe()
	print ( "\n", transcript )
	return transcript



if __name__ == '__main__':

	args = init_argparser()

	# initialize Cheetah
	cheetah = init_cheetah(args)

	# initialize input audio stream (use default audio input device)
	input_stream = init_input_audio_stream(cheetah, args.audio_device)

	# 
	listen_and_parse (input_stream, cheetah)
	
	exit(0)