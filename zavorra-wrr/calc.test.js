// Verifica dei valori rispetto alle tabelle OBO: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute, windTable, frameFit } from './calc.js';

const base = (devs, extra = {}) => ({ frame: 'F1500', pitch: 30, wind: 120, calcMode: 'obo', devs, ...extra });
const SG125 = [{ d: 'Inverter', w: 1020, h: 795, kg: 95, q: 1 }];
const ZCS80 = [{ d: 'Inverter', w: 687, h: 561, kg: 50, q: 1 }];
const ZCS100 = [{ d: 'Inverter', w: 970, h: 695, kg: 75, q: 1 }];

test('SG125CX-P2 su F1500, 30°, metodo OBO: tabella vento', () => {
  const kg = windTable(base(SG125)).map((r) => r.ballast);
  assert.deepEqual(kg, [0, 9, 50, 96, 146, 200, 259, 322, 390, 461]);
});

test('ZCS 80KTL su F1000 e ZCS 100KTL su F1500 a 120 km/h', () => {
  assert.equal(Math.ceil(compute(base(ZCS80, { frame: 'F1000' })).total), 78);
  assert.equal(Math.ceil(compute(base(ZCS100)).total), 166);
});

test('Bifacciale: zavorra divisa per 2', () => {
  const r = compute(base([{ w: 640, h: 530, kg: 49, q: 1, side: 'A' }, { w: 640, h: 530, kg: 49, q: 1, side: 'B' }], { frame: 'D1500', pitch: 45, wind: 140 }));
  assert.equal(r.table, 297);
  assert.equal(r.total, 199);
  assert.equal(r.perSide, 99.5);
});

test('Controllo telaio', () => {
  assert.equal(frameFit(compute(base(ZCS100, { frame: 'F1000' }))).level, 'warn');
  assert.equal(frameFit(compute(base(ZCS80))).switchTo, 'F1000');
  const big = compute(base([{ w: 1700, h: 600, kg: 80, q: 1 }]));
  assert.equal(big.errCode, 'width');
  assert.equal(frameFit(big).level, 'crit');
});
