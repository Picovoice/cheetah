if [ ! -d "./cheetah-test-app/src/androidTest/assets/test_resources/audio_samples" ]
then
    echo "Creating test audio samples directory..."
    mkdir -p ./cheetah-test-app/src/androidTest/assets/test_resources/audio_samples
fi

echo "Copying test audio samples..."
cp ../../../resources/audio_samples/* ./cheetah-test-app/src/androidTest/assets/test_resources/audio_samples/

echo "Copying cheetah models..."
cp ../../../lib/common/* ./cheetah-test-app/src/main/assets/
cp ../../../lib/common/* ./cheetah-test-app/src/androidTest/assets/test_resources/

echo "Copying test data file..."
cp ../../../resources/.test/test_data.json ./cheetah-test-app/src/androidTest/assets/test_resources
