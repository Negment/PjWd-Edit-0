/**
 * 譜面レンダリングエンジン
 */
class TimelineRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scrollPosition = 0;
        this.zoom = 1;
        
        // 配色
        this.colors = {
            background: '#1a1a1a',
            grid: '#333333',
            gridMajor: '#555555',
            lane1: '#ff6b6b',
            lane2: '#ffd93d',
            lane3: '#6bcf7f',
            lane4: '#4d96ff',
            lane5: '#a78bfa',
            lane6: '#f472b6',
            lane7: '#14b8a6',
            lane8: '#f59e0b',
            lane9: '#3b82f6',
            lane10: '#ec4899',
            lane11: '#06b6d4',
            lane12: '#8b5cf6',
            tap: '#ffffff',
            flick: '#ffff00',
            slide: '#00ff00',
            hold: '#0088ff',
            text: '#cccccc',
        };
        
        // レイアウト
        this.laneWidth = 60;
        this.beatHeight = 80;
        this.numLanes = 12;
        this.headerHeight = 40;
        
        this.setupCanvas();
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        window.addEventListener('resize', () => this.setupCanvas());
    }

    render(scoreData, currentBeat = 0) {
        // 背景描画
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // ヘッダー
        this.drawHeader(scoreData);

        // グリッド
        this.drawGrid();

        // ノーツ
        if (scoreData.notes) {
            this.drawNotes(scoreData.notes);
        }

        // 再生位置線
        this.drawPlayhead(currentBeat);
    }

    drawHeader(scoreData) {
        this.ctx.fillStyle = '#222222';
        this.ctx.fillRect(0, 0, this.canvas.width, this.headerHeight);

        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        
        let text = '';
        if (scoreData.title) text += `${scoreData.title} `;
        if (scoreData.artist) text += `by ${scoreData.artist}`;
        
        this.ctx.fillText(text, 10, 25);
    }

    drawGrid() {
        const laneAreaWidth = this.laneWidth * this.numLanes;
        const visibleBeats = this.canvas.height / this.beatHeight;

        // 縦線（レーン）
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= this.numLanes; i++) {
            const x = i * this.laneWidth;
            if (x > this.canvas.width) break;

            this.ctx.beginPath();
            this.ctx.moveTo(x, this.headerHeight);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // 横線（ビート）
        const startBeat = Math.floor(this.scrollPosition);
        const endBeat = startBeat + Math.ceil(visibleBeats) + 1;

        for (let beat = startBeat; beat <= endBeat; beat++) {
            const y = this.headerHeight + (beat - this.scrollPosition) * this.beatHeight;
            if (y < this.headerHeight || y > this.canvas.height) continue;

            // 小節線
            if (beat % 4 === 0) {
                this.ctx.strokeStyle = this.colors.gridMajor;
                this.ctx.lineWidth = 2;
            } else {
                this.ctx.strokeStyle = this.colors.grid;
                this.ctx.lineWidth = 1;
            }

            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawNotes(notes) {
        for (const note of notes) {
            const x = note.lane * this.laneWidth + this.laneWidth / 2;
            const y = this.headerHeight + (note.beat - this.scrollPosition) * this.beatHeight;

            // 画面外判定
            if (y < this.headerHeight - 50 || y > this.canvas.height + 50) continue;

            this.drawNote(x, y, note);
        }
    }

    drawNote(x, y, note) {
        const size = this.laneWidth * 0.8;
        
        // ノーツ背景
        this.ctx.fillStyle = this.getNoteColor(note.type);
        this.ctx.globalAlpha = 0.8;

        if (note.type === 'slide' || note.type === 'hold') {
            // スライド・ホールド
            this.ctx.fillRect(x - size / 3, y - size / 2, size / 1.5, size);
        } else {
            // タップ・フリック
            this.ctx.beginPath();
            this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1;

        // ノーツテキスト
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const typeShort = note.type.substring(0, 1).toUpperCase();
        this.ctx.fillText(typeShort, x, y);
    }

    getNoteColor(type) {
        const colorMap = {
            'tap': '#ffffff',
            'flick': '#ffff00',
            'slide': '#00ff00',
            'hold': '#0088ff',
            'slideEnd': '#00ff88',
            'damageFlick': '#ff0000',
        };
        return colorMap[type] || '#ffffff';
    }

    drawPlayhead(beat) {
        const y = this.headerHeight + (beat - this.scrollPosition) * this.beatHeight;
        
        if (y >= this.headerHeight && y <= this.canvas.height) {
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    scroll(delta) {
        this.scrollPosition += delta;
        if (this.scrollPosition < 0) this.scrollPosition = 0;
    }

    setZoom(factor) {
        this.zoom = Math.max(0.5, Math.min(4, this.zoom * factor));
        this.beatHeight *= factor;
    }
}

// グローバルにエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimelineRenderer;
}
