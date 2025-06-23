# Pitch Trainer API 文檔

本文檔詳細說明了 Pitch Trainer 應用程式的 API 端點。

## 基本信息

- **基礎 URL**: `http://localhost:3001/api/v1` (開發環境)
- **內容類型**: 所有請求和響應均使用 JSON 格式 (`application/json`)
- **認證**: 使用 Bearer Token 認證 (`Authorization: Bearer <token>`)

## 認證

需要認證的端點要求在請求頭中包含有效的 JWT 令牌：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

或者使用 API 金鑰：

```
X-API-Key: your-api-key
```

## 端點列表

### 健康檢查

```
GET /api/v1/health
```

檢查服務是否正常運行。

**認證**: 不需要

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
GET /api/v1/songs
```

獲取所有已處理的歌曲列表。

**認證**: 不需要

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
      "created_at": "2023-05-20T12:34:56Z"
    },
    // 更多歌曲...
  ],
  "total": 120,
  "limit": 50,
  "offset": 0
}
```

### 獲取單首歌曲

```
GET /api/v1/songs/:id
```

獲取指定 ID 的歌曲詳細信息。

**認證**: 不需要

**路徑參數**:

| 參數 | 類型 | 說明 |
|------|------|------|
| `id` | 整數 | 歌曲 ID |

**響應**:

```json
{
  "id": 1,
  "name": "示例歌曲",
  "mp3_path": "/songs/example/full.mp3",
  "vocal_path": "/songs/example/vocals.mp3",
  "accompaniment_path": "/songs/example/accompaniment.mp3",
  "midi_path": "/songs/example/melody.mid",
  "lrc_path": "/songs/example/lyrics.lrc",
  "analysis_path": "/songs/example/analysis.json",
  "created_at": "2023-05-20T12:34:56Z",
  "meta": {
    "artist": "示例歌手",
    "language": "中文",
    "bpm": 120,
    "key": "C",
    "genre": "流行"
  }
}
```

### 上傳歌曲

```
POST /api/v1/songs
```

上傳新歌曲進行處理。

**認證**: 需要

**請求**:

使用 `multipart/form-data` 格式上傳文件。

| 參數 | 類型 | 說明 |
|------|------|------|
| `file` | 文件 | 要上傳的音訊文件 (MP3, WAV, M4A) |
| `name` | 字串 | 歌曲名稱 (可選，默認使用文件名) |
| `artist` | 字串 | 歌手名稱 (可選) |
| `language` | 字串 | 歌曲語言 (可選) |

**響應**:

```json
{
  "job_id": "job_1621234567890",
  "message": "文件上傳成功，開始處理",
  "status": "pending"
}
```

### 查詢處理狀態

```
GET /api/v1/jobs/:jobId
```

查詢歌曲處理任務的狀態。

**認證**: 需要

**路徑參數**:

| 參數 | 類型 | 說明 |
|------|------|------|
| `jobId` | 字串 | 任務 ID |

**響應**:

```json
{
  "job_id": "job_1621234567890",
  "status": "processing",
  "message": "正在分離人聲和伴奏",
  "progress": 45,
  "song_id": null,
  "created_at": "2023-05-20T12:34:56Z",
  "updated_at": "2023-05-20T12:35:30Z"
}
```

當處理完成時:

```json
{
  "job_id": "job_1621234567890",
  "status": "completed",
  "message": "處理完成",
  "progress": 100,
  "song_id": 42,
  "created_at": "2023-05-20T12:34:56Z",
  "updated_at": "2023-05-20T12:40:30Z"
}
```

### 獲取歌詞

```
GET /api/v1/songs/:id/lyrics
```

獲取指定歌曲的 LRC 格式歌詞。

**認證**: 不需要

**路徑參數**:

| 參數 | 類型 | 說明 |
|------|------|------|
| `id` | 整數 | 歌曲 ID |

**響應**:

```
[00:00.00] 示例歌曲 - 示例歌手
[00:01.23] 這是第一句歌詞
[00:05.67] 這是第二句歌詞
...
```

### 獲取音高分析

```
GET /api/v1/songs/:id/analysis
```

獲取指定歌曲的音高分析數據。

**認證**: 不需要

**路徑參數**:

| 參數 | 類型 | 說明 |
|------|------|------|
| `id` | 整數 | 歌曲 ID |

