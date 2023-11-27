/*
    Copyright 2022-2023 Picovoice Inc.

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
        private readonly string[] _messageStack;

        public CheetahException() { }

        public CheetahException(string message) : base(message) { }

        public CheetahException(string message, string[] messageStack) : base(ModifyMessages(message, messageStack))
        {
            this._messageStack = messageStack;
        }

        public string[] MessageStack
        {
            get => _messageStack;
        }

        private static string ModifyMessages(string message, string[] messageStack)
        {
            string messageString = message;
            if (messageStack.Length > 0)
            {
                messageString += ":";
                for (int i = 0; i < messageStack.Length; i++)
                {
                    messageString += $"\n  [{i}] {messageStack[i]}";
                }
            }
            return messageString;
        }

    }

    public class CheetahMemoryException : CheetahException
    {
        public CheetahMemoryException() { }

        public CheetahMemoryException(string message) : base(message) { }

        public CheetahMemoryException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CheetahIOException : CheetahException
    {
        public CheetahIOException() { }

        public CheetahIOException(string message) : base(message) { }

        public CheetahIOException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CheetahInvalidArgumentException : CheetahException
    {
        public CheetahInvalidArgumentException() { }

        public CheetahInvalidArgumentException(string message) : base(message) { }

        public CheetahInvalidArgumentException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CheetahStopIterationException : CheetahException
    {
        public CheetahStopIterationException() { }

        public CheetahStopIterationException(string message) : base(message) { }

        public CheetahStopIterationException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CheetahKeyException : CheetahException
    {
        public CheetahKeyException() { }

        public CheetahKeyException(string message) : base(message) { }

        public CheetahKeyException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CheetahInvalidStateException : CheetahException
    {
        public CheetahInvalidStateException() { }

        public CheetahInvalidStateException(string message) : base(message) { }

        public CheetahInvalidStateException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CheetahRuntimeException : CheetahException
    {
        public CheetahRuntimeException() { }

        public CheetahRuntimeException(string message) : base(message) { }

        public CheetahRuntimeException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CheetahActivationException : CheetahException
    {
        public CheetahActivationException() { }

        public CheetahActivationException(string message) : base(message) { }

        public CheetahActivationException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CheetahActivationLimitException : CheetahException
    {
        public CheetahActivationLimitException() { }

        public CheetahActivationLimitException(string message) : base(message) { }

        public CheetahActivationLimitException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CheetahActivationThrottledException : CheetahException
    {
        public CheetahActivationThrottledException() { }

        public CheetahActivationThrottledException(string message) : base(message) { }

        public CheetahActivationThrottledException(string message, string[] messageStack) : base(message, messageStack) { }
    }

    public class CheetahActivationRefusedException : CheetahException
    {
        public CheetahActivationRefusedException() { }

        public CheetahActivationRefusedException(string message) : base(message) { }

        public CheetahActivationRefusedException(string message, string[] messageStack) : base(message, messageStack) { }
    }

}