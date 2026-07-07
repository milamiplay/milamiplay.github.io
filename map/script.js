const REGIONS = [
    { code: 'UA-07', name: 'Волинська' },         { code: 'UA-56', name: 'Рівненська' },
    { code: 'UA-18', name: 'Житомирська' },        { code: 'UA-32', name: 'Київська' },
    { code: 'UA-74', name: 'Чернігівська' },       { code: 'UA-59', name: 'Сумська' },
    { code: 'UA-46', name: 'Львівська' },          { code: 'UA-61', name: 'Тернопільська' },
    { code: 'UA-68', name: 'Хмельницька' },        { code: 'UA-05', name: 'Вінницька' },
    { code: 'UA-71', name: 'Черкаська' },          { code: 'UA-53', name: 'Полтавська' },
    { code: 'UA-63', name: 'Харківська' },         { code: 'UA-21', name: 'Закарпатська' },
    { code: 'UA-26', name: 'Івано-Франківська' },  { code: 'UA-77', name: 'Чернівецька' },
    { code: 'UA-51', name: 'Одеська' },            { code: 'UA-48', name: 'Миколаївська' },
    { code: 'UA-35', name: 'Кіровоградська' },     { code: 'UA-12', name: 'Дніпропетровська' },
    { code: 'UA-65', name: 'Херсонська' },         { code: 'UA-23', name: 'Запорізька' },
    { code: 'UA-14', name: 'Донецька' },           { code: 'UA-09', name: 'Луганська' },
    { code: 'UA-43', name: 'АР Крим' },
];

const ALIASES    = { 'UA-30': 'UA-32', 'UA-40': 'UA-43' };
const STORAGE_KEY = 'ua-price-map-state-v2';
const VISUAL_DEFAULTS_VERSION = 3;

// ── State ──────────────────────────────────────────────────────────────────
const state = {
    visualDefaultsVersion: VISUAL_DEFAULTS_VERSION,
    data:             REGIONS.reduce((acc, r) => ({ ...acc, [r.code]: { t: null, n: null } }), {}),
    colorBy:          'delta',   // 'delta' | 't' | 'n'
    palette:          'YlGnBu',
    colorMin:         18,
    colorMax:         82,
    signedDeltaColors:true,
    // text colours
    regionNameColor:  '#241a4d',
    tenderColor:      '#241a4d',
    hipiColor:        '#b8720c',
    titleAccentColor: '#f5a623',
    // typography
    priceFontSize:    11.4,
    nameFontSize:     8.5,
    priceStroke:      2.4,       // halo width for price values (0 = off)
    nameStroke:       2.2,       // halo width for oblast names (0 = off)
    textContrastMode: 'smart',   // 'smart' | 'manual'
    mapFontFamily:    'Arial, sans-serif',
    priceFontWeight:  800,
    nameFontWeight:   700,
    priceLineGap:     1.05,
    labelGap:         0.85,
    showRegionNames:  true,
    // canvas / map
    canvasBg:         '#ffffff',
    regionStroke:     1,         // border between regions in px
    regionStrokeColor:'#ffffff',
    // legend & labels
    legendUnit:       'грн/т з ПДВ',
    labelTender:      'Тендер',
    labelNipi:        'НІРІ',
    titleColor:       '#241a4d',
    titleFontSize:    30,
    titleLineHeight:  1.2,
    descriptionColor: '#475569',
    descriptionFontSize: 11,
    descriptionLineHeight: 1.65,
    legendColor:      '#1e293b',
    legendFontSize:   11,
    legendLineHeight: 1.4,
    // title & description
    title1:           'СЕРЕДНІ ЦІНИ',
    titleAccent:      'АРМАТУРИ',
    titleRest:        '',
    description:      'Дані: арматура класу А-ІІІ, А400С, А500С.\nПеріод: вересень 2025 — квітень 2026.\nНа карті показано дельту між середньою ціною тендеру та середньою ціною НІРІ, грн/т з ПДВ.',
};

