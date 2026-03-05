using UnityEngine;

namespace ColorTurfClash
{
    public sealed class MatchController : MonoBehaviour
    {
        private enum MatchState
        {
            Countdown,
            Playing,
            Finished,
        }

        [SerializeField] private float countdownSeconds = 3f;
        [SerializeField] private float matchSeconds = 75f;

        private MatchState state;
        private float countdownRemaining;
        private float matchRemaining;
        private string feedMessage = string.Empty;
        private float feedExpiresAt;
        private float playerDamageFlashUntil;
        private int solarSplats;
        private int tideSplats;
        private HudController hud;
        private Combatant player;
        private Combatant bot;

        public TurfArena Arena { get; private set; }
        public bool IsPlaying => state == MatchState.Playing;
        public bool IsFinished => state == MatchState.Finished;
        public float MatchRemaining => Mathf.Max(0f, matchRemaining);
        public Combatant Player => player;
        public Combatant Bot => bot;
        public float PlayerDamageFlash => Mathf.Clamp01((playerDamageFlashUntil - Time.time) / 0.22f);
        public int SolarSplats => solarSplats;
        public int TideSplats => tideSplats;

        public void Initialize(TurfArena arena, Combatant playerCombatant, Combatant botCombatant, HudController hudController)
        {
            Arena = arena;
            player = playerCombatant;
            bot = botCombatant;
            hud = hudController;

            countdownRemaining = countdownSeconds;
            matchRemaining = matchSeconds;
            state = MatchState.Countdown;

            player.Eliminated += OnCombatantEliminated;
            bot.Eliminated += OnCombatantEliminated;
            player.Respawned += OnCombatantRespawned;
            bot.Respawned += OnCombatantRespawned;
            player.Damaged += OnCombatantDamaged;
            bot.Damaged += OnCombatantDamaged;

            PostFeed("Paint the floor. Own the clock.", 2.4f);
        }

        private void Update()
        {
            if (Arena == null || player == null || bot == null || hud == null)
            {
                return;
            }

            switch (state)
            {
                case MatchState.Countdown:
                    countdownRemaining -= Time.deltaTime;
                    if (countdownRemaining <= 0f)
                    {
                        state = MatchState.Playing;
                        PostFeed("GO", 1.2f);
                    }
                    break;
                case MatchState.Playing:
                    matchRemaining -= Time.deltaTime;
                    if (matchRemaining <= 0f)
                    {
                        matchRemaining = 0f;
                        state = MatchState.Finished;
                        PostFeed($"{GetWinnerLabel()} controls the arena", 99f);
                    }
                    break;
            }

            hud.Render(this);
        }

        public void ResolveShot(Combatant attacker, Vector3 targetPoint)
        {
            if (!IsPlaying || attacker == null || !attacker.IsAlive)
            {
                return;
            }

            var clampedTarget = Arena.ClampToArena(targetPoint, 0.35f);
            Arena.PaintCircle(clampedTarget, attacker.ShotPaintRadius, attacker.Team);
            CreateImpactMarker(clampedTarget, TeamPalette.GetColor(attacker.Team));

            var defender = attacker == player ? bot : player;
            if (defender.IsAlive)
            {
                var delta = defender.transform.position - clampedTarget;
                delta.y = 0f;
                if (delta.magnitude <= attacker.HitRadius)
                {
                    defender.ApplyHit(attacker.ShotDamage);
                    PostFeed($"{TeamPalette.GetName(attacker.Team)} splashed {TeamPalette.GetName(defender.Team)}", 1.2f);
                }
            }
        }

        public float GetCoverageRatio(TeamSide team)
        {
            return Arena.TotalTiles == 0 ? 0f : Arena.CountTiles(team) / (float)Arena.TotalTiles;
        }

        public int GetCoveragePercent(TeamSide team)
        {
            return Mathf.RoundToInt(GetCoverageRatio(team) * 100f);
        }

        public string GetFeedText()
        {
            if (state == MatchState.Countdown)
            {
                return $"Match starts in {Mathf.CeilToInt(countdownRemaining)}";
            }

            if (Time.time <= feedExpiresAt)
            {
                return feedMessage;
            }

            return state == MatchState.Finished ? GetWinnerLabel() : "Keep painting";
        }

        public string GetWinnerLabel()
        {
            var solar = GetCoveragePercent(TeamSide.Solar);
            var tide = GetCoveragePercent(TeamSide.Tide);
            if (solar == tide)
            {
                return "Draw";
            }

            return solar > tide ? "Solar wins" : "Tide wins";
        }

        public string GetResultSummary()
        {
            return $"{GetWinnerLabel()}\nSolar {GetCoveragePercent(TeamSide.Solar)}%  |  Tide {GetCoveragePercent(TeamSide.Tide)}%\nSplats {solarSplats} - {tideSplats}";
        }

        public string GetStateLabel()
        {
            return state switch
            {
                MatchState.Countdown => "Countdown",
                MatchState.Playing => "Live",
                MatchState.Finished => "Result",
                _ => string.Empty,
            };
        }

        private void OnCombatantEliminated(Combatant victim)
        {
            var attackerTeam = victim == player ? TeamSide.Tide : TeamSide.Solar;
            Arena.PaintCircle(victim.transform.position, 1.35f, attackerTeam);
            if (attackerTeam == TeamSide.Solar)
            {
                solarSplats++;
            }
            else
            {
                tideSplats++;
            }

            PostFeed($"{TeamPalette.GetName(attackerTeam)} splat", 1.25f);
        }

        private void OnCombatantRespawned(Combatant combatant)
        {
            Arena.PaintCircle(combatant.transform.position, 1.5f, combatant.Team);
            PostFeed($"{TeamPalette.GetName(combatant.Team)} re-entered", 1.1f);
        }

        private void OnCombatantDamaged(Combatant combatant)
        {
            if (combatant == player)
            {
                playerDamageFlashUntil = Time.time + 0.22f;
            }
        }

        private void PostFeed(string message, float duration)
        {
            feedMessage = message;
            feedExpiresAt = Time.time + duration;
        }

        private static void CreateImpactMarker(Vector3 position, Color color)
        {
            var marker = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            marker.name = "PaintImpact";
            marker.transform.position = position + Vector3.up * 0.2f;
            marker.transform.localScale = Vector3.one * 0.45f;

            var collider = marker.GetComponent<Collider>();
            if (collider != null)
            {
                Destroy(collider);
            }

            var renderer = marker.GetComponent<Renderer>();
            var material = new Material(Shader.Find("Standard"));
            material.color = color;
            renderer.sharedMaterial = material;

            Destroy(marker, 0.22f);
            Destroy(material, 0.25f);
        }
    }
}
