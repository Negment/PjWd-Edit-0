/**
 * MikuMikuWorld Web エディタ メインロジック
 */
class MikuMikuWorldEditor {
    constructor() {
        this.scoreData = {
            title: '',
            artist: '',
            designer: '',
            difficulty: 0,
            playlevel: 0,
            bpmList: [{ beat: 0, bpm: 120 }],
            timeSignatures: [{ measure: 0, num: 4, den: 4 }],
            notes: [],
        };

        this.ui = {
            canvas: null,
            renderer: null,
        };

        this.playback = {
            isPlaying: false,
            currentBeat: 0,
            bpm: 120,
            startTime: 0,
        };

        this.selection = {
            selectedNotes: [],
        };

        this.history = [];
        this.historyIndex = -1;

        this.init();
    }

    init() {
        this.setupUI();
        this.setupEventListeners();
        this.render();
    }

    setupUI() {
        // Canvas 設定
        this.ui.canvas = document.getElementById('timeline');
        this.ui.renderer = new TimelineRenderer(this.ui.canvas);
        
        // パネル設定
        this.setupMetadataPanel();
    }

    setupMetadataPanel() {
        const titleInput = document.getElementById('title-input');
        const artistInput = document.getElementById('artist-input');
        const designerInput = document.getElementById('designer-input');
        const difficultyInput = document.getElementById('difficulty-input');
        const playLevelInput = document.getElementById('playlevel-input');

        titleInput.addEventListener('change', (e) => {
            this.scoreData.title = e.target.value;
        });
        artistInput.addEventListener('change', (e) => {
            this.scoreData.artist = e.target.value;
        });
        designerInput.addEventListener('change', (e) => {
            this.scoreData.designer = e.target.value;
        });
        difficultyInput.addEventListener('change', (e) => {
            this.scoreData.difficulty = parseInt(e.target.value) || 0;
        });
        playLevelInput.addEventListener('change', (e) => {
            this.scoreData.playlevel = parseInt(e.target.value) || 0;
        });
    }

    setupEventListeners() {
        // ファイル操作
        document.getElementById('import-btn').addEventListener('click', () => this.importFile());
        document.getElementById('export-btn').addEventListener('click', () => this.exportFile());

        // 再生操作
        document.getElementById('play-btn').addEventListener('click', () => this.togglePlayback());
        document.getElementById('stop-btn').addEventListener('click', () => this.stop());

        // 画面操作
        this.ui.canvas.addEventListener('wheel', (e) => this.handleWheel(e), false);
        this.ui.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // キーボード
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // ウィンドウリサイズ
        window.addEventListener('resize', () => {
            this.ui.renderer.setupCanvas();
            this.render();
        });
    }