function upgradeVisualDefaults(saved = {}) {
    if ((saved.visualDefaultsVersion || 0) >= VISUAL_DEFAULTS_VERSION) return;
    if (saved.palette === undefined || saved.palette === 'Purples') state.palette = 'YlGnBu';
    if (saved.colorMin === undefined || saved.colorMin === 30) state.colorMin = 18;
    if (saved.colorMax === undefined || saved.colorMax === 100) state.colorMax = 82;
    if (saved.signedDeltaColors === undefined) state.signedDeltaColors = true;
    if (saved.priceStroke === undefined || saved.priceStroke === 0) state.priceStroke = 2.4;
    if (saved.nameStroke === undefined || saved.nameStroke === 0) state.nameStroke = 2.2;
    if (saved.textContrastMode === undefined) state.textContrastMode = 'smart';
    state.visualDefaultsVersion = VISUAL_DEFAULTS_VERSION;
}

// ── Persistence ────────────────────────────────────────────────────────────
function loadState() {
    try {
        const v2 = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (v2) {
            if (v2.data) Object.keys(state.data).forEach(k => { if (v2.data[k]) state.data[k] = v2.data[k]; });
            Object.keys(state).filter(k => k !== 'data').forEach(k => {
                if (v2[k] !== undefined) state[k] = v2[k];
            });
            upgradeVisualDefaults(v2);
            return;
        }
        // Migrate price data from legacy v1
        const v1 = JSON.parse(localStorage.getItem('ua-price-map-state-v1') || 'null');
        if (v1) {
            if (v1.data)    Object.keys(state.data).forEach(k => { if (v1.data[k]) state.data[k] = v1.data[k]; });
            if (v1.palette) state.palette = v1.palette;
            upgradeVisualDefaults(v1);
        }
    } catch (_) {}
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── Utilities ──────────────────────────────────────────────────────────────
function parseNum(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = parseFloat(String(v).replace(/[\s ]/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

function formatMoney(v) {
    return Math.round(v).toLocaleString('uk-UA');
}

function codeForPathId(id) {
    const code = id.replace(/^region-/, '');
    return ALIASES[code] || code;
}

// Rounds up to 1/2/5 × 10^n so the colour scale always uses a meaningful range.
function niceMax(v) {
    if (!v || v <= 0) return 10;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const r   = v / mag;
    return (r > 5 ? 10 : r > 2 ? 5 : r > 1 ? 2 : 1) * mag;
}

// ── CSS variable sync ──────────────────────────────────────────────────────
function updateCSSVars() {
    const r = document.documentElement.style;
    r.setProperty('--price-font-size', state.priceFontSize + 'px');
    r.setProperty('--name-font-size',  state.nameFontSize  + 'px');
    r.setProperty('--price-stroke',    state.priceStroke   + 'px');
    r.setProperty('--name-stroke',     state.nameStroke    + 'px');
    r.setProperty('--region-stroke',   state.regionStroke  + 'px');
    r.setProperty('--map-font-family', state.mapFontFamily);
    r.setProperty('--price-font-weight', state.priceFontWeight);
    r.setProperty('--name-font-weight', state.nameFontWeight);
    document.getElementById('capture-area').style.background = state.canvasBg;
    document.querySelectorAll('#map-paths .map-region').forEach(el => {
        el.style.stroke = state.regionStrokeColor;
    });
}

function cssColorToHex(color) {
    if (!color) return null;
    if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
    const match = String(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return null;
    return '#' + [match[1], match[2], match[3]]
        .map(v => Number(v).toString(16).padStart(2, '0'))
        .join('');
}

function hexToRgb(hex) {
    const safeHex = cssColorToHex(hex);
    if (!safeHex) return null;
    return {
        r: parseInt(safeHex.slice(1, 3), 16),
        g: parseInt(safeHex.slice(3, 5), 16),
        b: parseInt(safeHex.slice(5, 7), 16),
    };
}

function relativeLuminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 1;
    const linear = [rgb.r, rgb.g, rgb.b].map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(a, b) {
    const l1 = relativeLuminance(a);
    const l2 = relativeLuminance(b);
    const hi = Math.max(l1, l2);
    const lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
}

function bestTextColorFor(bgColor) {
    const bg = cssColorToHex(bgColor) || '#ffffff';
    return contrastRatio('#111827', bg) >= contrastRatio('#ffffff', bg) ? '#111827' : '#ffffff';
}

function readableTextColor(preferred, bgColor, minRatio = 4.5) {
    const bg = cssColorToHex(bgColor) || '#ffffff';
    const pref = cssColorToHex(preferred) || preferred;
    if (state.textContrastMode === 'manual') return pref;
    return contrastRatio(pref, bg) >= minRatio ? pref : bestTextColorFor(bg);
}

function strokeColorFor(textColor, bgColor) {
    const bg = cssColorToHex(bgColor);
    if (bg && contrastRatio(textColor, bg) >= 7) {
        return relativeLuminance(textColor) > relativeLuminance(bg)
            ? 'rgba(17,24,39,0.72)'
            : 'rgba(255,255,255,0.88)';
    }
    return relativeLuminance(textColor) > 0.45
        ? 'rgba(17,24,39,0.82)'
        : 'rgba(255,255,255,0.92)';
}

// ── Mode-aware value helpers ───────────────────────────────────────────────
function valueForMode(code) {
    const v = state.data[code];
    if (!v) return null;
    if (state.colorBy === 'delta') return (v.t === null || v.n === null) ? null : v.t - v.n;
    if (state.colorBy === 't')     return v.t;
    if (state.colorBy === 'n')     return v.n;
    return null;
}

function computeMax() {
    let max = 0;
    REGIONS.forEach(r => { const v = valueForMode(r.code); if (v !== null) max = Math.max(max, Math.abs(v)); });
    return niceMax(max);
}

// ── Colour scale ───────────────────────────────────────────────────────────
const DIVERGING_PALETTES = new Set([
    'RdYlGn', 'RdYlBu', 'RdBu', 'PuOr', 'BrBG', 'PiYG', 'Spectral',
]);

function interpolatorForPalette(name, fallback = 'YlGnBu') {
    return d3[`interpolate${name}`] || d3[`interpolate${fallback}`];
}

function usesDivergingScale() {
    return state.colorBy === 'delta' && state.signedDeltaColors && DIVERGING_PALETTES.has(state.palette);
}

function divergingT(v, maxV) {
    if (!maxV) return 0.5;
    return Math.max(0, Math.min(1, 0.5 - (v / maxV) * 0.5));
}

function colorForValue(v, maxV) {
    if (v === null) return null;
    if (usesDivergingScale()) {
        return interpolatorForPalette(state.palette, 'RdYlGn')(divergingT(v, maxV));
    }
    const interpolator = interpolatorForPalette(state.palette);
    if (!interpolator) return null;
    const frac = Math.min(Math.abs(v) / maxV, 1);
    const lo   = state.colorMin / 100;
    const hi   = state.colorMax / 100;
    return interpolator(lo + (hi - lo) * frac);
}

// ── Legend ─────────────────────────────────────────────────────────────────
function updateLegend(maxV) {
    const interpolator = interpolatorForPalette(state.palette);
    const lo = state.colorMin / 100;
    const hi = state.colorMax / 100;
    const stops = 14;
    let css;
    if (usesDivergingScale()) {
        css = Array.from({ length: stops + 1 }, (_, i) =>
            interpolator(1 - (i / stops))
        ).join(', ');
    } else if (state.colorBy === 'delta' && state.signedDeltaColors) {
        const neg = Array.from({ length: stops + 1 }, (_, i) =>
            interpolator(hi - (hi - lo) * (i / stops))
        );
        const pos = Array.from({ length: stops + 1 }, (_, i) =>
            interpolator(lo + (hi - lo) * (i / stops))
        );
        css = [...neg, '#f8fafc', ...pos].join(', ');
    } else {
        if (!interpolator) return;
        css = Array.from({ length: stops + 1 }, (_, i) =>
            interpolator(lo + (hi - lo) * (i / stops))
        ).join(', ');
    }
    const grad = `linear-gradient(to right, ${css})`;
    document.getElementById('legend-gradient').style.background = grad;
    document.getElementById('palette-preview').style.background = grad;

    const ticksEl = document.getElementById('legend-ticks');
    ticksEl.innerHTML = '';
    for (let i = 0; i <= 5; i++) {
        const span = document.createElement('span');
        const raw = state.colorBy === 'delta' && state.signedDeltaColors
            ? -maxV + (maxV * 2 / 5) * i
            : (maxV / 5) * i;
        span.textContent = Math.round(raw).toLocaleString('uk-UA');
        ticksEl.appendChild(span);
    }
}

// ── Map rendering ──────────────────────────────────────────────────────────
function updateMap() {
    const maxV    = computeMax();
    const isDelta = state.colorBy === 'delta';
    updateLegend(maxV);

    document.querySelectorAll('#map-paths .map-region').forEach(el => {
        const code = codeForPathId(el.id);
        const v    = valueForMode(code);
        const fill = colorForValue(v, maxV);
        const bgColor = fill || '#ebebee';
        el.classList.toggle('no-data', v === null);
        el.style.fill = fill || '';

        const label = document.getElementById('label-' + code);
        if (!label) return;
        const vals = state.data[code];

        const nameEl = label.querySelector('.region-name');
        const tEl    = label.querySelector('.region-tender');
        const nEl    = label.querySelector('.region-hipi');

        // Region names
        const nameColor = readableTextColor(state.regionNameColor, bgColor, 4.5);
        nameEl.setAttribute('fill', nameColor);
        nameEl.style.stroke  = strokeColorFor(nameColor, bgColor);
        nameEl.setAttribute('dy', isDelta ? `-${state.labelGap}em` : '-0.48em');
        nameEl.style.display = state.showRegionNames ? '' : 'none';

        // Price rows
        tEl.setAttribute('dy', isDelta ? '0.62em' : '0.86em');

        if (isDelta) {
            const tenderTextColor = readableTextColor(state.tenderColor, bgColor, 4.5);
            const hipiTextColor = readableTextColor(state.hipiColor, bgColor, 4.5);
            tEl.setAttribute('fill', tenderTextColor);
            tEl.style.stroke = strokeColorFor(tenderTextColor, bgColor);
            tEl.textContent  = vals.t === null ? 'н/д' : formatMoney(vals.t);
            nEl.setAttribute('dy', (0.62 + state.priceLineGap) + 'em');
            nEl.setAttribute('fill', hipiTextColor);
            nEl.style.stroke = strokeColorFor(hipiTextColor, bgColor);
            nEl.textContent  = vals.n === null ? 'н/д' : formatMoney(vals.n);
        } else {
            const raw   = state.colorBy === 't' ? vals.t : vals.n;
            const color = state.colorBy === 't' ? state.tenderColor : state.hipiColor;
            const textColor = readableTextColor(color, bgColor, 4.5);
            tEl.setAttribute('fill', textColor);
            tEl.style.stroke = strokeColorFor(textColor, bgColor);
            tEl.textContent  = raw === null ? 'н/д' : formatMoney(raw);
            nEl.textContent  = '';
        }
    });

    saveState();
}

// ── SVG labels (built once on init) ───────────────────────────────────────
function buildLabels() {
    const layer = document.getElementById('map-labels');
    layer.innerHTML = '';
    const seen = new Set();

    document.querySelectorAll('#map-paths .map-region').forEach(el => {
        const code = codeForPathId(el.id);
        if (seen.has(code)) return;
        seen.add(code);
        const region = REGIONS.find(r => r.code === code);
        if (!region) return;

        const b = el.getBBox();
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('id', 'label-' + code);
        g.setAttribute('transform', `translate(${b.x + b.width / 2},${b.y + b.height / 2})`);

        const name = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        name.setAttribute('class', 'region-name');
        name.setAttribute('dy', '-0.9em');
        name.textContent = region.name;

        const tender = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tender.setAttribute('class', 'region-value region-tender');
        tender.setAttribute('dy', '0.6em');

        const hipi = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        hipi.setAttribute('class', 'region-value region-hipi');
        hipi.setAttribute('dy', '1.6em');

        g.append(name, tender, hipi);
        layer.appendChild(g);
    });
}

// ── Per-region data inputs ─────────────────────────────────────────────────
function buildInputs() {
    const container = document.getElementById('input-container');
    container.innerHTML = '';
    REGIONS.forEach(r => {
        const vals = state.data[r.code];
        const row  = document.createElement('div');
        row.className = 'region-row';
        row.innerHTML = `
            <div class="region-row-label">${r.name}</div>
            <div class="region-inputs">
                <input type="number" placeholder="Тендер" value="${vals.t ?? ''}"
                    data-code="${r.code}" data-field="t">
                <input type="number" placeholder="НІРІ" value="${vals.n ?? ''}"
                    data-code="${r.code}" data-field="n">
            </div>`;
        container.appendChild(row);
    });
    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', e => {
            state.data[e.target.dataset.code][e.target.dataset.field] = parseNum(e.target.value);
            updateMap();
        });
    });
}

// ── Canvas display sync ─────────────────────────────────────────────────────
const LEGEND_TITLE = {
    delta: unit => `Різниця цін (тендер − НІРІ), ${unit}`,
    t:     unit => `Середня ціна тендеру, ${unit}`,
    n:     unit => `Середня ціна НІРІ, ${unit}`,
};

function syncDisplay() {
    const titleEl = document.getElementById('display-title');
    const title1El = document.getElementById('display-title1');
    const accentEl = document.getElementById('display-accent');
    const restEl = document.getElementById('display-rest');
    const descriptionEl = document.getElementById('display-description');
    const legendTitleEl = document.getElementById('display-legend-title');
    const legendTicksEl = document.getElementById('legend-ticks');
    const seriesLegendEl = document.getElementById('series-legend');
    const noDataLabelEl = document.getElementById('no-data-label');

    title1El.textContent = state.title1;
    accentEl.textContent = state.titleAccent + (state.titleRest ? ' ' : '');
    accentEl.style.color = state.titleAccentColor;
    restEl.textContent = state.titleRest;
    titleEl.style.color = state.titleColor;
    titleEl.style.fontSize = state.titleFontSize + 'px';
    titleEl.style.lineHeight = state.titleLineHeight;

    descriptionEl.textContent = state.description;
    descriptionEl.style.color = state.descriptionColor;
    descriptionEl.style.fontSize = state.descriptionFontSize + 'px';
    descriptionEl.style.lineHeight = state.descriptionLineHeight;

    legendTitleEl.textContent = LEGEND_TITLE[state.colorBy](state.legendUnit);
    legendTitleEl.style.color = state.legendColor;
    legendTitleEl.style.fontSize = state.legendFontSize + 'px';
    legendTitleEl.style.lineHeight = state.legendLineHeight;
    legendTicksEl.style.color = state.legendColor;
    legendTicksEl.style.fontSize = Math.max(8, state.legendFontSize - 1) + 'px';
    seriesLegendEl.style.color = state.legendColor;
    seriesLegendEl.style.fontSize = state.legendFontSize + 'px';
    noDataLabelEl.style.color = state.legendColor;
    noDataLabelEl.style.fontSize = state.legendFontSize + 'px';
    document.getElementById('label-tender-display').textContent = state.labelTender;
    document.getElementById('label-nipi-display').textContent   = state.labelNipi;
    document.getElementById('dot-tender').style.background = state.tenderColor;
    document.getElementById('dot-nipi').style.background   = state.hipiColor;

    // Show/hide legend rows based on mode
    document.getElementById('nipi-legend-row').style.display   = state.colorBy !== 't' ? '' : 'none';
    document.getElementById('tender-legend-row').style.display = state.colorBy !== 'n' ? '' : 'none';
}

// ── Sync sidebar form controls from state (called once on init) ────────────
function syncUIFromState() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setChecked = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };

    set('color-by',              state.colorBy);
    set('title-line1',           state.title1);
    set('title-accent',          state.titleAccent);
    set('title-rest',            state.titleRest);
    set('description',           state.description);
    set('palette-select',        state.palette);
    setChecked('signed-delta-colors', state.signedDeltaColors);
    set('color-min',             state.colorMin);
    set('color-max',             state.colorMax);
    setText('color-min-val',     state.colorMin + '%');
    setText('color-max-val',     state.colorMax + '%');
    set('canvas-bg',             state.canvasBg);
    set('canvas-bg-hex',         state.canvasBg);
    set('region-stroke',         state.regionStroke);
    setText('region-stroke-val', state.regionStroke + 'px');
    set('region-stroke-color',   state.regionStrokeColor);
    set('region-stroke-color-hex', state.regionStrokeColor);
    set('region-name-color',     state.regionNameColor);
    set('region-name-color-hex', state.regionNameColor);
    set('tender-color',          state.tenderColor);
    set('tender-color-hex',      state.tenderColor);
    set('hipi-color',            state.hipiColor);
    set('hipi-color-hex',        state.hipiColor);
    setChecked('smart-contrast', state.textContrastMode === 'smart');
    set('map-font-family',       state.mapFontFamily);
    set('title-accent-color',    state.titleAccentColor);
    set('title-accent-color-hex', state.titleAccentColor);
    set('title-color',           state.titleColor);
    set('title-color-hex',       state.titleColor);
    set('title-font-size',       state.titleFontSize);
    setText('title-font-val',    state.titleFontSize + 'px');
    set('title-line-height',     state.titleLineHeight);
    setText('title-line-height-val', state.titleLineHeight);
    set('description-color',     state.descriptionColor);
    set('description-color-hex', state.descriptionColor);
    set('description-font-size', state.descriptionFontSize);
    setText('description-font-val', state.descriptionFontSize + 'px');
    set('description-line-height', state.descriptionLineHeight);
    setText('description-line-height-val', state.descriptionLineHeight);
    set('legend-color',          state.legendColor);
    set('legend-color-hex',      state.legendColor);
    set('legend-font-size',      state.legendFontSize);
    setText('legend-font-val',   state.legendFontSize + 'px');
    set('legend-line-height',    state.legendLineHeight);
    setText('legend-line-height-val', state.legendLineHeight);
    set('price-font-size',       state.priceFontSize);
    setText('price-font-val',    state.priceFontSize + 'px');
    set('name-font-size',        state.nameFontSize);
    setText('name-font-val',     state.nameFontSize + 'px');
    set('price-font-weight',     state.priceFontWeight);
    setText('price-weight-val',  state.priceFontWeight);
    set('name-font-weight',      state.nameFontWeight);
    setText('name-weight-val',   state.nameFontWeight);
    set('price-line-gap',        state.priceLineGap);
    setText('price-line-gap-val', state.priceLineGap + 'em');
    set('label-gap',             state.labelGap);
    setText('label-gap-val',     state.labelGap + 'em');
    set('price-stroke',          state.priceStroke);
    setText('price-stroke-val',  state.priceStroke + 'px');
    set('name-stroke',           state.nameStroke);
    setText('name-stroke-val',   state.nameStroke + 'px');
    setChecked('show-names',     state.showRegionNames);
    set('legend-unit',           state.legendUnit);
    set('label-tender',          state.labelTender);
    set('label-nipi',            state.labelNipi);
}

