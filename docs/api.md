# Pitch Trainer API 文檔

本文檔詳細說明了 Pitch Trainer 應用程式的 API 端點。

## 基本信息

- **基礎 URL**: `http://localhost:3001` (開發環境)
- **內容類型**: 所有請求和響應均使用 JSON 格式 (`application/json`)
- **認證**: 部分端點可能需要 API 金鑰或 JWT 令牌

## 端點列表

### 健康檢查

```
GET /health
```

檢查服務是否正常運行。

**響應**:

```json
{
  "status": "ok",
  "version": "5.2.0",
  "timestamp": 1621234567890
}
```

### 獲取歌曲列表

```
GET /songs
```

獲取所有已處理的歌曲列表。

**查詢參數**:

| 參數 | 類型 | 說明 |
|------|------|------|
| `limit` | 整數 | 限制返回的歌曲數量 (默認: 50) |
| `offset` | 整數 | 分頁偏移量 (默認: 0) |
| `sort` | 字串 | 排序字段 (默認: "created_at") |
| `order` | 字串 | 排序方向 ("asc" 或 "desc", 默認: "desc") |

**響應**:

```json
{
  "songs": [
    {
      "id": 1,
      "name": "示例歌曲",
      "mp3_path": "/songs/example/full.mp3",
      "vocal_path": "/songs/example/vocals.mp3",
      "accompaniment_path": "/songs/example/accompaniment.mp3",
      "midi_path": "/songs/example/melody.mid",
      "lrc_path": "/songs/example/lyrics.lrc",
      "created_at": "2023-