    handleWheel(e) {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
            // ズーム
            this.ui.renderer.setZoom(e.deltaY < 0 ? 1.1 : 0.9);
        } else {
            // スクロール
            this.ui.renderer.scroll(e.deltaY / 100);
        }
        this.render();
    }

    handleCanvasClick(e) {
        const rect = this.ui.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const lane = Math.floor(x / this.ui.renderer.laneWidth);
        const beat = Math.floor(
            (y - this.ui.renderer.headerHeight) / this.ui.renderer.beatHeight + this.ui.renderer.scrollPosition
        );

        if (lane < 0 || lane >= this.ui.renderer.numLanes || beat < 0) return;

        // ノーツ追加
        this.addNote(beat, lane, 'tap');
        this.save();
        this.render();
    }

    handleKeydown(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 's') {
                e.preventDefault();
                this.exportFile();
            } else if (e.key === 'z') {
                e.preventDefault();
                this.undo();
            } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                this.redo();
            }
        } else if (e.key === ' ') {
            e.preventDefault();
            this.togglePlayback();
        } else if (e.key === 'Delete') {
            this.deleteSelectedNotes();
        }
    }

    addNote(beat, lane, type = 'tap') {
        const note = { beat, lane, type, id: Date.now() };
        this.scoreData.notes.push(note);
        this.scoreData.notes.sort((a, b) => a.beat - b.beat);
    }

    deleteNote(noteId) {
        this.scoreData.notes = this.scoreData.notes.filter(n => n.id !== noteId);
    }

    deleteSelectedNotes() {
        for (const noteId of this.selection.selectedNotes) {
            this.deleteNote(noteId);
        }
        this.selection.selectedNotes = [];
        this.save();
        this.render();
    }

    importFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.sus';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.addEventListener('load', (e) => {
                try {
                    const parser = new SUSParser();
                    this.scoreData = parser.parse(e.target.result);
                    this.updateMetadataPanel();
                    this.save();
                    this.render();
                    this.updateStatus(`${file.name} をインポートしました`);
                } catch (error) {
                    this.updateStatus(`エラー: ${error.message}`);
                    alert(`エラー: ${error.message}`);
                }
            });
            reader.readAsText(file);
        });
        input.click();
    }

    exportFile() {
        const parser = new SUSParser();
        Object.assign(parser.data, this.scoreData);
        const sus = parser.serialize();

        const blob = new Blob([sus], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.scoreData.title || 'score'}.sus`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.updateStatus(`${a.download} をダウンロードしました`);
    }

    updateMetadataPanel() {
        document.getElementById('title-input').value = this.scoreData.title || '';
        document.getElementById('artist-input').value = this.scoreData.artist || '';
        document.getElementById('designer-input').value = this.scoreData.designer || '';
        document.getElementById('difficulty-input').value = this.scoreData.difficulty || 0;
        document.getElementById('playlevel-input').value = this.scoreData.playlevel || 0;
    }

    togglePlayback() {
        this.playback.isPlaying = !this.playback.isPlaying;
        if (this.playback.isPlaying) {
            this.playback.startTime = performance.now();
            this.playback.currentBeat = 0;
            this.animate();
        }
        this.updatePlayButton();
    }

    stop() {
        this.playback.isPlaying = false;
        this.playback.currentBeat = 0;
        this.updatePlayButton();
        this.render();
    }

    updatePlayButton() {
        const btn = document.getElementById('play-btn');
        btn.textContent = this.playback.isPlaying ? '⏸ 一時停止' : '▶ 再生';
    }

    animate() {
        if (!this.playback.isPlaying) return;

        const elapsed = (performance.now() - this.playback.startTime) / 1000;
        this.playback.currentBeat = elapsed * this.playback.bpm / 60;

        this.render();
        requestAnimationFrame(() => this.animate());
    }

    render() {
        this.ui.renderer.render(this.scoreData, this.playback.currentBeat);
    }

    save() {
        // 履歴に追加
        const stateJson = JSON.stringify(this.scoreData);
        
        // 新しい状態が前の状態と異なる場合のみ保存
        if (this.historyIndex === -1 || stateJson !== this.history[this.historyIndex]) {
            // redo スタックを削除
            this.history = this.history.slice(0, this.historyIndex + 1);
            
            // 新しい状態を追加
            this.history.push(stateJson);
            this.historyIndex = this.history.length - 1;
            
            // ローカルストレージに保存（auto-save）
            localStorage.setItem('mmw-score', stateJson);
            localStorage.setItem('mmw-history', JSON.stringify(this.history));
            localStorage.setItem('mmw-historyIndex', this.historyIndex.toString());
        }
    }

    load() {
        const saved = localStorage.getItem('mmw-score');
        const savedHistory = localStorage.getItem('mmw-history');
        const savedHistoryIndex = localStorage.getItem('mmw-historyIndex');
        
        if (saved) {
            this.scoreData = JSON.parse(saved);
            this.updateMetadataPanel();
        }
        
        // 履歴を復元
        if (savedHistory) {
            this.history = JSON.parse(savedHistory);
        }
        if (savedHistoryIndex !== null) {
            this.historyIndex = parseInt(savedHistoryIndex);
        }
    }

    /**
     * 前の状態に戻す（Undo）
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.scoreData = JSON.parse(this.history[this.historyIndex]);
            this.updateMetadataPanel();
            this.render();
            this.updateStatus('直前の編集を取り消しました');
        }
    }

    /**
     * 取り消した編集をもう一度実行（Redo）
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.scoreData = JSON.parse(this.history[this.historyIndex]);
            this.updateMetadataPanel();
            this.render();
            this.updateStatus('取り消した編集をやり直しました');
        }
    }

    updateStatus(message) {
        const statusEl = document.getElementById('status-message');
        if (statusEl) {
            statusEl.textContent = message;
            setTimeout(() => {
                statusEl.textContent = 'Ready';
            }, 3000);
        }
    }
}

// ページロード時に初期化
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new MikuMikuWorldEditor();
    window.editor.load();
});
