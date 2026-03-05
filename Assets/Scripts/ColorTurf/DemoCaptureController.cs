using System.Collections;
using System.IO;
using UnityEngine;

namespace ColorTurfClash
{
    public sealed class DemoCaptureController : MonoBehaviour
    {
        private string captureDirectory;
        private int captureFrameRate;
        private int captureFrames;
        private Texture2D frameTexture;

        private void Start()
        {
            captureDirectory = DemoArgs.GetValue("-captureDir", Path.Combine(Application.dataPath, "../captures/demo_frames"));
            captureFrameRate = DemoArgs.GetInt("-captureFrameRate", 30);
            captureFrames = DemoArgs.GetInt("-captureFrames", 240);

            Directory.CreateDirectory(captureDirectory);
            File.WriteAllText(Path.Combine(captureDirectory, "capture_status.txt"), "starting");
            Application.targetFrameRate = captureFrameRate;
            QualitySettings.vSyncCount = 0;
            Time.captureFramerate = captureFrameRate;
            Debug.Log($"Demo capture setup: dir={captureDirectory} fps={captureFrameRate} frames={captureFrames}");
            StartCoroutine(CaptureRoutine());
        }

        private IEnumerator CaptureRoutine()
        {
            yield return null;
            yield return new WaitForEndOfFrame();

            var captureWidth = Mathf.Max(Screen.width, 2);
            var captureHeight = Mathf.Max(Screen.height, 2);
            frameTexture = new Texture2D(captureWidth, captureHeight, TextureFormat.RGB24, false);
            File.WriteAllText(Path.Combine(captureDirectory, "capture_status.txt"), $"capturing {captureWidth}x{captureHeight}");
            Debug.Log($"Demo capture started at {captureWidth}x{captureHeight}");

            for (var frameIndex = 0; frameIndex < captureFrames; frameIndex++)
            {
                yield return new WaitForEndOfFrame();
                frameTexture.ReadPixels(new Rect(0f, 0f, captureWidth, captureHeight), 0, 0);
                frameTexture.Apply(false, false);
                var bytes = frameTexture.EncodeToPNG();
                var outputPath = Path.Combine(captureDirectory, $"frame_{frameIndex:00000}.png");
                File.WriteAllBytes(outputPath, bytes);

                if (frameIndex == 0 || (frameIndex + 1) % 30 == 0)
                {
                    File.WriteAllText(Path.Combine(captureDirectory, "capture_status.txt"), $"captured {frameIndex + 1}/{captureFrames}");
                    Debug.Log($"Captured frame {frameIndex + 1}/{captureFrames}");
                }
            }

            File.WriteAllText(Path.Combine(captureDirectory, "capture_status.txt"), "complete");
            Debug.Log("Demo capture complete");
            Application.Quit();
        }

        private void OnDestroy()
        {
            if (frameTexture != null)
            {
                Destroy(frameTexture);
            }
        }
    }
}
