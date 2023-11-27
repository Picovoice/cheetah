/*
    Copyright 2022-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.reactnative.cheetah;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import ai.picovoice.cheetah.Cheetah;
import ai.picovoice.cheetah.CheetahException;
import ai.picovoice.cheetah.CheetahInvalidStateException;
import ai.picovoice.cheetah.CheetahTranscript;

/**
 * CheetahModule Class.
 */
public class CheetahModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;
    private final Map<String, Cheetah> cheetahPool = new HashMap<>();

    public CheetahModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;

        Cheetah.setSdk("react-native");
    }

    @NonNull
    @Override
    public String getName() {
        return "PvCheetah";
    }

    @ReactMethod
    public void create(
            String accessKey,
            String modelPath,
            Float endpointDuration,
            boolean enableAutomaticPunctuation,
            Promise promise
    ) {
        try {
            Cheetah cheetah = new Cheetah.Builder()
                    .setAccessKey(accessKey)
                    .setModelPath(modelPath.isEmpty() ? null : modelPath)
                    .setEndpointDuration(endpointDuration)
                    .setEnableAutomaticPunctuation(enableAutomaticPunctuation)
                    .build(reactContext);
            cheetahPool.put(String.valueOf(System.identityHashCode(cheetah)), cheetah);

            WritableMap paramMap = Arguments.createMap();
            paramMap.putString("handle", String.valueOf(System.identityHashCode(cheetah)));
            paramMap.putInt("frameLength", cheetah.getFrameLength());
            paramMap.putInt("sampleRate", cheetah.getSampleRate());
            paramMap.putString("version", cheetah.getVersion());
            promise.resolve(paramMap);
        } catch (CheetahException e) {
            promise.reject(e.getClass().getSimpleName(), e.getMessage());
        }
    }

    @ReactMethod
    public void delete(String handle) {
        if (cheetahPool.containsKey(handle)) {
            Cheetah cheetah = cheetahPool.get(handle);
            if (cheetah != null) {
                cheetah.delete();
            }
            cheetahPool.remove(handle);
        }
    }

    @ReactMethod
    public void process(String handle, ReadableArray pcmArray, Promise promise) {

        if (!cheetahPool.containsKey(handle)) {
            promise.reject(CheetahInvalidStateException.class.getSimpleName(),
                    "Invalid Cheetah handle provided to native module.");
            return;
        }

        ArrayList<Object> pcmArrayList = pcmArray.toArrayList();
        short[] buffer = new short[pcmArray.size()];
        for (int i = 0; i < pcmArray.size(); i++) {
            buffer[i] = ((Number) pcmArrayList.get(i)).shortValue();
        }

        Cheetah cheetah = cheetahPool.get(handle);
        if (cheetah == null) {
            promise.reject(CheetahInvalidStateException.class.getSimpleName(),
                    "Instance of Cheetah no longer exists.");
            return;
        }

        try {
            CheetahTranscript result = cheetah.process(buffer);

            WritableMap resultMap = Arguments.createMap();
            resultMap.putString("transcript", result.getTranscript());
            resultMap.putBoolean("isEndpoint", result.getIsEndpoint());
            promise.resolve(resultMap);
        } catch (CheetahException e) {
            promise.reject(e.getClass().getSimpleName(), e.getMessage());
        }
    }

    @ReactMethod
    public void flush(String handle, Promise promise) {

        if (!cheetahPool.containsKey(handle)) {
            promise.reject(CheetahInvalidStateException.class.getSimpleName(),
                    "Invalid Cheetah handle provided to native module.");
            return;
        }

        Cheetah cheetah = cheetahPool.get(handle);
        if (cheetah == null) {
            promise.reject(CheetahInvalidStateException.class.getSimpleName(),
                    "Instance of Cheetah no longer exists.");
            return;
        }

        try {
            CheetahTranscript result = cheetah.flush();
            WritableMap resultMap = Arguments.createMap();
            resultMap.putString("transcript", result.getTranscript());
            promise.resolve(resultMap);
        } catch (CheetahException e) {
            promise.reject(e.getClass().getSimpleName(), e.getMessage());
        }
    }
}
