if [ ! -d "./assets/models/android" ]
then 
    echo "Creating Android demo asset directory..."
    mkdir -p ./assets/models/android
fi

echo "Copying Android demo model..."
cp ../../lib/common/cheetah_params.pv ./assets/models/android/cheetah_params.pv

if [ ! -d "./assets/models/ios" ]
then 
    echo "Creating iOS demo asset directory..."
    mkdir -p ./assets/models/ios
fi

echo "Copying iOS demo model..."
cp ../../lib/common/cheetah_params.pv ./assets/models/ios/cheetah_params.pv
