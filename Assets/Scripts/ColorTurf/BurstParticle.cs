using UnityEngine;

namespace ColorTurfClash
{
    public sealed class BurstParticle : MonoBehaviour
    {
        private Vector3 velocity;
        private Vector3 startScale;
        private Vector3 spinAxis;
        private float lifetime;
        private float gravity;
        private float spinSpeed;
        private float age;
        private Material materialInstance;
        private Color startColor;

        public static void CreateSphere(string objectName, Vector3 position, Vector3 scale, Color color, Vector3 velocity, float lifetime, float gravity, float spinSpeed)
        {
            var particle = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            particle.name = objectName;
            particle.transform.position = position;
            particle.transform.localScale = scale;

            var collider = particle.GetComponent<Collider>();
            if (collider != null)
            {
                Destroy(collider);
            }

            var material = RuntimeMaterialFactory.CreateColorMaterial(color);
            particle.GetComponent<Renderer>().sharedMaterial = material;

            var component = particle.AddComponent<BurstParticle>();
            component.Initialize(scale, color, velocity, lifetime, gravity, spinSpeed, material);
        }

        private void Initialize(Vector3 scale, Color color, Vector3 initialVelocity, float duration, float gravityForce, float angularSpeed, Material material)
        {
            startScale = scale;
            startColor = color;
            velocity = initialVelocity;
            lifetime = duration;
            gravity = gravityForce;
            spinSpeed = angularSpeed;
            materialInstance = material;
            spinAxis = Random.onUnitSphere;
            if (spinAxis.sqrMagnitude < 0.01f)
            {
                spinAxis = Vector3.up;
            }
        }

        private void Update()
        {
            age += Time.deltaTime;
            if (age >= lifetime)
            {
                Destroy(gameObject);
                return;
            }

            transform.position += velocity * Time.deltaTime;
            velocity += Vector3.down * gravity * Time.deltaTime;
            velocity *= 1f / (1f + 1.6f * Time.deltaTime);

            transform.Rotate(spinAxis, spinSpeed * Time.deltaTime, Space.World);

            var t = Mathf.Clamp01(age / lifetime);
            transform.localScale = Vector3.Lerp(startScale, Vector3.zero, t);
            if (materialInstance != null)
            {
                materialInstance.color = Color.Lerp(startColor, Color.white, t * 0.35f);
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
