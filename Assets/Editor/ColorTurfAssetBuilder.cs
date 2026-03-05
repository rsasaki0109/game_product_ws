#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;

namespace ColorTurfClash.Editor
{
    public static class ColorTurfAssetBuilder
    {
        private const string ResourcesFolder = "Assets/Resources";
        private const string BaseMaterialPath = ResourcesFolder + "/ColorTurfBaseMaterial.mat";

        [MenuItem("Color Turf Clash/Ensure Runtime Assets")]
        public static void EnsureRuntimeAssets()
        {
            Directory.CreateDirectory(ResourcesFolder);

            var shader = Shader.Find("Unlit/Color") ?? Shader.Find("Sprites/Default") ?? Shader.Find("Standard");
            if (shader == null)
            {
                throw new IOException("No supported runtime shader found for Color Turf assets.");
            }

            var material = AssetDatabase.LoadAssetAtPath<Material>(BaseMaterialPath);
            if (material == null)
            {
                material = new Material(shader)
                {
                    name = "ColorTurfBaseMaterial",
                    color = Color.white,
                };
                AssetDatabase.CreateAsset(material, BaseMaterialPath);
            }
            else if (material.shader != shader)
            {
                material.shader = shader;
                material.color = Color.white;
                EditorUtility.SetDirty(material);
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
        }
    }
}
#endif
