using UnityEngine;

namespace ColorTurfClash
{
    public sealed class FollowCamera : MonoBehaviour
    {
        [SerializeField] private Vector3 offset = new(0f, 18f, -13f);
        [SerializeField] private float followSharpness = 7f;
        [SerializeField] private float lookHeight = 1.6f;

        private Transform target;

        public void Initialize(Transform followTarget)
        {
            target = followTarget;
            transform.position = followTarget.position + offset;
            transform.LookAt(followTarget.position + Vector3.up * lookHeight);
        }

        private void LateUpdate()
        {
            if (target == null)
            {
                return;
            }

            var desiredPosition = target.position + offset;
            transform.position = Vector3.Lerp(transform.position, desiredPosition, 1f - Mathf.Exp(-followSharpness * Time.deltaTime));
            transform.LookAt(target.position + Vector3.up * lookHeight);
        }
    }
}
