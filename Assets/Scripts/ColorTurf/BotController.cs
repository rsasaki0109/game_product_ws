using UnityEngine;

namespace ColorTurfClash
{
    public enum BotRole
    {
        Skirmisher,
        Painter,
    }

    [RequireComponent(typeof(Combatant))]
    [RequireComponent(typeof(CharacterController))]
    public sealed class BotController : MonoBehaviour
    {
        [SerializeField] private BotRole role = BotRole.Skirmisher;

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

        public void Initialize(MatchController match, BotRole assignedRole = BotRole.Skirmisher)
        {
            matchController = match;
            role = assignedRole;
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

            var paintTarget = matchController.GetPaintPriorityPoint(combatant);
            if (Time.time >= nextDecisionAt)
            {
                nextDecisionAt = Time.time + Random.Range(0.8f, 1.6f);
                moveTarget = role == BotRole.Painter
                    ? paintTarget
                    : matchController.Arena.GetRandomPoint(2.2f) + Vector3.up * 0.9f;
            }

            if (Time.time >= nextStrafeFlipAt)
            {
                nextStrafeFlipAt = Time.time + Random.Range(0.6f, 1.2f);
                strafeSign *= -1;
            }

            var toPlayer = playerTarget.transform.position - transform.position;
            var flatToPlayer = new Vector3(toPlayer.x, 0f, toPlayer.z);
            var objectiveDirection = moveTarget - transform.position;
            objectiveDirection.y = 0f;
            if (objectiveDirection.sqrMagnitude > 0.01f)
            {
                objectiveDirection.Normalize();
            }

            var desiredDirection = flatToPlayer.normalized;
            if (role == BotRole.Painter)
            {
                desiredDirection = flatToPlayer.magnitude < 6f
                    ? (flatToPlayer.normalized * 0.28f + objectiveDirection * 0.72f).normalized
                    : objectiveDirection;
            }
            else if (flatToPlayer.magnitude > 8f)
            {
                desiredDirection = objectiveDirection;
            }
            else
            {
                var strafe = Vector3.Cross(Vector3.up, flatToPlayer.normalized) * strafeSign;
                desiredDirection = (flatToPlayer.normalized * 0.75f + strafe * 0.55f).normalized;
            }

            var shouldDash = role == BotRole.Painter
                ? objectiveDirection.sqrMagnitude > 0.01f && flatToPlayer.magnitude > 8f
                : flatToPlayer.magnitude is > 3.5f and < 8.5f;
            if (shouldDash && combatant.CanDash())
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

            if (combatant.CanShoot())
            {
                combatant.MarkShotFired();

                Vector3 aimPoint;
                if (role == BotRole.Painter && flatToPlayer.magnitude > 7f)
                {
                    aimPoint = paintTarget + new Vector3(Random.Range(-0.9f, 0.9f), 0f, Random.Range(-0.9f, 0.9f));
                }
                else if (flatToPlayer.magnitude <= 13.5f)
                {
                    var lead = playerTarget.transform.position + playerTarget.transform.forward * 0.7f;
                    var jitter = new Vector3(Random.Range(-1.1f, 1.1f), 0f, Random.Range(-1.1f, 1.1f));
                    aimPoint = lead + jitter;
                }
                else
                {
                    aimPoint = paintTarget + new Vector3(Random.Range(-0.7f, 0.7f), 0f, Random.Range(-0.7f, 0.7f));
                }

                matchController.ResolveShot(combatant, aimPoint);
            }
        }
    }
}