// ── Auto-grow textarea ─────────────────────────────────────────────────────
function autoGrow(el) { el.style.height = 'auto'; el.style.height = (el.scrollHeight + 2) + 'px'; }
const descEl = document.getElementById('description');

// ── Sidebar toggle ─────────────────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
let sidebarOpen = false;

function openSidebar()  { sidebar.classList.add('open');    sidebarOpen = true;  }
function closeSidebar() { sidebar.classList.remove('open'); sidebarOpen = false; }

document.getElementById('sidebar-toggle').addEventListener('click', () => {
    sidebarOpen ? closeSidebar() : openSidebar();
});
document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sidebarOpen) closeSidebar(); });

// ── Event listeners ─────────────────────────────────────────────────────────

// Mode
document.getElementById('color-by').addEventListener('change', e => {
    state.colorBy = e.target.value;
    syncDisplay();
    updateMap();
});

// Text inputs → state
function bindText(id, key, callback) {
    document.getElementById(id).addEventListener('input', e => {
        state[key] = e.target.value;
        if (callback) callback();
        else { syncDisplay(); saveState(); }
    });
}
bindText('title-line1',  'title1');
bindText('title-accent', 'titleAccent');
bindText('title-rest',   'titleRest');
bindText('legend-unit',  'legendUnit');
bindText('label-tender', 'labelTender');
bindText('label-nipi',   'labelNipi');

