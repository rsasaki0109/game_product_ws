#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace ColorTurfClash.Editor
{
    public static class ColorTurfBuild
    {
        private const string ScenePath = "Assets/Scenes/ColorTurfPrototype.unity";
        private const string OutputPath = "Builds/ColorTurfClashLinux/ColorTurfClash.x86_64";

        [MenuItem("Color Turf Clash/Build Linux Player")]
        public static void BuildLinuxPlayer()
        {
            ColorTurfAssetBuilder.EnsureRuntimeAssets();
            Directory.CreateDirectory(Path.GetDirectoryName(OutputPath) ?? "Builds");

            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = OutputPath,
                target = BuildTarget.StandaloneLinux64,
                options = BuildOptions.None,
            };

            var report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new Exception($"Linux build failed: {report.summary.result}");
            }

            Debug.Log($"Built Linux player at {OutputPath}");
        }
    }
}
#endif
