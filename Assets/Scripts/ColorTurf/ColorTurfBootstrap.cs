using UnityEngine;

namespace ColorTurfClash
{
    public sealed class ColorTurfBootstrap : MonoBehaviour
    {
        private void Awake()
        {
            var isDemoCapture = DemoArgs.HasFlag("-demoCapture");

            Application.targetFrameRate = 120;
            Application.runInBackground = true;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.30f, 0.33f, 0.38f);

            var lightObject = new GameObject("Sun");
            var sun = lightObject.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f, 0.96f, 0.90f);
            sun.intensity = 1.4f;
            lightObject.transform.rotation = Quaternion.Euler(55f, -30f, 0f);

            var arenaObject = new GameObject("Arena");
            var arena = arenaObject.AddComponent<TurfArena>();
            arena.Build();

            var hud = new GameObject("HUD").AddComponent<HudController>();
            var match = new GameObject("MatchController").AddComponent<MatchController>();

            var player = CreateCombatant("Player_Solar", TeamSide.Solar, arena.GetSpawnPoint(TeamSide.Solar, 0, 2), TeamPalette.Solar);
            var allyBot = CreateCombatant("Wing_Solar", TeamSide.Solar, arena.GetSpawnPoint(TeamSide.Solar, 1, 2), Color.Lerp(TeamPalette.Solar, Color.white, 0.22f));
            var enemyBotA = CreateCombatant("Bot_Tide_A", TeamSide.Tide, arena.GetSpawnPoint(TeamSide.Tide, 0, 2), TeamPalette.Tide);
            var enemyBotB = CreateCombatant("Bot_Tide_B", TeamSide.Tide, arena.GetSpawnPoint(TeamSide.Tide, 1, 2), Color.Lerp(TeamPalette.Tide, Color.white, 0.18f));

            var solarTeam = new[] { player, allyBot };
            var tideTeam = new[] { enemyBotA, enemyBotB };

            var cameraObject = new GameObject("PrototypeCamera");
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.AddComponent<Camera>();
            camera.backgroundColor = new Color(0.07f, 0.08f, 0.11f);
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.fieldOfView = 55f;
            var followCamera = cameraObject.AddComponent<FollowCamera>();
            followCamera.Initialize(player.transform);

            if (isDemoCapture)
            {
                player.gameObject.AddComponent<BotController>().Initialize(match);
                cameraObject.AddComponent<DemoCaptureController>();
            }
            else
            {
                player.gameObject.AddComponent<PlayerController>().Initialize(match, camera);
            }

            var allyBotController = allyBot.gameObject.AddComponent<BotController>();
            var enemyBotControllerA = enemyBotA.gameObject.AddComponent<BotController>();
            var enemyBotControllerB = enemyBotB.gameObject.AddComponent<BotController>();

            match.Initialize(arena, player, solarTeam, tideTeam, hud);
            allyBotController.Initialize(match);
            enemyBotControllerA.Initialize(match);
            enemyBotControllerB.Initialize(match);
        }

        private static Combatant CreateCombatant(string objectName, TeamSide team, Vector3 spawnPoint, Color bodyColor)
        {
            var root = new GameObject(objectName);
            root.transform.position = spawnPoint;

            var controller = root.AddComponent<CharacterController>();
            controller.radius = 0.45f;
            controller.height = 1.8f;
            controller.center = new Vector3(0f, 0.9f, 0f);
            controller.stepOffset = 0.3f;
            controller.slopeLimit = 45f;

            var combatant = root.AddComponent<Combatant>();

            var body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "Body";
            body.transform.SetParent(root.transform, false);
            body.transform.localPosition = new Vector3(0f, 0.9f, 0f);
            body.transform.localScale = new Vector3(0.9f, 0.9f, 0.9f);

            var bodyCollider = body.GetComponent<Collider>();
            if (bodyCollider != null)
            {
                Destroy(bodyCollider);
            }

            var bodyMaterial = RuntimeMaterialFactory.CreateColorMaterial(bodyColor);
            body.GetComponent<Renderer>().sharedMaterial = bodyMaterial;

            var nozzle = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            nozzle.name = "Nozzle";
            nozzle.transform.SetParent(root.transform, false);
            nozzle.transform.localPosition = new Vector3(0f, 1.05f, 0.55f);
            nozzle.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            nozzle.transform.localScale = new Vector3(0.14f, 0.34f, 0.14f);

            var nozzleCollider = nozzle.GetComponent<Collider>();
            if (nozzleCollider != null)
            {
                Destroy(nozzleCollider);
            }

            var nozzleMaterial = RuntimeMaterialFactory.CreateColorMaterial(Color.white);
            nozzle.GetComponent<Renderer>().sharedMaterial = nozzleMaterial;

            combatant.Initialize(team, spawnPoint);
            return combatant;
        }
    }
}