descEl.addEventListener('input', e => {
    state.description = e.target.value;
    autoGrow(descEl);
    syncDisplay();
    saveState();
});

// Palette
document.getElementById('palette-select').addEventListener('change', e => {
    state.palette = e.target.value;
    updateMap();
});

document.getElementById('signed-delta-colors').addEventListener('change', e => {
    state.signedDeltaColors = e.target.checked;
    updateMap();
});

// Intensity sliders
document.getElementById('color-min').addEventListener('input', e => {
    state.colorMin = +e.target.value;
    document.getElementById('color-min-val').textContent = state.colorMin + '%';
    updateMap();
});
document.getElementById('color-max').addEventListener('input', e => {
    state.colorMax = +e.target.value;
    document.getElementById('color-max-val').textContent = state.colorMax + '%';
    updateMap();
});

// Region border width
document.getElementById('region-stroke').addEventListener('input', e => {
    state.regionStroke = +e.target.value;
    document.getElementById('region-stroke-val').textContent = state.regionStroke + 'px';
    updateCSSVars();
    saveState();
});

// Typography sliders
document.getElementById('price-font-size').addEventListener('input', e => {
    state.priceFontSize = +e.target.value;
    document.getElementById('price-font-val').textContent = state.priceFontSize + 'px';
    updateCSSVars();
    saveState();
});
document.getElementById('name-font-size').addEventListener('input', e => {
    state.nameFontSize = +e.target.value;
    document.getElementById('name-font-val').textContent = state.nameFontSize + 'px';
    updateCSSVars();
    saveState();
});
document.getElementById('price-stroke').addEventListener('input', e => {
    state.priceStroke = +e.target.value;
    document.getElementById('price-stroke-val').textContent = state.priceStroke + 'px';
    updateCSSVars();
    saveState();
});
document.getElementById('name-stroke').addEventListener('input', e => {
    state.nameStroke = +e.target.value;
    document.getElementById('name-stroke-val').textContent = state.nameStroke + 'px';
    updateCSSVars();
    saveState();
});

