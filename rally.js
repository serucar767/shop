// rally.js
// URLの ?facility=xxx を見て facilities.json から設定を読み込み、
// 対応するCSVを読み込んでスタンプラリー画面を描画する汎用スクリプト。

(async function () {
    const params = new URLSearchParams(location.search);
    const facilityId = params.get('facility');

    const root = document.getElementById('app-root');

    if (!facilityId) {
        root.innerHTML = '<p class="error-msg">施設が指定されていません。トップページから選び直してください。</p>';
        return;
    }

    let facilities;
    try {
        facilities = await fetchJson('facilities.json');
    } catch (e) {
        root.innerHTML = '<p class="error-msg">施設一覧(facilities.json)の読み込みに失敗しました。</p>';
        return;
    }

    const config = facilities.find(f => f.id === facilityId);
    if (!config) {
        root.innerHTML = '<p class="error-msg">指定された施設が見つかりません: ' + escapeHtml(facilityId) + '</p>';
        return;
    }

    document.title = config.name + ' スタンプラリー';
    document.documentElement.style.setProperty('--theme-color', config.themeColor);

    let malls;
    try {
        malls = await fetchCsv(config.csv);
    } catch (e) {
        root.innerHTML = '<p class="error-msg">データ(' + escapeHtml(config.csv) + ')の読み込みに失敗しました。<br>'
            + 'GitHub PagesなどのWebサーバー経由で開いているか確認してください（file://直開きではCSVを読み込めません）。</p>';
        return;
    }

    const regionOrder = config.regionOrder && config.regionOrder.length
        ? config.regionOrder
        : [...new Set(malls.map(m => m.region))];

    buildLayout(root, config);

    let visitedIds = JSON.parse(localStorage.getItem(config.storageKey)) || [];

    function updateStats() {
        const total = malls.length;
        const count = visitedIds.length;
        const percent = total > 0 ? ((count / total) * 100).toFixed(2) : "0.00";

        document.getElementById('countDisplay').textContent = `${count} / ${total}`;
        document.getElementById('percentDisplay').textContent = `${percent}%`;

        const circleEl = document.getElementById('circleFill');
        if (circleEl) {
            circleEl.setAttribute("stroke-dasharray", `${percent}, 100`);
        }
    }

    function render() {
        const gridContainer = document.getElementById('mallGrid');
        gridContainer.innerHTML = "";

        regionOrder.forEach(regionName => {
            const regionMalls = malls.filter(m => m.region === regionName);
            if (regionMalls.length === 0) return;

            const visitedInRegion = regionMalls.filter(m => visitedIds.includes(m.id)).length;
            const regionTotal = regionMalls.length;
            const regionPercent = ((visitedInRegion / regionTotal) * 100).toFixed(2);

            const section = document.createElement('div');
            section.className = 'region-section';
            section.dataset.region = regionName;

            section.innerHTML = `
            <div class="region-header-row">
                <span class="region-title-text">${escapeHtml(regionName)}</span>
                <div class="region-progress-container">
                    <div class="region-progress-fill" style="width: ${regionPercent}%"></div>
                </div>
                <span class="region-stats-text">
                    ${regionPercent}% <small>(${visitedInRegion}/${regionTotal})</small>
                </span>
            </div>`;

            const header = section.querySelector('.region-header-row');
            header.onclick = () => {
                section.classList.toggle('collapsed');
            };

            const subGrid = document.createElement('div');
            subGrid.className = 'sub-grid';

            regionMalls.forEach(mall => {
                const isVisited = visitedIds.includes(mall.id);
                const chip = document.createElement('div');
                chip.className = `mall-chip ${isVisited ? 'visited' : ''}`;
                chip.innerText = mall.name;

                chip.onclick = (e) => {
                    e.stopPropagation();
                    toggleVisit(mall.id, chip);
                };

                subGrid.appendChild(chip);
            });

            section.appendChild(subGrid);
            gridContainer.appendChild(section);
        });

        updateStats();
    }

    function toggleVisit(id, element) {
        if (visitedIds.includes(id)) {
            visitedIds = visitedIds.filter(v => v !== id);
            element.classList.remove('visited');
        } else {
            visitedIds.push(id);
            element.classList.add('visited');
        }
        localStorage.setItem(config.storageKey, JSON.stringify(visitedIds));

        updateStats();
        updateAllRegionBars();
    }

    function updateAllRegionBars() {
        regionOrder.forEach(regionName => {
            const regionMalls = malls.filter(m => m.region === regionName);
            const visitedInRegion = regionMalls.filter(m => visitedIds.includes(m.id)).length;
            const regionTotal = regionMalls.length;
            const regionPercent = ((visitedInRegion / regionTotal) * 100).toFixed(2);

            const sec = document.querySelector(`.region-section[data-region="${cssEscape(regionName)}"]`);
            if (sec) {
                const bar = sec.querySelector('.region-progress-fill');
                const stats = sec.querySelector('.region-stats-text');
                if (bar) bar.style.width = `${regionPercent}%`;
                if (stats) stats.innerHTML = `${regionPercent}% <small>(${visitedInRegion}/${regionTotal})</small>`;
            }
        });
    }

    document.getElementById('saveBtn').onclick = function () {
        html2canvas(document.getElementById('captureArea'), {
            scale: 3,
            backgroundColor: "#9f9f9f"
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `${facilityId}-stamp-log.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    };

    render();

    // ---- helpers ----

    function buildLayout(root, config) {
        root.innerHTML = `
        <a class="back-link" href="index.html">← 施設一覧に戻る</a>
        <div id="captureArea">
            <div class="stats-header">
                <h1>${escapeHtml(config.fullName || config.name)}</h1>
                <div class="chart-container-mini">
                    <svg viewBox="0 0 36 36" class="circular-chart">
                        <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="circle" id="circleFill" stroke-dasharray="0, 100"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <text x="18" y="20.35" class="percentage" id="percentDisplay">0.00%</text>
                    </svg>
                    <div class="total-count-mini" id="countDisplay">0 / 0</div>
                </div>
            </div>
            <div id="mallGrid"><p class="loading">読み込み中...</p></div>
        </div>
        <div class="controls">
            <button class="btn-save" id="saveBtn">結果を画像で保存する</button>
        </div>`;
    }

    function cssEscape(str) {
        return String(str).replace(/["\\]/g, '\\$&');
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    async function fetchJson(path) {
        const res = await fetch(path);
        if (!res.ok) throw new Error('fetch failed: ' + path);
        return res.json();
    }

    async function fetchCsv(path) {
        const res = await fetch(path);
        if (!res.ok) throw new Error('fetch failed: ' + path);
        const text = await res.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        return parsed.data.map(row => ({
            id: Number(row.id),
            region: row.region,
            name: (row.name || '').replace(/\\n/g, '\n')
        }));
    }
})();
