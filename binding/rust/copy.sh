#! /bin/bash

echo "Removing old data ..."
rm -rf ./data


echo "Preparing dir ..."
mkdir -p ./data/lib/

echo "Copying Model File ..."
mkdir -p ./data/lib/common
cp -r ../../lib/common/cheetah_params.pv ./data/lib/common

for platform in linux mac raspberry-pi windows
do
    echo "Copying Resource & Library Files for $platform ..."
    cp -r ../../lib/$platform ./data/lib/
done

echo "Copy complete!"
