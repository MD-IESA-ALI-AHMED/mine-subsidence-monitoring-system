import { AlertFeed } from '../alerts/AlertFeed.jsx';
import { ZoneList } from '../zones/ZoneList.jsx';
import s from './Rail.module.css';

export function LeftRail() {
  return (
    <div className={s.rail}>
      <ZoneList />
      <AlertFeed />
    </div>
  );
}
