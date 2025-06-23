# Pitch Trainer 資料庫結構

本文檔詳細說明 Pitch Trainer 應用程式的資料庫結構設計。

## 概述

Pitch Trainer 使用 MySQL 關聯式資料庫來儲存歌曲資源、元數據和處理任務狀態。資料庫設計遵循以下原則：

- 資料正規化：避免資料重複
- 關聯完整性：使用外鍵確保資料一致性
- 效能優化：適當的索引和查詢優化

## 資料庫架構

資料庫包含三個主要資料表：
1. `songs`：儲存歌曲基本信息和資源路徑
2. `songs_meta`：儲存歌曲的元數據
3. `jobs`：儲存處理任務的狀態和進度

### 資料表關係圖

```
+-------+       +------------+
| songs |<----->| songs_meta |
+-------+       +------------+
    ^
    |
+-------+
| jobs  |
+-------+
```

## 資料表結構

### 資料表：`songs`

儲存所有已成功處理完成的歌曲資源路徑。

| 欄位名稱 | 資料類型 | 允許空值 | 預設值 | 說明 |
|---------|---------|---------|-------|------|
| `id` | INT | 否 | AUTO_INCREMENT | 歌曲的唯一識別碼 (主鍵) |
| `name` | VARCHAR(255) | 否 | | 歌曲名稱 (通常由檔名淨化而來) |
| `mp3_path` | VARCHAR(255) | 否 | | 原始完整歌曲的 MP3 檔案路徑 |
| `vocal_path` | VARCHAR(255) | 是 | NULL | 分離後的人聲 MP3 檔案路徑 |
| `accompaniment_path` | VARCHAR(255) | 是 | NULL | 分離後的伴奏 MP3 檔案路徑 |
| `midi_path` | VARCHAR(255) | 是 | NULL | 從人聲提取的旋律 MIDI 檔案路徑 |
| `lrc_path` | VARCHAR(255) | 是 | NULL | 生成的 LRC 歌詞檔案路徑 |
| `analysis_path` | VARCHAR(255) | 是 | NULL | 聲音品質分析結果的 JSON 檔案路徑 |
| `created_at` | TIMESTAMP | 否 | CURRENT_TIMESTAMP | 紀錄建立時間 |

**索引**:
- PRIMARY KEY (`id`)

**SQL 建立語句**:

```sql
CREATE TABLE `songs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `mp3_path` varchar(255) NOT NULL,
  `vocal_path` varchar(255) DEFAULT NULL,
  `accompaniment_path` varchar(255) DEFAULT NULL,
  `midi_path` varchar(255) DEFAULT NULL,
  `lrc_path` varchar(255) DEFAULT NULL,
  `analysis_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 資料表：`songs_meta`

儲存歌曲的元數據，用於進階功能和搜索。

| 欄位名稱 | 資料類型 | 允許空值 | 預設值 | 說明 |
|---------|---------|---------|-------|------|
| `song_id` | INT | 否 | | 對應到 `songs` 表的 ID (主鍵) |
| `artist` | VARCHAR(255) | 是 | NULL | 歌手名稱 |
| `language` | VARCHAR(50) | 是 | NULL | 歌曲語言 |
| `bpm` | INT | 是 | NULL | 每分鐘節拍數 |
| `key` | VARCHAR(10) | 是 | NULL | 歌曲調性 |
| `genre` | VARCHAR(100) | 是 | NULL | 歌曲類型 |

**索引**:
- PRIMARY KEY (`song_id`)
- FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE

**SQL 建立語句**:

```sql
CREATE TABLE `songs_meta` (
  `song_id` int NOT NULL,
  `artist` varchar(255) DEFAULT NULL,
  `language` varchar(50) DEFAULT NULL,
  `bpm` int DEFAULT NULL,
  `key` varchar(10) DEFAULT NULL,
  `genre` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`song_id`),
  CONSTRAINT `fk_songs_meta_song_id` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 資料表：`jobs`

用於追蹤每一個上傳檔案的處理進度與狀態，是實現非同步處理的核心。

| 欄位名稱 | 資料類型 | 允許空值 | 預設值 | 說明 |
|---------|---------|---------|-------|------|
| `id` | VARCHAR(255) | 否 | | 任務的唯一識別碼 (主鍵, 例如 'job_xxxxxxxx') |
| `status` | ENUM('pending','processing','completed','failed') | 否 | 'pending' | 任務目前的狀態 |
| `message` | TEXT | 是 | NULL | 顯示給使用者的狀態訊息或詳細的錯誤日誌 |
| `progress` | INT | 否 | 0 | 處理進度百分比 (0-100) |
| `song_id` | INT | 是 | NULL | 任務成功後，對應到 `songs` 資料表的 ID |
| `created_at` | TIMESTAMP | 否 | CURRENT_TIMESTAMP | 任務建立時間 |
| `updated_at` | TIMESTAMP | 否 | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 任務狀態最後更新時間 |