document.getElementById('price-font-weight').addEventListener('input', e => {
    state.priceFontWeight = +e.target.value;
    document.getElementById('price-weight-val').textContent = state.priceFontWeight;
    updateCSSVars();
    saveState();
});
document.getElementById('name-font-weight').addEventListener('input', e => {
    state.nameFontWeight = +e.target.value;
    document.getElementById('name-weight-val').textContent = state.nameFontWeight;
    updateCSSVars();
    saveState();
});
document.getElementById('price-line-gap').addEventListener('input', e => {
    state.priceLineGap = +e.target.value;
    document.getElementById('price-line-gap-val').textContent = state.priceLineGap + 'em';
    updateMap();
});
document.getElementById('label-gap').addEventListener('input', e => {
    state.labelGap = +e.target.value;
    document.getElementById('label-gap-val').textContent = state.labelGap + 'em';
    updateMap();
});

document.getElementById('map-font-family').addEventListener('change', e => {
    state.mapFontFamily = e.target.value;
    updateCSSVars();
    saveState();
});

document.getElementById('title-font-size').addEventListener('input', e => {
    state.titleFontSize = +e.target.value;
    document.getElementById('title-font-val').textContent = state.titleFontSize + 'px';
    syncDisplay();
    saveState();
});
document.getElementById('title-line-height').addEventListener('input', e => {
    state.titleLineHeight = +e.target.value;
    document.getElementById('title-line-height-val').textContent = state.titleLineHeight;
    syncDisplay();
    saveState();
});
document.getElementById('description-font-size').addEventListener('input', e => {
    state.descriptionFontSize = +e.target.value;
    document.getElementById('description-font-val').textContent = state.descriptionFontSize + 'px';
    syncDisplay();
    saveState();
});
document.getElementById('description-line-height').addEventListener('input', e => {
    state.descriptionLineHeight = +e.target.value;
    document.getElementById('description-line-height-val').textContent = state.descriptionLineHeight;
    syncDisplay();
    saveState();
});
document.getElementById('legend-font-size').addEventListener('input', e => {
    state.legendFontSize = +e.target.value;
    document.getElementById('legend-font-val').textContent = state.legendFontSize + 'px';
    syncDisplay();
    saveState();
});
document.getElementById('legend-line-height').addEventListener('input', e => {
    state.legendLineHeight = +e.target.value;
    document.getElementById('legend-line-height-val').textContent = state.legendLineHeight;
    syncDisplay();
    saveState();
});

