using UnityEngine;

namespace ColorTurfClash
{
    public sealed class PaintProjectile : MonoBehaviour
    {
        private MatchController matchController;
        private Combatant attacker;
        private Vector3 startPoint;
        private Vector3 targetPoint;
        private Vector3 previousPosition;
        private Transform orbVisual;
        private float travelDuration;
        private float travelProgress;
        private float spinSpeed;

        public static void Launch(MatchController match, Combatant source, Vector3 worldTarget)
        {
            var projectile = new GameObject($"PaintProjectile_{TeamPalette.GetName(source.Team)}");
            var component = projectile.AddComponent<PaintProjectile>();
            component.Initialize(match, source, worldTarget);
        }

        private void Initialize(MatchController match, Combatant source, Vector3 worldTarget)
        {
            matchController = match;
            attacker = source;

            startPoint = source.GetShotOrigin();
            targetPoint = match.Arena.ClampToArena(worldTarget, 0.35f) + Vector3.up * 0.15f;
            previousPosition = startPoint;
            travelDuration = Mathf.Clamp(Vector3.Distance(startPoint, targetPoint) / 24f, 0.09f, 0.38f);
            spinSpeed = Random.Range(240f, 360f);

            transform.position = startPoint;

            var projectileOrb = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            projectileOrb.name = "Orb";
            projectileOrb.transform.SetParent(transform, false);
            projectileOrb.transform.localScale = Vector3.one * 0.24f;

            var collider = projectileOrb.GetComponent<Collider>();
            if (collider != null)
            {
                Destroy(collider);
            }

            var projectileColor = Color.Lerp(TeamPalette.GetColor(source.Team), Color.white, 0.2f);
            projectileOrb.GetComponent<Renderer>().sharedMaterial = RuntimeMaterialFactory.CreateColorMaterial(projectileColor);
            orbVisual = projectileOrb.transform;

            var trail = gameObject.AddComponent<TrailRenderer>();
            trail.time = 0.12f;
            trail.minVertexDistance = 0.03f;
            trail.startWidth = 0.22f;
            trail.endWidth = 0.04f;
            trail.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            trail.receiveShadows = false;
            trail.sharedMaterial = RuntimeMaterialFactory.CreateColorMaterial(Color.Lerp(projectileColor, Color.white, 0.3f));
        }

        private void Update()
        {
            if (matchController == null || attacker == null)
            {
                Destroy(gameObject);
                return;
            }

            travelProgress += Time.deltaTime / travelDuration;
            var t = Mathf.Clamp01(travelProgress);
            var currentPoint = Vector3.Lerp(startPoint, targetPoint, t);
            currentPoint += Vector3.up * Mathf.Sin(t * Mathf.PI) * 0.5f;
            transform.position = currentPoint;

            var velocity = currentPoint - previousPosition;
            if (velocity.sqrMagnitude > 0.0001f)
            {
                transform.rotation = Quaternion.LookRotation(velocity.normalized, Vector3.up);
            }

            if (orbVisual != null)
            {
                orbVisual.Rotate(Vector3.forward, spinSpeed * Time.deltaTime, Space.Self);
            }

            previousPosition = currentPoint;

            if (t < 1f)
            {
                return;
            }

            matchController.ResolveProjectileImpact(attacker, targetPoint);
            Destroy(gameObject);
        }
    }
}
