if [ ! -d "./assets/contexts/android" ]
then 
    echo "Creating Android demo asset directory..."
    mkdir -p ./assets/contexts/android
fi

echo "Copying Android demo model..."
cp ../../lib/common/cheetah_params.pv ./assets/contexts/android/cheetah_params.pv

if [ ! -d "./assets/contexts/ios" ]
then 
    echo "Creating iOS demo asset directory..."
    mkdir -p ./assets/contexts/ios
fi

echo "Copying iOS demo model..."
cp ../../lib/common/cheetah_params.pv ./assets/contexts/ios/cheetah_params.pv
