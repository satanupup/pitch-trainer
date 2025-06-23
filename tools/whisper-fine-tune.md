# Whisper 模型微調指南

本指南提供如何微調 Whisper 模型以提高歌詞識別準確度的步驟。

## 前置需求

- Python 3.8+
- PyTorch 2.0+
- Transformers 庫
- 至少 16GB RAM
- NVIDIA GPU (建議 8GB+ VRAM)

## 安裝依賴

```bash
pip install torch torchaudio transformers datasets accelerate evaluate jiwer
```

## 準備數據集

為了微調 Whisper 模型，您需要準備一個包含音訊文件和對應歌詞的數據集。

### 1. 創建數據集目錄結構

```
whisper-fine-tune/
├── data/
│   ├── train/
│   │   ├── audio1.mp3
│   │   ├── audio2.mp3
│   │   └── ...
│   ├── validation/
│   │   ├── audio1.mp3
│   │   ├── audio2.mp3
│   │   └── ...
│   ├── train.csv
│   └── validation.csv
└── scripts/
    └── prepare_dataset.py
```

### 2. 準備 CSV 文件

CSV 文件應包含以下列：
- `file_name`: 音訊文件名
- `transcription`: 對應的歌詞文本

例如 `train.csv`:
```
file_name,transcription
audio1.mp3,這是第一首歌的歌詞
audio2.mp3,這是第二首歌的歌詞
...
```

### 3. 數據集準備腳本

```python
# scripts/prepare_dataset.py
import pandas as pd
from datasets import Dataset, Audio, DatasetDict

def prepare_dataset(csv_path, audio_dir):
    # 讀取 CSV 文件
    df = pd.read_csv(csv_path)
    
    # 添加完整路徑
    df['file_path'] = df['file_name'].apply(lambda x: f"{audio_dir}/{x}")
    
    # 創建 Dataset 對象
    dataset = Dataset.from_pandas(df)
    
    # 添加音訊特徵
    dataset = dataset.cast_column("file_path", Audio())
    
    return dataset

# 準備訓練和驗證數據集
train_dataset = prepare_dataset("data/train.csv", "data/train")
validation_dataset = prepare_dataset("data/validation.csv", "data/validation")

# 合併為 DatasetDict
dataset_dict = DatasetDict({
    "train": train_dataset,
    "validation": validation_dataset
})

# 保存處理後的數據集
dataset_dict.save_to_disk("data/processed_dataset")
```

## 微調 Whisper 模型

### 1. 創建微調腳本

```python
# scripts/fine_tune_whisper.py
import os
import evaluate
from dataclasses import dataclass
from typing import Dict, List, Union

import torch
from transformers import (
    WhisperForConditionalGeneration,
    WhisperProcessor,
    WhisperFeatureExtractor,
    WhisperTokenizer,
    Seq2SeqTrainingArguments,
    Seq2SeqTrainer
)
from datasets import load_from_disk, Audio

# 載入數據集
dataset = load_from_disk("data/processed_dataset")

# 載入模型和處理器
model_name = "openai/whisper-small"  # 可選: tiny, base, small, medium, large
feature_extractor = WhisperFeatureExtractor.from_pretrained(model_name)
tokenizer = WhisperTokenizer.from_pretrained(model_name, language="chinese", task="transcribe")
processor = WhisperProcessor.from_pretrained(model_name, language="chinese", task="transcribe")
model = WhisperForConditionalGeneration.from_pretrained(model_name)

# 設置模型語言和任務
model.config.forced_decoder_ids = processor.get_decoder_prompt_ids(language="chinese", task="transcribe")
model.config.suppress_tokens = []

# 數據預處理函數
def prepare_dataset(examples):
    # 載入並重採樣音訊
    audio = examples["file_path"]
    
    # 計算音訊特徵
    examples["input_features"] = feature_extractor(
        audio["array"], 
        sampling_rate=audio["sampling_rate"]
    ).input_features[0]
    
    # 標記化轉錄文本
    examples["labels"] = tokenizer(examples["transcription"]).input_ids
    
    return examples

# 應用預處理
dataset = dataset.cast_column("file_path", Audio(sampling_rate=16000))
dataset = dataset.map(prepare_dataset, remove_columns=["file_name", "file_path"])

# 定義數據整理器
@dataclass
class DataCollatorSpeechSeq2SeqWithPadding:
    processor: WhisperProcessor

    def __call__(self, features: List[Dict[str, Union[List[int], torch.Tensor]]]) -> Dict[str, torch.Tensor]:
        input_features = [{"input_features": feature["input_features"]} for feature in features]
        batch = self.processor.feature_extractor.pad(input_features, return_tensors="pt")

        label_features = [{"input_ids": feature["labels"]} for feature in features]
        labels_batch = self.processor.tokenizer.pad(label_features, return_tensors="pt")

        # 替換填充標記
        labels = labels_batch["input_ids"].masked_fill(labels_batch.attention_mask.ne(1), -100)
        batch["labels"] = labels

        return batch

# 創建數據整理器
data_collator = DataCollatorSpeechSeq2SeqWithPadding(processor=processor)

# 載入評估指標
wer_metric = evaluate.load("wer")
cer_metric = evaluate.load("cer")

def compute_metrics(pred):
    pred_ids = pred.predictions
    label_ids = pred.label_ids

    # 替換 -100
    label_ids[label_ids == -100] = tokenizer.pad_token_id

    # 解碼預測和標籤
    pred_str = tokenizer.batch_decode(pred_ids, skip_special_tokens=True)
    label_str = tokenizer.batch_decode(label_ids, skip_special_tokens=True)

    # 計算 WER
    wer = wer_metric.compute(predictions=pred_str, references=label_str)
    
    # 計算 CER
    cer = cer_metric.compute(predictions=pred_str, references=label_str)

    return {"wer": wer, "cer": cer}

# 設置訓練參數
training_args = Seq2SeqTrainingArguments(
    output_dir="./whisper-fine-tuned",
    per_device_train_batch_size=8,
    gradient_accumulation_steps=2,
    learning_rate=1e-5,
    warmup_steps=500,
    max_steps=4000,
    gradient_checkpointing=True,
    fp16=True,
    evaluation_strategy="steps",
    eval_steps=500,
    save_strategy="steps",
    save_steps=500,
    generation_max_length=225,
    save_total_limit=2,
    predict_with_generate=True,
    push_to_hub=False,
    report_to=["tensorboard"],
)

# 創建訓練器
trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
    eval_dataset=dataset["validation"],
    data_collator=data_collator,
    compute_metrics=compute_metrics,
    tokenizer=processor.feature_extractor,
)

# 開始訓練
trainer.train()

# 保存微調後的模型
trainer.save_model("./whisper-fine-tuned-final")
```

### 2. 執行微
</augment_code_snippet>