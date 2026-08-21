// Entity lifecycle tests: id determinism, name generation, cloning, and
// constraint pruning.
//   node --test src/scene/__tests__/entity.test.js

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  newEntityId,
  reserveEntityIds,
  __resetEntityIds,
  nextEntityName,
  isShape3D,
  cloneEntity,
  pruneConstraints
} from '../entity.js';

test('newEntityId is deterministic from a reset counter', () => {
  __resetEntityIds();
  const first = [newEntityId(), newEntityId(), newEntityId()];
  __resetEntityIds();
  const second = [newEntityId(), newEntityId(), newEntityId()];
  assert.deepEqual(first, second, 'the same sequence must reproduce the same ids');
});

test('newEntityId never repeats within a run', () => {
  __resetEntityIds();
  const ids = new Set();
  for (let i = 0; i < 500; i++) ids.add(newEntityId('cube_'));
  assert.equal(ids.size, 500);
});

test('newEntityId applies the prefix', () => {
  __resetEntityIds();
  assert.ok(newEntityId('cube_').startsWith('cube_'));
});

test('reserveEntityIds prevents collisions with imported ids', () => {
  __resetEntityIds();
  // Simulate importing a scene whose ids came from a long prior session.
  reserveEntityIds(['cube_1', 'cube_z', 'sphere_2s']);
  const fresh = newEntityId('cube_');
  assert.ok(!['cube_1', 'cube_z', 'sphere_2s'].includes(fresh), `collided: ${fresh}`);
  // parseInt('2s', 36) = 100, the highest reserved, so the next is 101 -> '2t'.
  assert.equal(fresh, 'cube_2t');
});

test('reserveEntityIds ignores non-generated ids without throwing', () => {
  __resetEntityIds();
  assert.doesNotThrow(() => reserveEntityIds(['my-custom-name', null, undefined, 42, '']));
  assert.ok(newEntityId());
});

test('reserveEntityIds never lowers the counter', () => {
  __resetEntityIds();
  newEntityId(); newEntityId(); newEntityId();
  const after = reserveEntityIds(['a_1']);
  assert.equal(after, 3, 'a lower reserved id must not rewind the counter');
});

test('nextEntityName produces unique incrementing names', () => {
  const list = [];
  for (let i = 0; i < 3; i++) list.push({ type: 'cube', name: nextEntityName(list, 'cube') });
  assert.deepEqual(list.map((e) => e.name), ['Cube 1', 'Cube 2', 'Cube 3']);
});

test('nextEntityName titleizes multi-word types', () => {
  assert.equal(nextEntityName([], 'extruded_solid'), 'Extruded Solid 1');
});

test('nextEntityName skips past the highest existing number, not the count', () => {
  const list = [{ type: 'cube', name: 'Cube 7' }];
  assert.equal(nextEntityName(list, 'cube'), 'Cube 8');
});

test('isShape3D discriminates the two schemas', () => {
  assert.equal(isShape3D({ position: [0, 0, 0] }), true);
  assert.equal(isShape3D({ x: 0, y: 0 }), false);
  assert.equal(isShape3D(null), false);
});

test('cloneEntity gives a fresh id and does not alias the original', () => {
  __resetEntityIds();
  const original = { id: 'a', type: 'cube', name: 'Cube 1', position: [1, 2, 3], params: { width: 5 } };
  const clone = cloneEntity(original, [original]);
  assert.notEqual(clone.id, original.id);
  clone.params.width = 99;
  assert.equal(original.params.width, 5, 'the clone must be a deep copy');
});

test('cloneEntity offsets a 3D shape', () => {
  const original = { id: 'a', type: 'cube', position: [1, 2, 3] };
  const clone = cloneEntity(original, [original]);
  assert.notDeepEqual(clone.position, original.position);
});

test('cloneEntity offsets a 2D draft', () => {
  const original = { id: 'a', type: 'rect', x: 10, y: 20, width: 5, height: 5 };
  const clone = cloneEntity(original, [original]);
  assert.notEqual(clone.x, original.x);
});

test('pruneConstraints removes constraints touching a deleted body', () => {
  const constraints = [
    { id: 'c1', targetA: 'a', targetB: 'b' },
    { id: 'c2', bodyA: 'b', bodyB: 'c' },
    { id: 'c3', bodyAId: 'c', bodyBId: 'd' }
  ];
  const kept = pruneConstraints(constraints, new Set(['b']));
  assert.deepEqual(kept.map((c) => c.id), ['c3']);
});

test('pruneConstraints never mutates its input', () => {
  const constraints = [{ id: 'c1', targetA: 'a', targetB: 'b' }];
  const before = JSON.stringify(constraints);
  pruneConstraints(constraints, new Set(['a']));
  assert.equal(JSON.stringify(constraints), before);
});

test('pruneConstraints keeps everything when nothing is deleted', () => {
  const constraints = [{ id: 'c1', targetA: 'a', targetB: 'b' }];
  assert.equal(pruneConstraints(constraints, new Set()).length, 1);
});
