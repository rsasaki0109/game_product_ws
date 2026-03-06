using UnityEngine;

namespace ColorTurfClash
{
    public sealed class PulseFx : MonoBehaviour
    {
        private Vector3 startScale;
        private Vector3 endScale;
        private float lifetime;
        private float riseSpeed;
        private float age;
        private Material materialInstance;
        private Color startColor;

        public static void Create(string objectName, PrimitiveType primitiveType, Vector3 position, Quaternion rotation, Color color, Vector3 startScale, Vector3 endScale, float lifetime, float riseSpeed = 0f)
        {
            var effect = GameObject.CreatePrimitive(primitiveType);
            effect.name = objectName;
            effect.transform.SetPositionAndRotation(position, rotation);
            effect.transform.localScale = startScale;

            var collider = effect.GetComponent<Collider>();
            if (collider != null)
            {
                Destroy(collider);
            }

            var material = RuntimeMaterialFactory.CreateColorMaterial(color);
            effect.GetComponent<Renderer>().sharedMaterial = material;

            var component = effect.AddComponent<PulseFx>();
            component.Initialize(startScale, endScale, color, lifetime, riseSpeed, material);
        }

        private void Initialize(Vector3 initialScale, Vector3 finalScale, Color color, float duration, float verticalRiseSpeed, Material material)
        {
            startScale = initialScale;
            endScale = finalScale;
            startColor = color;
            lifetime = duration;
            riseSpeed = verticalRiseSpeed;
            materialInstance = material;
        }

        private void Update()
        {
            age += Time.deltaTime;
            if (age >= lifetime)
            {
                Destroy(gameObject);
                return;
            }

            var t = Mathf.Clamp01(age / lifetime);
            var easedT = 1f - Mathf.Pow(1f - t, 3f);
            transform.localScale = Vector3.Lerp(startScale, endScale, easedT);
            transform.position += Vector3.up * riseSpeed * Time.deltaTime;
            if (materialInstance != null)
            {
                materialInstance.color = Color.Lerp(startColor, Color.white, t * 0.55f);
            }
        }

        private void OnDestroy()
        {
            if (materialInstance != null)
            {
                Destroy(materialInstance);
            }
        }
    }
}
