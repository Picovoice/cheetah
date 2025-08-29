#!/bin/sh

mkdir -p "${SRCROOT}/models/"

rm "${SRCROOT}/models/"*

if [ $1 == "_en" ]; then
        cp "${SRCROOT}/../../../lib/common/cheetah_params.pv" "${SRCROOT}/models/"
else
    cp "${SRCROOT}/../../../lib/common/cheetah_params$1.pv" "${SRCROOT}/models/"
fi
