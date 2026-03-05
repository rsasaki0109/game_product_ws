#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace ColorTurfClash.Editor
{
    public static class ColorTurfSceneBuilder
    {
        private const string ScenePath = "Assets/Scenes/ColorTurfPrototype.unity";

        [MenuItem("Color Turf Clash/Build Prototype Scene")]
        public static void BuildPrototypeScene()
        {
            Directory.CreateDirectory("Assets/Scenes");

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var bootstrap = new GameObject("ColorTurfBootstrap");
            bootstrap.AddComponent<ColorTurfBootstrap>();

            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log($"Built prototype scene at {ScenePath}");
        }
    }
}
#endif
