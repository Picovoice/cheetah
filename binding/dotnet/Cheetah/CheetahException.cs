/*
    Copyright 2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

using System;

namespace Pv
{
    public class CheetahException : Exception
    {
        public CheetahException() { }

        public CheetahException(string message) : base(message) { }

    }

    public class CheetahMemoryException : CheetahException
    {
        public CheetahMemoryException() { }

        public CheetahMemoryException(string message) : base(message) { }
    }

    public class CheetahIOException : CheetahException
    {
        public CheetahIOException() { }

        public CheetahIOException(string message) : base(message) { }
    }

    public class CheetahInvalidArgumentException : CheetahException
    {
        public CheetahInvalidArgumentException() { }

        public CheetahInvalidArgumentException(string message) : base(message) { }
    }

    public class CheetahStopIterationException : CheetahException
    {
        public CheetahStopIterationException() { }

        public CheetahStopIterationException(string message) : base(message) { }
    }

    public class CheetahKeyException : CheetahException
    {
        public CheetahKeyException() { }

        public CheetahKeyException(string message) : base(message) { }
    }

    public class CheetahInvalidStateException : CheetahException
    {
        public CheetahInvalidStateException() { }

        public CheetahInvalidStateException(string message) : base(message) { }
    }

    public class CheetahRuntimeException : CheetahException
    {
        public CheetahRuntimeException() { }

        public CheetahRuntimeException(string message) : base(message) { }
    }

    public class CheetahActivationException : CheetahException
    {
        public CheetahActivationException() { }

        public CheetahActivationException(string message) : base(message) { }
    }

    public class CheetahActivationLimitException : CheetahException
    {
        public CheetahActivationLimitException() { }

        public CheetahActivationLimitException(string message) : base(message) { }
    }

    public class CheetahActivationThrottledException : CheetahException
    {
        public CheetahActivationThrottledException() { }

        public CheetahActivationThrottledException(string message) : base(message) { }
    }

    public class CheetahActivationRefusedException : CheetahException
    {
        public CheetahActivationRefusedException() { }

        public CheetahActivationRefusedException(string message) : base(message) { }
    }

}
