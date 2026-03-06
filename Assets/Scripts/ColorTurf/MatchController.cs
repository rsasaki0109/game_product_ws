using System;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace ColorTurfClash
{
    public sealed class MatchController : MonoBehaviour
    {
        private static bool restartIntoMatchOnLoad;

        private enum MatchState
        {
            Title,
            Countdown,
            Playing,
            Finished,
        }

        [SerializeField] private float countdownSeconds = 3f;
        [SerializeField] private float matchSeconds = 75f;

        private MatchState state;
        private bool autoStartMatch;
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
        public bool IsTitleScreen => state == MatchState.Title;
        public bool IsCountdown => state == MatchState.Countdown;
        public float MatchRemaining => Mathf.Max(0f, matchRemaining);
        public Combatant Player => player;
        public float PlayerDamageFlash => Mathf.Clamp01((playerDamageFlashUntil - Time.time) / 0.22f);
        public int SolarSplats => solarSplats;
        public int TideSplats => tideSplats;

        public void Initialize(TurfArena arena, Combatant playerCombatant, Combatant[] solarTeamMembers, Combatant[] tideTeamMembers, HudController hudController, bool autoStart = false)
        {
            Arena = arena;
            player = playerCombatant;
            solarTeam = solarTeamMembers ?? Array.Empty<Combatant>();
            tideTeam = tideTeamMembers ?? Array.Empty<Combatant>();
            hud = hudController;
            autoStartMatch = autoStart || restartIntoMatchOnLoad;
            restartIntoMatchOnLoad = false;

            matchRemaining = matchSeconds;
            state = autoStart ? MatchState.Countdown : MatchState.Title;
            countdownRemaining = autoStart ? countdownSeconds : 0f;

            RegisterTeam(solarTeam);
            RegisterTeam(tideTeam);

            PostFeed(autoStart ? "Paint the floor. Own the clock." : "Press Space to enter the arena", 99f);
        }

        private void Update()
        {
            if (Arena == null || player == null || hud == null || solarTeam.Length == 0 || tideTeam.Length == 0)
            {
                return;
            }

            switch (state)
            {
                case MatchState.Title:
                    if (autoStartMatch || Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0) || Input.GetKeyDown(KeyCode.Return))
                    {
                        StartCountdown();
                    }
                    break;
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
                        restartIntoMatchOnLoad = true;
                        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
                    }
                    else if (Input.GetKeyDown(KeyCode.T) || Input.GetKeyDown(KeyCode.Escape))
                    {
                        restartIntoMatchOnLoad = false;
                        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
                    }
                    break;
            }

            if (!IsTitleScreen && Input.GetKeyDown(KeyCode.Escape))
            {
                restartIntoMatchOnLoad = false;
                SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
            }

            hud.Render(this);
        }

        public Vector3 GetPaintPriorityPoint(Combatant requester)
        {
            if (Arena == null || requester == null)
            {
                return Vector3.zero;
            }

            return Arena.GetBestPaintTarget(requester.Team, requester.transform.position);
        }

        public void ResolveShot(Combatant attacker, Vector3 targetPoint)
        {
            if (!IsPlaying || attacker == null || !attacker.IsAlive)
            {
                return;
            }

            var shotColor = TeamPalette.GetColor(attacker.Team);
            CreateMuzzleFlash(attacker.GetShotOrigin(), shotColor);
            PaintProjectile.Launch(this, attacker, targetPoint);
        }

        public void ResolveProjectileImpact(Combatant attacker, Vector3 targetPoint)
        {
            if (!IsPlaying || Arena == null || attacker == null)
            {
                return;
            }

            var clampedTarget = Arena.ClampToArena(targetPoint, 0.35f);
            Arena.PaintCircle(clampedTarget, attacker.ShotPaintRadius, attacker.Team);
            var teamColor = TeamPalette.GetColor(attacker.Team);
            CreatePaintBurst(clampedTarget, teamColor);

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
                    defender.ApplyHit(attacker, attacker.ShotDamage);
                    CreateHitBurst(defender.CenterPoint, teamColor);
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
            if (state == MatchState.Title)
            {
                return "Splash. Dash. Control the map.";
            }

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
                MatchState.Title => "Demo",
                MatchState.Countdown => "Countdown",
                MatchState.Playing => "Live",
                MatchState.Finished => "Result",
                _ => string.Empty,
            };
        }

        private void StartCountdown()
        {
            countdownRemaining = countdownSeconds;
            matchRemaining = matchSeconds;
            state = MatchState.Countdown;
            PostFeed("Paint the floor. Own the clock.", 2.4f);
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

        private void OnCombatantEliminated(Combatant victim, Combatant attacker)
        {
            var attackerTeam = attacker != null ? attacker.Team : (victim.Team == TeamSide.Solar ? TeamSide.Tide : TeamSide.Solar);
            Arena.PaintCircle(victim.transform.position, 1.35f, attackerTeam);
            CreatePaintBurst(victim.transform.position + Vector3.up * 0.12f, TeamPalette.GetColor(attackerTeam));
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

        private void OnCombatantDamaged(Combatant combatant, Combatant attacker)
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

        private static void CreateMuzzleFlash(Vector3 position, Color color)
        {
            PulseFx.Create(
                "MuzzleFlash",
                PrimitiveType.Sphere,
                position,
                Quaternion.identity,
                Color.Lerp(color, Color.white, 0.3f),
                Vector3.one * 0.16f,
                Vector3.one * 0.52f,
                0.12f,
                0.25f);

            for (var index = 0; index < 3; index++)
            {
                var velocity = (UnityEngine.Random.onUnitSphere + Vector3.up * 0.2f).normalized * UnityEngine.Random.Range(2.2f, 4.2f);
                BurstParticle.CreateSphere("MuzzleSpark", position, Vector3.one * UnityEngine.Random.Range(0.08f, 0.12f), Color.white, velocity, 0.14f, 1.4f, UnityEngine.Random.Range(320f, 540f));
            }
        }

        private static void CreatePaintBurst(Vector3 position, Color color)
        {
            PulseFx.Create(
                "PaintPulse",
                PrimitiveType.Cylinder,
                position + Vector3.up * 0.04f,
                Quaternion.identity,
                Color.Lerp(color, Color.white, 0.15f),
                new Vector3(0.2f, 0.03f, 0.2f),
                new Vector3(1.8f, 0.03f, 1.8f),
                0.18f);

            for (var index = 0; index < 10; index++)
            {
                var direction = (UnityEngine.Random.insideUnitSphere + Vector3.up * 0.25f).normalized;
                var velocity = direction * UnityEngine.Random.Range(3.8f, 7.2f);
                var scale = Vector3.one * UnityEngine.Random.Range(0.08f, 0.18f);
                BurstParticle.CreateSphere("PaintShard", position + Vector3.up * 0.18f, scale, color, velocity, UnityEngine.Random.Range(0.22f, 0.34f), 12f, UnityEngine.Random.Range(240f, 540f));
            }
        }

        private static void CreateHitBurst(Vector3 position, Color color)
        {
            PulseFx.Create(
                "HitPulse",
                PrimitiveType.Sphere,
                position,
                Quaternion.identity,
                Color.Lerp(color, Color.white, 0.55f),
                Vector3.one * 0.18f,
                Vector3.one * 0.65f,
                0.14f,
                0.5f);

            for (var index = 0; index < 8; index++)
            {
                var burstColor = index % 2 == 0 ? Color.white : Color.Lerp(color, Color.white, 0.35f);
                var velocity = UnityEngine.Random.onUnitSphere * UnityEngine.Random.Range(2.5f, 5.8f);
                velocity.y = Mathf.Abs(velocity.y) + 1.2f;
                BurstParticle.CreateSphere("HitShard", position, Vector3.one * UnityEngine.Random.Range(0.08f, 0.14f), burstColor, velocity, UnityEngine.Random.Range(0.12f, 0.20f), 10f, UnityEngine.Random.Range(360f, 620f));
            }
        }
    }
}
