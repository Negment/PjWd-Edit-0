/**
 * SUS ファイルパーサー
 * Sliding Universal Score フォーマットを解析
 */
class SUSParser {
    constructor() {
        this.data = {
            title: '',
            artist: '',
            designer: '',
            difficulty: 0,
            playlevel: 0,
            duration: 0,
            bpmList: [],
            timeSignatures: [],
            notes: [],
            lanes: [[], [], [], [], [], [], [], [], [], [], [], []],
        };
    }

    parse(susContent) {
        const lines = susContent.split('\n');
        const metadata = {};
        const measures = {};

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(';')) continue;

            // メタデータの解析
            if (trimmed.startsWith('#TITLE')) {
                this.data.title = trimmed.substring(trimmed.indexOf(' ') + 1);
            } else if (trimmed.startsWith('#ARTIST')) {
                this.data.artist = trimmed.substring(trimmed.indexOf(' ') + 1);
            } else if (trimmed.startsWith('#DESIGNER')) {
                this.data.designer = trimmed.substring(trimmed.indexOf(' ') + 1);
            } else if (trimmed.startsWith('#DIFFICULTY')) {
                this.data.difficulty = parseInt(trimmed.split(' ')[1]) || 0;
            } else if (trimmed.startsWith('#PLAYLEVEL')) {
                this.data.playlevel = parseInt(trimmed.split(' ')[1]) || 0;
            } else if (trimmed.startsWith('#BPM')) {
                const bpm = parseFloat(trimmed.split(' ')[1]) || 120;
                this.data.bpmList = [{ beat: 0, bpm }];
            } else if (trimmed.startsWith('#TIME_SIG')) {
                const parts = trimmed.split(' ');
                const measure = parseInt(parts[1].split(':')[0]) || 0;
                const num = parseInt(parts[2]) || 4;
                const den = parseInt(parts[3]) || 4;
                this.data.timeSignatures.push({ measure, num, den });
            }
            // BPM 変更命令
            else if (trimmed.match(/^#BPM\d+:/)) {
                const match = trimmed.match(/#BPM(\d+):\s*([\d.]+)/);
                if (match) {
                    const measure = parseInt(match[1]);
                    const bpm = parseFloat(match[2]);
                    this.data.bpmList.push({ beat: measure * 4, bpm });
                }
            }
            // ノーツデータ
            else if (trimmed.match(/^\d+[0-9A-F]{2}:/)) {
                const match = trimmed.match(/^(\d+)([0-9A-F]{2}):([\w\d]*)/);
                if (match) {
                    const measureStr = match[1];
                    const laneStr = match[2];
                    const noteStr = match[3];
                    
                    const measure = parseInt(measureStr);
                    const lane = parseInt(laneStr, 16);
                    
                    if (noteStr) {
                        this.parseLaneNotes(measure, lane, noteStr);
                    }
                }
            }
        }

        // メタデータのデフォルト値設定
        if (this.data.bpmList.length === 0) {
            this.data.bpmList = [{ beat: 0, bpm: 120 }];
        }
        if (this.data.timeSignatures.length === 0) {
            this.data.timeSignatures = [{ measure: 0, num: 4, den: 4 }];
        }

        return this.data;
    }

    parseLaneNotes(measure, lane, noteStr) {
        const noteLength = noteStr.length;
        const divisor = noteLength;
        
        for (let i = 0; i < noteStr.length; i++) {
            const char = noteStr[i];
            if (char === '0') continue;

            const beat = measure * 4 + (i / divisor) * 4;
            const type = this.getNoteType(char);
            
            const note = {
                beat,
                lane,
                type,
                char
            };

            this.data.notes.push(note);
            if (!this.data.lanes[lane]) {
                this.data.lanes[lane] = [];
            }
            this.data.lanes[lane].push(note);
        }
    }

    getNoteType(char) {
        // SUS ノーツタイプ
        // 1-9: タップ
        // A-F: ノーツ種別
        const map = {
            '1': 'tap',
            '2': 'flick',
            '3': 'slide',
            '4': 'hold',
            '5': 'hold',
            '6': 'hold',
            '7': 'hold',
            '8': 'hold',
            '9': 'hold',
            'A': 'slideEnd',
            'B': 'slideEnd',
            'C': 'damageFlick',
            'D': 'damageFlick',
            'E': 'damageFlick',
            'F': 'damageFlick',
        };
        return map[char.toUpperCase()] || 'tap';
    }

    serialize() {
        let sus = '';

        // メタデータ
        if (this.data.title) sus += `#TITLE ${this.data.title}\n`;
        if (this.data.artist) sus += `#ARTIST ${this.data.artist}\n`;
        if (this.data.designer) sus += `#DESIGNER ${this.data.designer}\n`;
        sus += `#DIFFICULTY ${this.data.difficulty}\n`;
        sus += `#PLAYLEVEL ${this.data.playlevel}\n`;

        if (this.data.bpmList.length > 0) {
            sus += `#BPM ${this.data.bpmList[0].bpm}\n`;
        }

        // ノーツ
        const notesByMeasure = {};
        for (const note of this.data.notes) {
            const measure = Math.floor(note.beat / 4);
            const lane = note.lane;
            const key = `${measure}:${lane.toString(16).padStart(2, '0').toUpperCase()}`;
            
            if (!notesByMeasure[key]) {
                notesByMeasure[key] = [];
            }
            notesByMeasure[key].push(note);
        }

        for (const [key, notes] of Object.entries(notesByMeasure)) {
            sus += `${key}:${notes.map(n => n.char).join('')}\n`;
        }

        return sus;
    }
}

// グローバルにエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUSParser;
}
