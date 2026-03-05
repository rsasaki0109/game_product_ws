using UnityEngine;

namespace ColorTurfClash
{
    public sealed class HudController : MonoBehaviour
    {
        private GUIStyle titleStyle;
        private GUIStyle timerStyle;
        private GUIStyle scoreStyle;
        private GUIStyle statusStyle;
        private GUIStyle feedStyle;

        private string titleText = string.Empty;
        private string timerText = string.Empty;
        private string scoreText = string.Empty;
        private string statusText = string.Empty;
        private string feedText = string.Empty;
        private string resultText = string.Empty;
        private float playerDamageFlash;

        public void Render(MatchController match)
        {
            titleText = "COLOR TURF CLASH\nOriginal territory shooter prototype";
            timerText = $"{match.GetStateLabel()}  {match.MatchRemaining:00.0}s";
            scoreText = $"SOLAR {match.GetCoveragePercent(TeamSide.Solar)}%     TIDE {match.GetCoveragePercent(TeamSide.Tide)}%";
            var playerState = match.Player.IsAlive
                ? $"Player HP {Mathf.CeilToInt(match.Player.HealthNormalized * 100f)}"
                : $"Respawn {match.Player.RespawnRemaining:0.0}s";
            var botState = match.Bot.IsAlive
                ? $"Bot HP {Mathf.CeilToInt(match.Bot.HealthNormalized * 100f)}"
                : $"Bot respawn {match.Bot.RespawnRemaining:0.0}s";
            statusText =
                "Move WASD  |  Shoot LMB or F  |  Dash Shift/Space\n" +
                $"{playerState}  |  Dash CD {match.Player.DashCooldownRemaining:0.0}s  |  Splats {match.SolarSplats}\n" +
                $"{botState}  |  Enemy splats {match.TideSplats}";
            feedText = match.GetFeedText();
            resultText = match.GetResultSummary();
            playerDamageFlash = match.PlayerDamageFlash;
        }

        private void OnGUI()
        {
            EnsureStyles();

            if (playerDamageFlash > 0f)
            {
                DrawPanel(new Rect(0f, 0f, Screen.width, Screen.height), new Color(1f, 0.15f, 0.1f, playerDamageFlash * 0.16f));
            }

            GUI.Label(new Rect(24f, 18f, 680f, 80f), titleText, titleStyle);
            GUI.Label(new Rect(Screen.width * 0.5f - 180f, 18f, 360f, 42f), timerText, timerStyle);

            var scoreRect = new Rect(Screen.width - 440f, 18f, 420f, 42f);
            GUI.color = TeamPalette.GetColor(TeamSide.Solar);
            GUI.Label(new Rect(scoreRect.x, scoreRect.y, 180f, scoreRect.height), $"SOLAR {ExtractTeamScore(scoreText, true)}", scoreStyle);
            GUI.color = TeamPalette.GetColor(TeamSide.Tide);
            GUI.Label(new Rect(scoreRect.x + 220f, scoreRect.y, 180f, scoreRect.height), $"TIDE {ExtractTeamScore(scoreText, false)}", scoreStyle);
            GUI.color = Color.white;

            DrawPanel(new Rect(16f, Screen.height - 136f, 620f, 112f), new Color(0f, 0f, 0f, 0.42f));
            GUI.Label(new Rect(28f, Screen.height - 126f, 600f, 96f), statusText, statusStyle);

            DrawPanel(new Rect(Screen.width * 0.5f - 340f, Screen.height * 0.5f - 68f, 680f, 136f), new Color(0f, 0f, 0f, 0.28f));
            GUI.Label(new Rect(Screen.width * 0.5f - 320f, Screen.height * 0.5f - 28f, 640f, 80f), feedText, feedStyle);

            if (!string.IsNullOrEmpty(resultText) && timerText.StartsWith("Result"))
            {
                DrawPanel(new Rect(Screen.width * 0.5f - 300f, Screen.height * 0.5f - 170f, 600f, 180f), new Color(0f, 0f, 0f, 0.66f));
                GUI.Label(new Rect(Screen.width * 0.5f - 270f, Screen.height * 0.5f - 140f, 540f, 120f), resultText, feedStyle);
                GUI.Label(new Rect(Screen.width * 0.5f - 230f, Screen.height * 0.5f + 18f, 460f, 40f), "Press Play again in the editor to retry", statusStyle);
            }
        }

        private void EnsureStyles()
        {
            if (titleStyle != null)
            {
                return;
            }

            titleStyle = CreateStyle(24, FontStyle.Bold, TextAnchor.UpperLeft);
            timerStyle = CreateStyle(30, FontStyle.Bold, TextAnchor.UpperCenter);
            scoreStyle = CreateStyle(26, FontStyle.Bold, TextAnchor.UpperLeft);
            statusStyle = CreateStyle(18, FontStyle.Normal, TextAnchor.UpperLeft);
            feedStyle = CreateStyle(32, FontStyle.Bold, TextAnchor.MiddleCenter);
        }

        private static GUIStyle CreateStyle(int fontSize, FontStyle fontStyle, TextAnchor alignment)
        {
            var style = new GUIStyle(GUI.skin.label)
            {
                fontSize = fontSize,
                fontStyle = fontStyle,
                alignment = alignment,
                richText = false,
                wordWrap = true,
            };
            style.normal.textColor = Color.white;
            return style;
        }

        private static void DrawPanel(Rect rect, Color color)
        {
            var previousColor = GUI.color;
            GUI.color = color;
            GUI.DrawTexture(rect, Texture2D.whiteTexture);
            GUI.color = previousColor;
        }

        private static string ExtractTeamScore(string source, bool isSolar)
        {
            var parts = source.Split("     ");
            if (parts.Length != 2)
            {
                return "0%";
            }

            return isSolar ? parts[0].Replace("SOLAR ", string.Empty) : parts[1].Replace("TIDE ", string.Empty);
        }
    }
}
