using System;
using UnityEngine;
using UnityEngine.SceneManagement;

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
        private Combatant[] solarTeam = Array.Empty<Combatant>();
        private Combatant[] tideTeam = Array.Empty<Combatant>();

        public TurfArena Arena { get; private set; }
        public bool IsPlaying => state == MatchState.Playing;
        public bool IsFinished => state == MatchState.Finished;
        public float MatchRemaining => Mathf.Max(0f, matchRemaining);
        public Combatant Player => player;
        public float PlayerDamageFlash => Mathf.Clamp01((playerDamageFlashUntil - Time.time) / 0.22f);
        public int SolarSplats => solarSplats;
        public int TideSplats => tideSplats;

        public void Initialize(TurfArena arena, Combatant playerCombatant, Combatant[] solarTeamMembers, Combatant[] tideTeamMembers, HudController hudController)
        {
            Arena = arena;
            player = playerCombatant;
            solarTeam = solarTeamMembers ?? Array.Empty<Combatant>();
            tideTeam = tideTeamMembers ?? Array.Empty<Combatant>();
            hud = hudController;

            countdownRemaining = countdownSeconds;
            matchRemaining = matchSeconds;
            state = MatchState.Countdown;

            RegisterTeam(solarTeam);
            RegisterTeam(tideTeam);

            PostFeed("Paint the floor. Own the clock.", 2.4f);
        }

        private void Update()
        {
            if (Arena == null || player == null || hud == null || solarTeam.Length == 0 || tideTeam.Length == 0)
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
                case MatchState.Finished:
                    if (Input.GetKeyDown(KeyCode.R))
                    {
                        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
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

            var hitCount = 0;
            foreach (var defender in GetOpponents(attacker.Team))
            {
                if (defender == null || !defender.IsAlive)
                {
                    continue;
                }

                var delta = defender.transform.position - clampedTarget;
                delta.y = 0f;
                if (delta.magnitude <= attacker.HitRadius)
                {
                    defender.ApplyHit(attacker.ShotDamage);
                    hitCount++;
                }
            }

            if (hitCount > 0)
            {
                PostFeed($"{TeamPalette.GetName(attacker.Team)} tagged {hitCount}", 0.9f);
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

        public int GetAliveCount(TeamSide team)
        {
            var teamMembers = GetTeamMembers(team);
            var total = 0;
            foreach (var member in teamMembers)
            {
                if (member != null && member.IsAlive)
                {
                    total++;
                }
            }

            return total;
        }

        public int GetTeamSize(TeamSide team)
        {
            return GetTeamMembers(team).Length;
        }

        public Combatant GetPriorityEnemy(Combatant requester, Vector3 origin)
        {
            var opponents = GetOpponents(requester.Team);
            Combatant bestTarget = null;
            var bestDistance = float.MaxValue;

            foreach (var opponent in opponents)
            {
                if (opponent == null || !opponent.IsAlive)
                {
                    continue;
                }

                var sqrDistance = (opponent.transform.position - origin).sqrMagnitude;
                if (sqrDistance >= bestDistance)
                {
                    continue;
                }

                bestDistance = sqrDistance;
                bestTarget = opponent;
            }

            return bestTarget;
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

        private void RegisterTeam(Combatant[] teamMembers)
        {
            foreach (var member in teamMembers)
            {
                if (member == null)
                {
                    continue;
                }

                member.Eliminated += OnCombatantEliminated;
                member.Respawned += OnCombatantRespawned;
                member.Damaged += OnCombatantDamaged;
            }
        }

        private Combatant[] GetOpponents(TeamSide team)
        {
            return team == TeamSide.Solar ? tideTeam : solarTeam;
        }

        private Combatant[] GetTeamMembers(TeamSide team)
        {
            return team switch
            {
                TeamSide.Solar => solarTeam,
                TeamSide.Tide => tideTeam,
                _ => Array.Empty<Combatant>(),
            };
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