// Show/hide region names
document.getElementById('show-names').addEventListener('change', e => {
    state.showRegionNames = e.target.checked;
    updateMap();
});

document.getElementById('smart-contrast').addEventListener('change', e => {
    state.textContrastMode = e.target.checked ? 'smart' : 'manual';
    updateMap();
});

// Colour pickers (picker ↔ hex field in sync)
function bindColorPicker(pickerId, hexId, stateKey, onApply) {
    const picker = document.getElementById(pickerId);
    const hex    = document.getElementById(hexId);
    const apply = v => {
        state[stateKey] = v;
        picker.value = v;
        hex.value    = v;
        onApply(v);
        saveState();
    };
    picker.addEventListener('input', e => apply(e.target.value));
    hex.addEventListener('change', e => {
        const v = e.target.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) apply(v);
    });
}

bindColorPicker('canvas-bg', 'canvas-bg-hex', 'canvasBg', () => updateCSSVars());
bindColorPicker('region-stroke-color', 'region-stroke-color-hex', 'regionStrokeColor', () => updateCSSVars());

bindColorPicker('region-name-color', 'region-name-color-hex', 'regionNameColor', () => updateMap());

bindColorPicker('tender-color', 'tender-color-hex', 'tenderColor', v => {
    document.getElementById('dot-tender').style.background = v;
    updateMap();
});
bindColorPicker('hipi-color', 'hipi-color-hex', 'hipiColor', v => {
    document.getElementById('dot-nipi').style.background = v;
    updateMap();
});
bindColorPicker('title-accent-color', 'title-accent-color-hex', 'titleAccentColor', () => syncDisplay());
bindColorPicker('title-color', 'title-color-hex', 'titleColor', () => syncDisplay());
bindColorPicker('description-color', 'description-color-hex', 'descriptionColor', () => syncDisplay());
bindColorPicker('legend-color', 'legend-color-hex', 'legendColor', () => syncDisplay());