**索引**:
- PRIMARY KEY (`id`)
- INDEX (`status`)
- INDEX (`created_at`)
- FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE SET NULL

**SQL 建立語句**:

```sql
CREATE TABLE `jobs` (
  `id` varchar(255) NOT NULL,
  `status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `message` text,
  `progress` int NOT NULL DEFAULT '0',
  `song_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_jobs_status` (`status`),
  KEY `idx_jobs_created_at` (`created_at`),
  KEY `fk_jobs_song_id` (`song_id`),
  CONSTRAINT `fk_jobs_song_id` FOREIGN KEY (`song_id`) REFERENCES `songs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

## 資料關係

### 一對一關係

- 每個 `songs` 記錄對應一個 `songs_meta` 記錄 (1:1)

### 一對多關係

- 一個 `songs` 記錄可以對應多個 `jobs` 記錄 (1:N)，例如當一首歌曲被多次處理時

## 資料庫初始化

在首次部署時，可以使用以下 SQL 腳本初始化資料庫：

```sql
-- 創建資料庫
CREATE DATABASE IF NOT EXISTS pitch_trainer CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 使用資料庫
USE pitch_trainer;

-- 創建資料表
-- (上述 CREATE TABLE 語句)

-- 創建資料庫用戶
CREATE USER IF NOT EXISTS 'pitchuser'@'%' IDENTIFIED BY 'your_password_here';
GRANT ALL PRIVILEGES ON pitch_trainer.* TO 'pitchuser'@'%';
FLUSH PRIVILEGES;
```

## 資料庫維護

### 備份

建議定期備份資料庫：

```bash
# 使用 mysqldump 備份
mysqldump -u root -p pitch_trainer > backup_$(date +%Y%m%d).sql
```

### 還原

從備份還原資料庫：

```bash
# 還原資料庫
mysql -u root -p pitch_trainer < backup_20240301.sql
```

### 優化

定期執行以下命令優化資料庫：

```sql
-- 分析資料表
ANALYZE TABLE songs, songs_meta, jobs;

-- 優化資料表
OPTIMIZE TABLE songs, songs_meta, jobs;
```

## 查詢範例

### 獲取所有歌曲及其元數據

```sql
SELECT s.*, sm.artist, sm.language, sm.bpm, sm.key, sm.genre
FROM songs s
LEFT JOIN songs_meta sm ON s.id = sm.song_id
ORDER BY s.created_at DESC;
```

### 獲取特定語言的歌曲

```sql
SELECT s.*, sm.artist, sm.language
FROM songs s
JOIN songs_meta sm ON s.id = sm.song_id
WHERE sm.language = '中文'
ORDER BY s.created_at DESC;
```

### 獲取處理中的任務

```sql
SELECT j.*, s.name
FROM jobs j
LEFT JOIN songs s ON j.song_id = s.id
WHERE j.status = 'processing'
ORDER BY j.updated_at DESC;
```

### 獲取最近失敗的任務

```sql
SELECT j.*, s.name
FROM jobs j
LEFT JOIN songs s ON j.song_id = s.id
WHERE j.status = 'failed'
ORDER BY j.updated_at DESC
LIMIT 10;
```

## 資料庫擴展計劃

未來版本可能會添加以下資料表：

1. `users`：用戶管理
2. `playlists`：播放清單管理
3. `practice_records`：練習記錄
4. `comments`：歌曲評論
5. `ratings`：歌曲評分

## 效能考量

- 對於大量歌曲的情況，建議為 `songs` 表的 `name` 欄位添加全文索引
- 對於頻繁查詢的欄位，如 `songs_meta` 表的 `language` 和 `genre`，可添加索引
- 考慮定期清理過期的 `jobs` 記錄，特別是狀態為 'completed' 或 'failed' 的記錄

## 結論

Pitch Trainer 的資料庫設計專注於歌曲資源管理和非同步處理任務追蹤，為應用程式提供了穩定、高效的資料儲存解決方案。通過合理的資料表設計和關聯關係，確保了資料的一致性和完整性，同時為未來功能擴展提供了靈活性。
