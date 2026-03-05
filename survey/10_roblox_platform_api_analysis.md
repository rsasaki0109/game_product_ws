# 10. RobloxプラットフォームAPI解析（Roblox本体 / Open Cloud）

最終更新: 2026-03-05

## 結論

- Roblox本体で公式公開されているAPI基盤は、`https://apis.roblox.com` 配下の **Open Cloud** が中核。
- Open Cloud v2の公式OpenAPI（`cloud.docs.json`）実測で、**59 paths / 77 operations**。
- 認証は **API Keyが基盤**。77操作のうち **42操作はAPI Keyのみ**、**35操作はAPI KeyまたはOAuth 2.0**。
- 安定性は **STABLE 38 / BETA 39** で、機能領域によってBETA比率が高い。
- 公式ドキュメント上、Legacy APIはcookie認証かつ破壊的変更が入り得るため、本番運用の主軸にしない方針が妥当。

---

## 1. 調査範囲（2026-03-05取得）

- OpenAPI仕様:
  - `https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/reference/cloud/cloud.docs.json`
- 認証ドキュメント:
  - `https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/cloud/auth/api-keys.md`
  - `https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/cloud/auth/oauth2-reference.md`
- リファレンス入口:
  - `https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/cloud/index.md`
- Experience内HTTP連携:
  - `https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/cloud-services/http-service.md`
- OIDC discovery実エンドポイント:
  - `https://apis.roblox.com/oauth/.well-known/openid-configuration`

---

## 2. Roblox APIレイヤー整理

1. **Open Cloud（公開REST API）**
   - `https://apis.roblox.com/cloud/v2/...`
   - API Key / OAuth 2.0対応、OpenAPI仕様あり。
2. **Experience内エンジンAPI（Luau Service）**
   - DataStoreService / MemoryStoreService / MessagingService など。
   - 低遅延・ゲームループ直結処理向け。
3. **Legacy Web API（cookieベース）**
   - 公式に安定性が低い旨が明記されており、プロダクション利用は非推奨。

---

## 3. Open Cloud v2の実測結果

### 3-1. カテゴリ別オペレーション数

| Category | Ops | Stable | Beta | API key only | API key or OAuth2 |
|---|---:|---:|---:|---:|---:|
| Data and memory stores | 33 | 31 | 2 | 33 | 0 |
| Luau execution | 5 | 0 | 5 | 5 | 0 |
| Monetization | 4 | 0 | 4 | 0 | 4 |
| Universes and places | 11 | 6 | 5 | 4 | 7 |
| Users and groups | 24 | 1 | 23 | 0 | 24 |
| **Total** | **77** | **38** | **39** | **42** | **35** |

### 3-2. スコープ

- `x-roblox-scopes`で確認できるユニーク権限は **38種類**。
- OAuth 2.0 security schemeで定義されるスコープは **17種類**。
- つまり、データストア/メモリストア/Luau execution等は実質的にAPI Key中心の運用。

### 3-3. 代表エンドポイント（抜粋）

- Data and memory stores:
  - `GET /cloud/v2/universes/{universe_id}/data-stores`
  - `PATCH /cloud/v2/universes/{universe_id}/data-stores/{data_store_id}/entries/{entry_id}`
  - `POST /cloud/v2/universes/{universe_id}:publishMessage`
- Users and groups:
  - `GET /cloud/v2/groups/{group_id}/memberships`
  - `PATCH /cloud/v2/groups/{group_id}/memberships/{membership_id}`
  - `POST /cloud/v2/users/{user_id}/notifications`
- Universes and places:
  - `PATCH /cloud/v2/universes/{universe_id}`
  - `PATCH /cloud/v2/universes/{universe_id}/places/{place_id}`
  - `POST /cloud/v2/universes/{universe_id}:restartServers`

---

## 4. 認証・認可の要点

### 4-1. API Key

- リクエストヘッダは `x-api-key`。
- 最小権限スコープ設計、IP制限、シークレット管理が必須。
- グループ運用は専用アカウントでのキー発行を公式推奨（権限分離）。
- 1年間未使用/未更新のキーは非アクティブ化され得る旨が明記。
- 検証用に `POST https://apis.roblox.com/api-keys/v1/introspect` が用意されている。

### 4-2. OAuth 2.0

- OAuth 2.0認証はドキュメント上で **BETA** 扱い。
- 主要エンドポイント:
  - `GET /oauth/v1/authorize`
  - `POST /oauth/v1/token`
  - `POST /oauth/v1/token/introspect`
  - `POST /oauth/v1/token/resources`
  - `POST /oauth/v1/token/revoke`
  - `GET /oauth/v1/userinfo`
- 仕様上の重要値:
  - 認可コード: 1分・1回限り
  - アクセストークン: 約15分
  - リフレッシュトークン: 90日・使用は1回ごとにローテーション
- OIDC discoveryは稼働中で、`authorize`/`token`/`jwks`等のメタデータを返す。

---

## 5. レート制限・運用制約

- OpenAPI上、全77操作に `x-roblox-rate-limits` が定義。
- 低い上限の例:
  - `generateSpeechAsset`: **4 req/sec**
  - Luau execution session task作成: **5 req/min**
  - `restartServers`: **30 req/min**
- `user-restrictions`系は追加制限あり:
  - 更新系は per universe 10 req/sec
  - 同一ユーザー更新は 2 req/min 追加制限
- Data Store/Ordered Data Storeは「追加スロットリングあり」と明記。

### Experience内（HttpService）制約

- Open Cloudに対して `HttpService` で呼べるのはサブセット（実測13操作）。
- 許可ヘッダは実質 `x-api-key` と `content-type` に制限。
- `x-api-key`はSecrets Store経由の `Secret` 利用が必要。
- Experience server単位で Open Cloud 2500 req/min 上限（通常の500 req/min枠とは別）。
- Robloxドメイン向けURL path parameterで `..` が使えない制約あり。

---

## 6. このプロジェクト向け推奨方針（Gravity Obby Chaos）

1. **ゲーム進行の本体処理はLuauサービス優先**
   - ゲームループ中の状態管理はDataStoreService/MemoryStoreServiceなどで完結。
2. **Open Cloudは運用オートメーションに限定**
   - Universe/Place管理、ユーザー通知、モデレーション補助、定期運用ジョブに利用。
3. **認証は当面API Key中心**
   - 専用運用アカウント + 最小スコープ + Secret管理 + IP制限。
4. **BETA依存を分離**
   - Users/groupsやMonetizationはBETA比率が高いため、feature flag前提で導入。
5. **外部SaaS連携時のみOAuth 2.0導入**
   - Creator個別同意が必要な機能（ユーザー資産参照等）に限定して使う。

---

## 7. 参照リンク

- Cloud API reference index: https://create.roblox.com/docs/cloud
- Cloud OpenAPI raw (`cloud.docs.json`): https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/reference/cloud/cloud.docs.json
- API keys: https://create.roblox.com/docs/cloud/auth/api-keys
- OAuth 2.0 reference: https://create.roblox.com/docs/cloud/auth/oauth2-reference
- OAuth OIDC discovery (live): https://apis.roblox.com/oauth/.well-known/openid-configuration
- In-experience HTTP requests (`HttpService`): https://create.roblox.com/docs/cloud-services/http-service
