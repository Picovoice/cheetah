#! /bin/bash

echo "Removing old data ..."
rm -rf ./data


echo "Preparing dir ..."
mkdir -p ./data/lib/

echo "Copying Model File ..."
cp -r ../../lib/common ./data/lib/

for platform in linux mac raspberry-pi jetson windows
do
    echo "Copying Resource & Library Files for $platform ..."
    cp -r ../../lib/$platform ./data/lib/
done

echo "Copy complete!"
