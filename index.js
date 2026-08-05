// index.js
// facilities.json を読み込み、各施設のCSV件数とlocalStorageの達成状況から
// 施設一覧カードと、SNS共有用の「まとめ画像」を描画する。

(async function () {
    const listEl = document.getElementById('facilityList');
    const shareBody = document.getElementById('shareBody');
    const overallCountEl = document.getElementById('overallCount');

    let facilities;
    try {
        facilities = await fetchJson('facilities.json');
    } catch (e) {
        listEl.innerHTML = '<p class="error-msg">facilities.jsonの読み込みに失敗しました。</p>';
        return;
    }

    const results = [];

    for (const config of facilities) {
        try {
            const malls = await fetchCsv(config.csv);
            const visitedIds = JSON.parse(localStorage.getItem(config.storageKey)) || [];
            const total = malls.length;
            const count = visitedIds.filter(id => malls.some(m => m.id === id)).length;
            results.push({ config, total, count });
        } catch (e) {
            results.push({ config, total: 0, count: 0, error: true });
        }
    }

    renderFacilityList(results);
    renderShareSummary(results);

    document.getElementById('saveShareBtn').onclick = function () {
        html2canvas(document.getElementById('shareCaptureArea'), {
            scale: 3,
            backgroundColor: "#ffffff"
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'stamp-rally-summary.png';
            link.href = canvas.toDataURL();
            link.click();
        });
    };

    // ---- render ----

    function renderFacilityList(results) {
        listEl.innerHTML = '';
        results.forEach(({ config, total, count, error }) => {
            const percent = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
            const a = document.createElement('a');
            a.className = 'facility-card';
            a.href = `rally.html?facility=${encodeURIComponent(config.id)}`;
            a.style.setProperty('--card-color', config.themeColor);
            a.innerHTML = `
                <span class="fc-name">${escapeHtml(config.name)}</span>
                <div class="fc-bar-wrap"><div class="fc-bar" style="width:${percent}%"></div></div>
                <span class="fc-stats">${error ? '読込エラー' : `${percent}% (${count}/${total})`}</span>
            `;
            listEl.appendChild(a);
        });
    }

    function renderShareSummary(results) {
        const totalAll = results.reduce((s, r) => s + r.total, 0);
        const countAll = results.reduce((s, r) => s + r.count, 0);
        
        overallCountEl.innerHTML = `リスト内 <span class="highlight-count">${countAll} / ${totalAll}</span> 施設 訪問済み`;

        shareBody.innerHTML = '';
        results.forEach(({ config, total, count }) => {
            const percent = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
            const row = document.createElement('div');
            row.className = 'share-row';
            row.innerHTML = `
                <span class="sr-name">${escapeHtml(config.name)}</span>
                <div class="sr-bar-wrap"><div class="sr-bar" style="width:${percent}%; background:${config.themeColor}"></div></div>
                <span class="sr-stats">${percent}% (${count}/${total})</span>
            `;
            shareBody.appendChild(row);
        });
    }

    // ---- helpers ----

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
