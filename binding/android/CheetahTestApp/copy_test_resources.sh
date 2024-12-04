if [ ! -d "./cheetah-test-app/src/androidTest/assets/test_resources/audio_samples" ]
then
    echo "Creating test audio samples directory..."
    mkdir -p ./cheetah-test-app/src/androidTest/assets/test_resources/audio_samples
fi

echo "Copying test audio samples..."
cp ../../../resources/audio_samples/* ./cheetah-test-app/src/androidTest/assets/test_resources/audio_samples/

if [ ! -d "./cheetah-test-app/src/androidTest/assets/test_resources/model_files" ]
then
    echo "Creating test model files directory..."
    mkdir -p ./cheetah-test-app/src/androidTest/assets/test_resources/model_files
fi

echo "Copying cheetah models..."
cp ../../../lib/common/* ./cheetah-test-app/src/androidTest/assets/test_resources/model_files

echo "Copying test data file..."
cp ../../../resources/.test/test_data.json ./cheetah-test-app/src/androidTest/assets/test_resources
