import type { Unit } from './types';

export interface Placed<T extends Unit = Unit> { unit: T; x: number; y: number; w: number; h: number }
export interface ZoneBox { zone: string; x: number; y: number; w: number; h: number }
export interface MapLayout<T extends Unit = Unit> { placed: Placed<T>[]; zones: ZoneBox[]; width: number; height: number }

const MAX_ROW = 32;      // أقصى عرض للصف بالمتر
const CORRIDOR = 2.2;    // ممر بين الصفوف المتقابلة
const BACK_GAP = 0.25;   // فاصل خلفي بين صفّين متلاصقين
const ZONE_GAP = 3.2;    // مسافة بين المناطق (تتسع لاسم المنطقة)
const DOOR_GAP = 0.12;

const byCode = (a: Unit, b: Unit) => a.code.localeCompare(b.code, 'en', { numeric: true });

/**
 * إذا كانت كل الوحدات تملك x و y من Creator نرسمها كما هي (مخطط حقيقي).
 * وإلا نرتّبها تلقائياً: منطقة تحت منطقة، صفوف متقابلة بينها ممرات.
 */
export function layoutUnits<T extends Unit>(units: T[]): MapLayout<T> {
  if (units.length && units.every((u) => u.x != null && u.y != null)) {
    const placed = units.map((u) => ({ unit: u, x: u.x!, y: u.y!, w: u.widthM, h: u.depthM }));
    const zones = [...new Set(units.map((u) => u.zone))].map((zone) => {
      const p = placed.filter((q) => q.unit.zone === zone);
      const x = Math.min(...p.map((q) => q.x)), y = Math.min(...p.map((q) => q.y));
      return { zone, x, y, w: Math.max(...p.map((q) => q.x + q.w)) - x, h: Math.max(...p.map((q) => q.y + q.h)) - y };
    });
    return {
      placed, zones,
      width: Math.max(...placed.map((q) => q.x + q.w)) + 1,
      height: Math.max(...placed.map((q) => q.y + q.h)) + 1,
    };
  }

  const zonesNames = [...new Set(units.map((u) => u.zone))].sort((a, b) => a.localeCompare(b, 'ar'));
  const placed: Placed<T>[] = [];
  const zones: ZoneBox[] = [];
  let y = ZONE_GAP - 1;
  let width = 0;
  for (const zone of zonesNames) {
    const list = units.filter((u) => u.zone === zone).sort(byCode);
    // عدد الوحدات في الصف بحيث تتوزع الصفوف بالتساوي وتكون زوجية (صفّان لكل ممر)
    const maxW = Math.max(...list.map((u) => u.widthM)) + DOOR_GAP;
    const perRowMax = Math.max(1, Math.floor(MAX_ROW / maxW));
    let rowCount = Math.ceil(list.length / perRowMax);
    if (list.length > 3 && rowCount % 2 === 1) rowCount++;
    const per = Math.ceil(list.length / rowCount);
    const rows: T[][] = [];
    for (let i = 0; i < list.length; i += per) rows.push(list.slice(i, i + per));
    const zy = y;
    rows.forEach((row, i) => {
      const depth = Math.max(...row.map((u) => u.depthM));
      let x = 0.5;
      for (const u of row) {
        placed.push({ unit: u, x, y, w: u.widthM, h: u.depthM });
        x += u.widthM + DOOR_GAP;
      }
      width = Math.max(width, x + 0.5);
      y += depth + (i === rows.length - 1 ? 0 : i % 2 === 0 ? CORRIDOR : BACK_GAP);
    });
    zones.push({ zone, x: 0, y: zy, w: 0, h: y - zy });
    y += ZONE_GAP;
  }
  for (const z of zones) z.w = width;
  return { placed, zones, width, height: y - ZONE_GAP + 1 };
}