**響應**:

```json
{
  "notes": [
    {
      "start_time": 1.23,
      "end_time": 1.89,
      "pitch": 60,
      "confidence": 0.95
    },
    // 更多音符...
  ],
  "key": "C",
  "bpm": 120
}
```

### 刪除歌曲

```
DELETE /api/v1/songs/:id
```

刪除指定 ID 的歌曲及其相關資源。

**認證**: 需要

**路徑參數**:

| 參數 | 類型 | 說明 |
|------|------|------|
| `id` | 整數 | 歌曲 ID |

**響應**:

```json
{
  "success": true,
  "message": "歌曲已成功刪除"
}
```

### 更新歌曲元數據

```
PATCH /api/v1/songs/:id
```

更新指定歌曲的元數據。

**認證**: 需要

**路徑參數**:

| 參數 | 類型 | 說明 |
|------|------|------|
| `id` | 整數 | 歌曲 ID |

**請求體**:

```json
{
  "name": "新歌名",
  "artist": "新歌手名",
  "language": "英文",
  "bpm": 130,
  "key": "D",
  "genre": "搖滾"
}
```

**響應**:

```json
{
  "success": true,
  "message": "元數據已更新",
  "song": {
    "id": 1,
    "name": "新歌名",
    "meta": {
      "artist": "新歌手名",
      "language": "英文",
      "bpm": 130,
      "key": "D",
      "genre": "搖滾"
    }
  }
}
```

### 重新生成歌詞

```
POST /api/v1/songs/:id/regenerate-lyrics
```

使用不同的模型重新生成歌曲歌詞。

**認證**: 需要

**路徑參數**:

| 參數 | 類型 | 說明 |
|------|------|------|
| `id` | 整數 | 歌曲 ID |

**請求體**:

```json
{
  "model": "whisper_large",  // 可選值: "whisper_medium", "whisper_large", "google_stt"
  "language": "zh-TW"        // 可選，指定語言
}
```

**響應**:

```json
{
  "job_id": "job_1621234567890",
  "message": "歌詞重新生成任務已啟動",
  "status": "pending"
}
```

## 錯誤處理

所有 API 錯誤響應都遵循以下格式：

```json
{
  "error": {
    "code": 400,
    "message": "錯誤描述"
  }
}
```

### 常見錯誤代碼

| 代碼 | 說明 |
|------|------|
| 400 | 請求參數錯誤 |
| 401 | 未授權 |
| 404 | 資源不存在 |
| 413 | 上傳文件過大 |
| 429 | 請求過於頻繁 |
| 500 | 伺服器內部錯誤 |

## 速率限制

為防止濫用，API 實施了速率限制：

- 上傳端點 (`/api/v1/songs`): 每 15 分鐘最多 5 次請求
- 其他端點: 每分鐘最多 60 次請求

超過限制時，服務器將返回 `429 Too Many Requests` 錯誤。

## 認證

某些端點需要認證。認證通過 Bearer 令牌實現：

```
Authorization: Bearer <your-token>
```

## 範例

### 使用 cURL 上傳歌曲

```bash
curl -X POST \
  http://localhost:3001/api/v1/songs \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/song.mp3" \
  -F "name=我的歌曲" \
  -F "artist=歌手名稱"
```

### 使用 JavaScript 獲取歌曲列表

```javascript
fetch('http://localhost:3001/api/v1/songs?limit=10&offset=0')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 使用 Python 查詢處理狀態

```python
import requests

job_id = "job_1621234567890"
headers = {"Authorization": "Bearer your-token"}
response = requests.get(f"http://localhost:3001/api/v1/jobs/{job_id}", headers=headers)
print(response.json())
```

## 版本歷史

| 版本 | 日期 | 變更 |
|------|------|------|
| v1.0 | 2023-01-15 | 初始 API 發布 |
| v2.0 | 2023-03-20 | 添加元數據和分析端點 |
| v3.0 | 2023-06-10 | 添加歌詞重新生成功能 |
| v4.0 | 2023-09-05 | 改進錯誤處理和響應格式 |
| v5.0 | 2023-12-15 | 添加認證和速率限制 |
| v5.2.0 | 2024-03-01 | 優化處理流程和 Docker 支持 |
| v6.0.0 | 2024-05-15 | 重構 API 路徑，統一為 RESTful 風格 |

