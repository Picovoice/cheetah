if [ ! -d "./cheetah-demo-app/src/androidTest/assets/test_resources/audio" ]
then
    echo "Creating test audio samples directory..."
    mkdir -p ./cheetah-demo-app/src/androidTest/assets/test_resources/audio
fi

echo "Copying test audio samples..."
cp ../../../resources/audio_samples/test.wav ./cheetah-demo-app/src/androidTest/assets/test_resources/audio/test.wav

echo "Copying cheetah model..."
cp ./cheetah-demo-app/src/main/assets/cheetah_params.pv ./cheetah-demo-app/src/androidTest/assets/test_resources/cheetah_params.pv
