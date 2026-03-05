using UnityEngine;

namespace ColorTurfClash
{
    public enum TeamSide
    {
        Neutral,
        Solar,
        Tide,
    }

    public static class TeamPalette
    {
        public static readonly Color Neutral = new(0.20f, 0.22f, 0.25f);
        public static readonly Color Solar = new(1.00f, 0.43f, 0.12f);
        public static readonly Color Tide = new(0.08f, 0.78f, 0.92f);

        public static Color GetColor(TeamSide team)
        {
            return team switch
            {
                TeamSide.Solar => Solar,
                TeamSide.Tide => Tide,
                _ => Neutral,
            };
        }

        public static string GetName(TeamSide team)
        {
            return team switch
            {
                TeamSide.Solar => "Solar",
                TeamSide.Tide => "Tide",
                _ => "Neutral",
            };
        }
    }
}
