using UnityEngine;

namespace ColorTurfClash
{
    public static class RuntimeMaterialFactory
    {
        private static Material baseMaterial;

        public static Material CreateColorMaterial(Color color)
        {
            EnsureBaseMaterial();

            var material = new Material(baseMaterial);
            material.color = color;
            return material;
        }

        private static void EnsureBaseMaterial()
        {
            if (baseMaterial != null)
            {
                return;
            }

            baseMaterial = Resources.Load<Material>("ColorTurfBaseMaterial");
            if (baseMaterial != null)
            {
                return;
            }

            var fallbackShader = Shader.Find("Unlit/Color") ?? Shader.Find("Sprites/Default") ?? Shader.Find("Hidden/InternalErrorShader");
            baseMaterial = new Material(fallbackShader);
        }
    }
}
