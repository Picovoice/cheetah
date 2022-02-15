#!/bin/bash

echo "Copying cheetah model..."
cp ../../lib/common/cheetah_params.pv ./embedded/lib/common/cheetah_params.pv

echo "Copying Linux lib..."
cp ../../lib/linux/x86_64/libpv_cheetah.so ./embedded/lib/linux/x86_64/libpv_cheetah.so

echo "Copying macOS libs..."
cp ../../lib/mac/x86_64/libpv_cheetah.dylib ./embedded/lib/mac/x86_64/libpv_cheetah.dylib
cp ../../lib/mac/arm64/libpv_cheetah.dylib ./embedded/lib/mac/arm64/libpv_cheetah.dylib

echo "Copying Windows lib..."
cp ../../lib/windows/amd64/libpv_cheetah.dll ./embedded/lib/windows/amd64/libpv_cheetah.dll

echo "Copying RPi libs..."
cp -rp ../../lib/raspberry-pi/* ./embedded/lib/raspberry-pi

echo "Copying Jetson lib..."
cp ../../lib/jetson/cortex-a57-aarch64/libpv_cheetah.so ./embedded/lib/jetson/cortex-a57-aarch64/libpv_cheetah.so

echo "Copy complete!"
