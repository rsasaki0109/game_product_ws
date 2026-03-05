using UnityEngine;

namespace ColorTurfClash
{
    public sealed class TurfTile : MonoBehaviour
    {
        private static readonly int ColorProperty = Shader.PropertyToID("_Color");
        private static readonly int BaseColorProperty = Shader.PropertyToID("_BaseColor");

        private readonly MaterialPropertyBlock propertyBlock = new();
        private Renderer cachedRenderer;

        public Vector2Int GridPosition { get; private set; }
        public TeamSide Owner { get; private set; } = TeamSide.Neutral;

        public void Initialize(Vector2Int gridPosition, Renderer targetRenderer)
        {
            GridPosition = gridPosition;
            cachedRenderer = targetRenderer;
            SetOwner(TeamSide.Neutral);
        }

        public void SetOwner(TeamSide owner)
        {
            Owner = owner;
            ApplyColor(TeamPalette.GetColor(owner));
        }

        private void ApplyColor(Color color)
        {
            if (cachedRenderer == null)
            {
                return;
            }

            cachedRenderer.GetPropertyBlock(propertyBlock);
            propertyBlock.SetColor(ColorProperty, color);
            propertyBlock.SetColor(BaseColorProperty, color);
            cachedRenderer.SetPropertyBlock(propertyBlock);
        }
    }
}
