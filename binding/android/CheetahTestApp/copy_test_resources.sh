if [ ! -d "./cheetah-test-app/src/androidTest/assets/test_resources/audio" ]
then
    echo "Creating test audio samples directory..."
    mkdir -p ./cheetah-test-app/src/androidTest/assets/test_resources/audio
fi

echo "Copying test audio samples..."
cp ../../../resources/audio_samples/test.wav ./cheetah-test-app/src/androidTest/assets/test_resources/audio/test.wav

echo "Copying cheetah model..."
cp ../../../lib/common/cheetah_params.pv ./cheetah-test-app/src/main/assets/cheetah_params.pv
cp ../../../lib/common/cheetah_params.pv ./cheetah-test-app/src/androidTest/assets/test_resources/cheetah_params.pv
