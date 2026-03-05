using UnityEngine;

namespace ColorTurfClash
{
    [RequireComponent(typeof(Combatant))]
    [RequireComponent(typeof(CharacterController))]
    public sealed class BotController : MonoBehaviour
    {
        private CharacterController characterController;
        private Combatant combatant;
        private MatchController matchController;
        private float verticalVelocity;
        private float nextDecisionAt;
        private float nextStrafeFlipAt;
        private Vector3 moveTarget;
        private Vector3 dashVelocity;
        private float dashEndAt;
        private int strafeSign = 1;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
            combatant = GetComponent<Combatant>();
        }

        public void Initialize(MatchController match)
        {
            matchController = match;
            moveTarget = transform.position;
        }

        private void Update()
        {
            if (matchController == null || !matchController.IsPlaying || !combatant.IsAlive)
            {
                return;
            }

            var playerTarget = matchController.GetPriorityEnemy(combatant, transform.position);
            if (playerTarget == null)
            {
                return;
            }

            if (Time.time >= nextDecisionAt)
            {
                nextDecisionAt = Time.time + Random.Range(1.0f, 1.8f);
                moveTarget = matchController.Arena.GetRandomPoint(2.2f) + Vector3.up * 0.9f;
            }

            if (Time.time >= nextStrafeFlipAt)
            {
                nextStrafeFlipAt = Time.time + Random.Range(0.6f, 1.2f);
                strafeSign *= -1;
            }

            var toPlayer = playerTarget.transform.position - transform.position;
            var flatToPlayer = new Vector3(toPlayer.x, 0f, toPlayer.z);
            var desiredDirection = flatToPlayer.normalized;
            if (flatToPlayer.magnitude > 8f)
            {
                desiredDirection = moveTarget - transform.position;
                desiredDirection.y = 0f;
                desiredDirection.Normalize();
            }
            else
            {
                var strafe = Vector3.Cross(Vector3.up, flatToPlayer.normalized) * strafeSign;
                desiredDirection = (flatToPlayer.normalized * 0.75f + strafe * 0.55f).normalized;
            }

            if (flatToPlayer.magnitude is > 3.5f and < 8.5f && combatant.CanDash())
            {
                combatant.MarkDashUsed();
                dashVelocity = desiredDirection * combatant.DashSpeed;
                dashEndAt = Time.time + combatant.DashDuration;
            }

            var planarVelocity = desiredDirection * combatant.MoveSpeed * 0.95f;
            if (Time.time < dashEndAt)
            {
                planarVelocity = dashVelocity;
            }

            if (characterController.isGrounded && verticalVelocity < 0f)
            {
                verticalVelocity = -2f;
            }

            verticalVelocity += Physics.gravity.y * Time.deltaTime;
            characterController.Move((planarVelocity + Vector3.up * verticalVelocity) * Time.deltaTime);

            if (flatToPlayer.sqrMagnitude > 0.1f)
            {
                transform.rotation = Quaternion.Slerp(
                    transform.rotation,
                    Quaternion.LookRotation(flatToPlayer.normalized, Vector3.up),
                    10f * Time.deltaTime);
            }

            if (flatToPlayer.magnitude <= 13.5f && combatant.CanShoot())
            {
                combatant.MarkShotFired();
                var lead = playerTarget.transform.position + desiredDirection * 0.75f;
                var jitter = new Vector3(Random.Range(-1.1f, 1.1f), 0f, Random.Range(-1.1f, 1.1f));
                matchController.ResolveShot(combatant, lead + jitter);
            }
        }
    }
}
