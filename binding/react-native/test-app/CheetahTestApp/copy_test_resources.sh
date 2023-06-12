LIB_DIR="../../../../lib"
RESOURCE_DIR="../../../../resources"
ANDROID_ASSETS_DIR="./android/app/src/main/assets"
IOS_ASSETS_DIR="./ios/CheetahTestApp/Assets.bundle"

echo "Creating test resources asset directory"
mkdir -p ${ANDROID_ASSETS_DIR}
mkdir -p ${IOS_ASSETS_DIR}

echo "Copying test audio samples..."
mkdir -p ${ANDROID_ASSETS_DIR}/audio_samples
mkdir -p ${IOS_ASSETS_DIR}/audio_samples
cp ${RESOURCE_DIR}/audio_samples/*.wav ${ANDROID_ASSETS_DIR}/audio_samples
cp ${RESOURCE_DIR}/audio_samples/*.wav ${IOS_ASSETS_DIR}/audio_samples

echo "Copying test model files..."
mkdir -p ${ANDROID_ASSETS_DIR}/model_files
mkdir -p ${IOS_ASSETS_DIR}/model_files
cp ${LIB_DIR}/common/*.pv ${ANDROID_ASSETS_DIR}/model_files
cp ${LIB_DIR}/common/*.pv ${IOS_ASSETS_DIR}/model_files
