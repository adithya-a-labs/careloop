import { beforeEach, expect, it } from 'vitest';
import { invalidateReads, readCache, reconcileReadCache } from './read-cache';

beforeEach(() => readCache.clear());

it('reconciles duplicate updates and deletes by ID without crossing circle boundaries', () => {
  const key = 'rahul:/api/v1/circles/family/tasks?limit=50';
  const other = 'rahul:/api/v1/circles/other/tasks?limit=50';
  readCache.set(key, { value: [{ id: 'task', status: 'pending' }], storedAt: 100 });
  readCache.set(other, { value: [{ id: 'task', status: 'pending' }], storedAt: 100 });
  reconcileReadCache('family', 'tasks', { id: 'task', status: 'completed' });
  reconcileReadCache('family', 'tasks', { id: 'task', status: 'completed' });
  expect(readCache.get(key)?.value).toEqual([{ id: 'task', status: 'completed' }]);
  expect(readCache.get(other)?.storedAt).toBe(100);
  reconcileReadCache('family', 'tasks', { id: 'task' }, true);
  expect(readCache.get(key)?.value).toEqual([]);
});

it('keeps stale values visible but never inserts another viewer’s private record', () => {
  const key = 'anu:/api/v1/circles/family/memories?limit=50';
  readCache.set(key, { value: [], storedAt: 100 });
  reconcileReadCache('family', 'memories', { id: 'private-memory' });
  expect(readCache.get(key)?.value).toEqual([]);
  invalidateReads('family');
  expect(readCache.get(key)?.storedAt).toBe(0);
});
