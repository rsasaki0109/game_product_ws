using System;
using System.Collections;
using UnityEngine;

namespace ColorTurfClash
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class Combatant : MonoBehaviour
    {
        [SerializeField] private float maxHealth = 100f;
        [SerializeField] private float moveSpeed = 6.8f;
        [SerializeField] private float dashSpeed = 16f;
        [SerializeField] private float dashDuration = 0.18f;
        [SerializeField] private float dashCooldown = 2.8f;
        [SerializeField] private float shootInterval = 0.24f;
        [SerializeField] private float shotPaintRadius = 1.65f;
        [SerializeField] private float hitRadius = 1.1f;
        [SerializeField] private float shotDamage = 34f;
        [SerializeField] private float respawnDelay = 2.0f;

        private CharacterController characterController;
        private Renderer[] visualRenderers;
        private Vector3 spawnPoint;
        private float currentHealth;
        private float nextShotAt;
        private float nextDashAt;
        private float respawnAvailableAt;
        private Coroutine hitFlashCoroutine;

        public event Action<Combatant, Combatant> Eliminated;
        public event Action<Combatant> Respawned;
        public event Action<Combatant, Combatant> Damaged;

        public TeamSide Team { get; private set; }
        public bool IsAlive { get; private set; }
        public float HealthNormalized => Mathf.Clamp01(currentHealth / maxHealth);
        public float MoveSpeed => moveSpeed;
        public float DashSpeed => dashSpeed;
        public float DashDuration => dashDuration;
        public float DashCooldownRemaining => Mathf.Max(0f, nextDashAt - Time.time);
        public float RespawnRemaining => IsAlive ? 0f : Mathf.Max(0f, respawnAvailableAt - Time.time);
        public float ShotPaintRadius => shotPaintRadius;
        public float HitRadius => hitRadius;
        public float ShotDamage => shotDamage;
        public Vector3 CenterPoint => transform.position + Vector3.up * 0.95f;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
        }

        public void Initialize(TeamSide team, Vector3 initialSpawnPoint)
        {
            Team = team;
            spawnPoint = initialSpawnPoint;
            currentHealth = maxHealth;
            IsAlive = true;
            visualRenderers = GetComponentsInChildren<Renderer>();
        }

        public void SetSpawnPoint(Vector3 point)
        {
            spawnPoint = point;
        }

        public bool CanShoot()
        {
            return IsAlive && Time.time >= nextShotAt;
        }

        public void MarkShotFired()
        {
            nextShotAt = Time.time + shootInterval;
        }

        public bool CanDash()
        {
            return IsAlive && Time.time >= nextDashAt;
        }

        public void MarkDashUsed()
        {
            nextDashAt = Time.time + dashCooldown;
        }

        public Vector3 GetShotOrigin()
        {
            return transform.position + transform.forward * 0.72f + Vector3.up * 1.02f;
        }

        public void ApplyHit(Combatant attacker, float damage)
        {
            if (!IsAlive)
            {
                return;
            }

            currentHealth = Mathf.Max(0f, currentHealth - damage);
            Damaged?.Invoke(this, attacker);
            TriggerHitFlash();
            if (currentHealth > 0f)
            {
                return;
            }

            StartCoroutine(RespawnRoutine(attacker));
        }

        private IEnumerator RespawnRoutine(Combatant attacker)
        {
            IsAlive = false;
            respawnAvailableAt = Time.time + respawnDelay;
            Eliminated?.Invoke(this, attacker);
            characterController.enabled = false;
            SetVisualsVisible(false);
            yield return new WaitForSeconds(respawnDelay);
            transform.position = spawnPoint;
            currentHealth = maxHealth;
            SetVisualsVisible(true);
            characterController.enabled = true;
            IsAlive = true;
            Respawned?.Invoke(this);
        }

        private void TriggerHitFlash()
        {
            if (hitFlashCoroutine != null)
            {
                StopCoroutine(hitFlashCoroutine);
            }

            hitFlashCoroutine = StartCoroutine(HitFlashRoutine());
        }

        private IEnumerator HitFlashRoutine()
        {
            if (visualRenderers == null || visualRenderers.Length == 0)
            {
                yield break;
            }

            var previousColors = new Color[visualRenderers.Length];
            for (var index = 0; index < visualRenderers.Length; index++)
            {
                previousColors[index] = visualRenderers[index].material.color;
                visualRenderers[index].material.color = Color.white;
            }

            yield return new WaitForSeconds(0.08f);

            for (var index = 0; index < visualRenderers.Length; index++)
            {
                if (visualRenderers[index] != null)
                {
                    visualRenderers[index].material.color = previousColors[index];
                }
            }

            hitFlashCoroutine = null;
        }

        private void SetVisualsVisible(bool isVisible)
        {
            foreach (var visualRenderer in visualRenderers)
            {
                visualRenderer.enabled = isVisible;
            }
        }
    }
}
