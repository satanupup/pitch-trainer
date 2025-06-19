function parseLRC(text) {
    const lines = text.split("\n");
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    lines.forEach(line => {
        const match = line.match(timeRegex);
        if (match) {
            const time = parseInt(match[1], 10) * 60 + parseInt(match[2], 10) + parseInt(match[3], 10) / 1000;
            const text = line.replace(timeRegex, "").trim();
            if (text) result.push({ time, text });
        }
    });
    return result;
}
function mapNoteToY(noteNumber, canvasHeight) {
    const minNote = 48;
    const maxNote = 84;
    const normalized = 1 - ((noteNumber - minNote) / (maxNote - minNote));
    return Math.max(0, Math.min(1, normalized)) * canvasHeight;
}
function getPitch(dataArray, sampleRate) {
    let bestCorrelation = 0, bestOffset = -1;
    const bufferSize = dataArray.length;
    for (let offset = 80; offset < bufferSize / 2; offset++) {
        let corr = 0;
        for (let i = 0; i < bufferSize / 2; i++) {
            corr += dataArray[i] * dataArray[i + offset];
        }
        if (corr > bestCorrelation) {
            bestCorrelation = corr;
            bestOffset = offset;
        }
    }
    return bestOffset > 0 ? sampleRate / bestOffset : null;
}
function midiToNote(midi) {
    if (typeof midi !== 'number') return '--';
    const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(midi / 12) - 1;
    return noteStrings[midi % 12] + octave;
}
export { parseLRC, mapNoteToY, getPitch, midiToNote }; 