import { useUiStore } from '../../store/uiStore.js';
import { SegmentedControl, Toggle } from '../../ui/Controls.jsx';
import s from './Scene.module.css';

const COLOUR_OPTIONS = [
  { value: 'sinking', label: 'Sinking' },
  { value: 'speed', label: 'Speed' },
  { value: 'battery', label: 'Battery' },
  { value: 'signal', label: 'Signal' },
  { value: 'meshLayer', label: 'Mesh layer' },
];
const VIEW_OPTIONS = [
  { value: 'top', label: 'Top', title: 'Plan view (1)' },
  { value: 'oblique', label: 'Oblique', title: 'Oblique view (2)' },
  { value: 'section', label: 'Section', title: 'Draw a section (3)' },
];
const LAYERS = [
  { key: 'links', label: 'Links' },
  { key: 'backup', label: 'Backup links' },
  { key: 'surface', label: 'Surface' },
  { key: 'zones', label: 'Zones', title: 'Z' },
  { key: 'labels', label: 'Labels', title: 'L' },
  { key: 'packets', label: 'Packets' },
];

/** Top-left: colour by and layers. */
export function ColourAndLayers() {
  const { colourBy, setColourBy, layers, toggleLayer } = useUiStore();
  return (
    <div className={`${s.overlay} ${s.topLeft}`}>
      <div className={s.row}>
        <span className={s.overlayLabel}>Colour by</span>
        <SegmentedControl
          label="Colour nodes by"
          options={COLOUR_OPTIONS}
          value={colourBy}
          onChange={setColourBy}
        />
      </div>
      <div className={s.row} role="group" aria-label="Layers">
        <span className={s.overlayLabel}>Layers</span>
        {LAYERS.map((l) => (
          <Toggle
            key={l.key}
            label={l.label}
            title={l.title}
            checked={layers[l.key]}
            onChange={() => toggleLayer(l.key)}
          />
        ))}
      </div>
    </div>
  );
}

const toSlider = (x) => Math.log10(x);
const fromSlider = (v) => Math.round(10 ** v);

/** Top-right: view preset and vertical exaggeration (always shown as a number). */
export function ViewAndExaggeration() {
  const { view, setView, exaggeration, setExaggeration } = useUiStore();
  return (
    <div className={`${s.overlay} ${s.topRight}`}>
      <div className={s.row}>
        <span className={s.overlayLabel}>View</span>
        <SegmentedControl label="View" options={VIEW_OPTIONS} value={view} onChange={setView} />
      </div>
      <label className={s.row}>
        <span className={s.overlayLabel}>Exaggeration</span>
        <span className={`mono ${s.exag}`}>×{exaggeration}</span>
        <input
          type="range"
          min={0}
          max={3}
          step={0.01}
          value={toSlider(exaggeration)}
          onChange={(e) => setExaggeration(fromSlider(Number(e.target.value)))}
          className={s.slider}
          aria-valuetext={`times ${exaggeration}`}
        />
      </label>
    </div>
  );
}
