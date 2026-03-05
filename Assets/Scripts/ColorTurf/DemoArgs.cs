using System;

namespace ColorTurfClash
{
    public static class DemoArgs
    {
        private static readonly string[] Args = Environment.GetCommandLineArgs();

        public static bool HasFlag(string flag)
        {
            foreach (var arg in Args)
            {
                if (string.Equals(arg, flag, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        public static string GetValue(string key, string defaultValue)
        {
            for (var index = 0; index < Args.Length; index++)
            {
                var arg = Args[index];
                if (string.Equals(arg, key, StringComparison.OrdinalIgnoreCase) && index + 1 < Args.Length)
                {
                    return Args[index + 1];
                }

                if (arg.StartsWith(key + "=", StringComparison.OrdinalIgnoreCase))
                {
                    return arg[(key.Length + 1)..];
                }
            }

            return defaultValue;
        }

        public static int GetInt(string key, int defaultValue)
        {
            var value = GetValue(key, defaultValue.ToString());
            return int.TryParse(value, out var parsed) ? parsed : defaultValue;
        }
    }
}