// Bulk paste
document.getElementById('bulk-apply').addEventListener('click', () => {
    document.getElementById('bulk-paste').value
        .split('\n').map(l => l.trim()).filter(Boolean)
        .forEach(line => {
            const parts = line.split(/[;\t]/).map(p => p.trim());
            if (parts.length < 2) return;
            const region = REGIONS.find(r => r.name.toLowerCase() === parts[0].toLowerCase());
            if (!region) return;
            state.data[region.code] = { t: parseNum(parts[1]), n: parseNum(parts[2] ?? null) };
        });
    buildInputs();
    updateMap();
});

// Reset data
document.getElementById('reset-btn').addEventListener('click', () => {
    REGIONS.forEach(r => { state.data[r.code] = { t: null, n: null }; });
    buildInputs();
    updateMap();
});

// Export PNG
const exportBtn = document.getElementById('export-btn');
exportBtn.addEventListener('click', () => {
    closeSidebar();
    const toggleBtn = document.getElementById('sidebar-toggle');
    const area      = document.getElementById('capture-area');
    toggleBtn.style.display  = 'none';
    exportBtn.disabled       = true;
    exportBtn.textContent    = 'Зберігається…';

    const W = area.offsetWidth;
    const H = area.offsetHeight;
    area.style.width  = W + 'px';
    area.style.height = H + 'px';

    const restore = () => {
        area.style.width     = '';
        area.style.height    = '';
        toggleBtn.style.display = '';
        exportBtn.disabled   = false;
        exportBtn.textContent = 'Експорт PNG';
    };

    setTimeout(() => {
        html2canvas(area, {
            scale:        2,
            backgroundColor: state.canvasBg,
            useCORS:      false,
            scrollX:      0,
            scrollY:      0,
            width:        W,
            height:       H,
            windowWidth:  W,
            windowHeight: H,
        }).then(canvas => {
            restore();
            const a = document.createElement('a');
            a.download = 'map.png';
            a.href = canvas.toDataURL('image/png');
            a.click();
        }).catch(() => restore());
    }, 50);
});

// ── Init ───────────────────────────────────────────────────────────────────
function init() {
    loadState();
    syncUIFromState();
    syncDisplay();
    updateCSSVars();
    buildInputs();
    buildLabels();
    updateMap();
    autoGrow(descEl);
}

init();
