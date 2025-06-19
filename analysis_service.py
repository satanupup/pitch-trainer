from flask import Flask, request, jsonify
import parselmouth
import numpy as np
import os
import tempfile

app = Flask(__name__)

@app.route('/analyze_vocal', methods=['POST'])
def analyze_vocal():
    if 'file' not in request.files:
        return jsonify({'error': '未收到音檔 (file)'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未選擇音檔'}), 400
    try:
        # 將檔案暫存
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
            file.save(tmp.name)
            snd = parselmouth.Sound(tmp.name)
        # 基頻 (Pitch)
        pitch = snd.to_pitch()
        pitch_values = pitch.selected_array['frequency']
        pitch_values = pitch_values[pitch_values > 0]  # 過濾無聲區
        avg_pitch = float(np.mean(pitch_values)) if len(pitch_values) > 0 else 0
        # Jitter
        point_process = parselmouth.praat.call(snd, "To PointProcess (periodic, cc)", 75, 500)
        local_jitter = parselmouth.praat.call([snd, point_process], "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
        # Shimmer
        local_shimmer = parselmouth.praat.call([snd, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        # HNR
        hnr = parselmouth.praat.call(snd, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
        mean_hnr = parselmouth.praat.call(hnr, "Get mean", 0, 0)
        # 刪除暫存檔
        os.remove(tmp.name)
        return jsonify({
            'average_pitch': avg_pitch,
            'jitter_local': local_jitter,
            'shimmer_local': local_shimmer,
            'hnr': mean_hnr
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True) 