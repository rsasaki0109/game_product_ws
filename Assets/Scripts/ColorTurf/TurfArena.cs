using UnityEngine;

namespace ColorTurfClash
{
    public sealed class TurfArena : MonoBehaviour
    {
        [SerializeField] private int width = 18;
        [SerializeField] private int depth = 18;
        [SerializeField] private float tileSize = 1.2f;
        [SerializeField] private float tileHeight = 0.18f;
        [SerializeField] private float wallHeight = 2.6f;

        private TurfTile[,] tiles;
        private Material tileMaterial;
        private Material wallMaterial;

        public int Width => width;
        public int Depth => depth;
        public float TileSize => tileSize;
        public int TotalTiles => width * depth;
        public float TopY => tileHeight * 0.5f;
        public Vector3 Center => Vector3.up * TopY;

        public void Build()
        {
            if (tiles != null)
            {
                return;
            }

            tiles = new TurfTile[width, depth];
            tileMaterial = CreateMaterial(new Color(0.18f, 0.19f, 0.21f));
            wallMaterial = CreateMaterial(new Color(0.10f, 0.11f, 0.14f));

            var tilesRoot = new GameObject("Tiles").transform;
            tilesRoot.SetParent(transform, false);

            for (var x = 0; x < width; x++)
            {
                for (var z = 0; z < depth; z++)
                {
                    var tileObject = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    tileObject.name = $"Tile_{x}_{z}";
                    tileObject.transform.SetParent(tilesRoot, false);
                    tileObject.transform.position = GridToWorld(x, z);
                    tileObject.transform.localScale = new Vector3(tileSize, tileHeight, tileSize);

                    var tileRenderer = tileObject.GetComponent<Renderer>();
                    tileRenderer.sharedMaterial = tileMaterial;

                    var tile = tileObject.AddComponent<TurfTile>();
                    tile.Initialize(new Vector2Int(x, z), tileRenderer);
                    tiles[x, z] = tile;
                }
            }

            CreateWalls();
            CreateObstacles();
            SeedBases();
        }

        public Vector3 GridToWorld(int x, int z)
        {
            var worldX = (x - (width - 1) * 0.5f) * tileSize;
            var worldZ = (z - (depth - 1) * 0.5f) * tileSize;
            return new Vector3(worldX, TopY, worldZ);
        }

        public Vector3 GetSpawnPoint(TeamSide team)
        {
            return team switch
            {
                TeamSide.Solar => GridToWorld(2, depth / 2) + Vector3.up * 0.9f,
                TeamSide.Tide => GridToWorld(width - 3, depth / 2) + Vector3.up * 0.9f,
                _ => Center + Vector3.up * 0.9f,
            };
        }

        public void SeedBases()
        {
            PaintRect(0, 0, 4, depth, TeamSide.Neutral);
            PaintRect(1, depth / 2 - 2, 3, 4, TeamSide.Solar);
            PaintRect(width - 4, depth / 2 - 2, 3, 4, TeamSide.Tide);
        }

        public void PaintCircle(Vector3 worldPosition, float radius, TeamSide owner)
        {
            var radiusSqr = radius * radius;
            for (var x = 0; x < width; x++)
            {
                for (var z = 0; z < depth; z++)
                {
                    var tileCenter = tiles[x, z].transform.position;
                    var flatDelta = new Vector2(tileCenter.x - worldPosition.x, tileCenter.z - worldPosition.z);
                    if (flatDelta.sqrMagnitude <= radiusSqr)
                    {
                        tiles[x, z].SetOwner(owner);
                    }
                }
            }
        }

        public int CountTiles(TeamSide owner)
        {
            var total = 0;
            for (var x = 0; x < width; x++)
            {
                for (var z = 0; z < depth; z++)
                {
                    if (tiles[x, z].Owner == owner)
                    {
                        total++;
                    }
                }
            }

            return total;
        }

        public Vector3 ClampToArena(Vector3 worldPosition, float padding)
        {
            var halfWidth = (width - 1) * tileSize * 0.5f - padding;
            var halfDepth = (depth - 1) * tileSize * 0.5f - padding;
            worldPosition.x = Mathf.Clamp(worldPosition.x, -halfWidth, halfWidth);
            worldPosition.z = Mathf.Clamp(worldPosition.z, -halfDepth, halfDepth);
            worldPosition.y = TopY;
            return worldPosition;
        }

        public Vector3 GetRandomPoint(float edgePadding)
        {
            var halfWidth = (width - 1) * tileSize * 0.5f - edgePadding;
            var halfDepth = (depth - 1) * tileSize * 0.5f - edgePadding;
            return new Vector3(Random.Range(-halfWidth, halfWidth), TopY, Random.Range(-halfDepth, halfDepth));
        }

        private void PaintRect(int startX, int startZ, int rectWidth, int rectDepth, TeamSide owner)
        {
            for (var x = startX; x < startX + rectWidth; x++)
            {
                for (var z = startZ; z < startZ + rectDepth; z++)
                {
                    if (x >= 0 && x < width && z >= 0 && z < depth)
                    {
                        tiles[x, z].SetOwner(owner);
                    }
                }
            }
        }

        private void CreateWalls()
        {
            var halfWidth = width * tileSize * 0.5f;
            var halfDepth = depth * tileSize * 0.5f;
            CreateWall("NorthWall", new Vector3(0f, wallHeight * 0.5f, halfDepth), new Vector3(width * tileSize + tileSize, wallHeight, tileSize));
            CreateWall("SouthWall", new Vector3(0f, wallHeight * 0.5f, -halfDepth), new Vector3(width * tileSize + tileSize, wallHeight, tileSize));
            CreateWall("EastWall", new Vector3(halfWidth, wallHeight * 0.5f, 0f), new Vector3(tileSize, wallHeight, depth * tileSize + tileSize));
            CreateWall("WestWall", new Vector3(-halfWidth, wallHeight * 0.5f, 0f), new Vector3(tileSize, wallHeight, depth * tileSize + tileSize));
        }

        private void CreateWall(string wallName, Vector3 position, Vector3 scale)
        {
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = wallName;
            wall.transform.SetParent(transform, false);
            wall.transform.localPosition = position;
            wall.transform.localScale = scale;
            wall.GetComponent<Renderer>().sharedMaterial = wallMaterial;
        }

        private void CreateObstacles()
        {
            CreateObstacle(new Vector3(-3.6f, 0.7f, 0f), new Vector3(1.6f, 1.4f, 4.0f));
            CreateObstacle(new Vector3(3.6f, 0.7f, 0f), new Vector3(1.6f, 1.4f, 4.0f));
            CreateObstacle(new Vector3(0f, 0.45f, -5.0f), new Vector3(4.5f, 0.9f, 1.5f));
            CreateObstacle(new Vector3(0f, 0.45f, 5.0f), new Vector3(4.5f, 0.9f, 1.5f));
        }

        private void CreateObstacle(Vector3 position, Vector3 scale)
        {
            var obstacle = GameObject.CreatePrimitive(PrimitiveType.Cube);
            obstacle.name = "ArenaObstacle";
            obstacle.transform.SetParent(transform, false);
            obstacle.transform.localPosition = position;
            obstacle.transform.localScale = scale;
            obstacle.GetComponent<Renderer>().sharedMaterial = wallMaterial;
        }

        private static Material CreateMaterial(Color color)
        {
            var material = new Material(Shader.Find("Standard"));
            material.color = color;
            return material;
        }
    }
}
