using UnityEngine;

namespace ColorTurfClash
{
    [RequireComponent(typeof(Combatant))]
    [RequireComponent(typeof(CharacterController))]
    public sealed class PlayerController : MonoBehaviour
    {
        private CharacterController characterController;
        private Combatant combatant;
        private MatchController matchController;
        private Camera playerCamera;
        private float verticalVelocity;
        private Vector3 dashVelocity;
        private float dashEndAt;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
            combatant = GetComponent<Combatant>();
        }

        public void Initialize(MatchController match, Camera cameraToUse)
        {
            matchController = match;
            playerCamera = cameraToUse;
        }

        private void Update()
        {
            if (matchController == null)
            {
                return;
            }

            var isPlayable = matchController.IsPlaying && combatant.IsAlive;
            var moveInput = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            var moveDirection = GetPlanarMoveDirection(moveInput);

            if (isPlayable && (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.E)) && moveDirection.sqrMagnitude > 0.01f && combatant.CanDash())
            {
                combatant.MarkDashUsed();
                dashVelocity = moveDirection * combatant.DashSpeed;
                dashEndAt = Time.time + combatant.DashDuration;
            }

            var planarVelocity = isPlayable ? moveDirection * combatant.MoveSpeed : Vector3.zero;
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

            if (isPlayable)
            {
                var aimPoint = GetAimPoint();
                RotateToward(aimPoint);

                if ((Input.GetMouseButton(0) || Input.GetKey(KeyCode.F)) && combatant.CanShoot())
                {
                    combatant.MarkShotFired();
                    matchController.ResolveShot(combatant, aimPoint);
                }
            }
        }

        private Vector3 GetPlanarMoveDirection(Vector2 moveInput)
        {
            if (playerCamera == null)
            {
                return new Vector3(moveInput.x, 0f, moveInput.y).normalized;
            }

            var cameraForward = playerCamera.transform.forward;
            cameraForward.y = 0f;
            cameraForward.Normalize();

            var cameraRight = playerCamera.transform.right;
            cameraRight.y = 0f;
            cameraRight.Normalize();

            var direction = cameraForward * moveInput.y + cameraRight * moveInput.x;
            return direction.sqrMagnitude > 1f ? direction.normalized : direction;
        }

        private Vector3 GetAimPoint()
        {
            if (playerCamera == null)
            {
                return transform.position + transform.forward * 4f;
            }

            var groundPlane = new Plane(Vector3.up, new Vector3(0f, matchController.Arena.TopY, 0f));
            var ray = playerCamera.ScreenPointToRay(Input.mousePosition);
            if (groundPlane.Raycast(ray, out var enter))
            {
                return matchController.Arena.ClampToArena(ray.GetPoint(enter), 0.4f);
            }

            return transform.position + transform.forward * 4f;
        }

        private void RotateToward(Vector3 worldPoint)
        {
            var flatDirection = worldPoint - transform.position;
            flatDirection.y = 0f;
            if (flatDirection.sqrMagnitude < 0.001f)
            {
                return;
            }

            transform.rotation = Quaternion.Slerp(
                transform.rotation,
                Quaternion.LookRotation(flatDirection.normalized, Vector3.up),
                18f * Time.deltaTime);
        }
    }
}
