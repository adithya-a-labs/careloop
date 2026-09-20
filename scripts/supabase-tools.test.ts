import assert from 'node:assert/strict';
import test from 'node:test';

import { parseEnvText, projectRefFromUrl, redactSecrets } from './supabase-tools.js';

test('parses blank and quoted environment values without treating comments as data', () => {
  assert.deepEqual(
    parseEnvText(`
# CareLoop
SUPABASE_URL="https://example.supabase.co"
SUPABASE_SECRET_KEY=
NAME='Amma'
`),
    {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SECRET_KEY: '',
      NAME: 'Amma',
    },
  );
});

test('derives hosted project refs but not local project refs', () => {
  assert.equal(
    projectRefFromUrl('https://abcdefghijklmnopqrst.supabase.co'),
    'abcdefghijklmnopqrst',
  );
  assert.equal(projectRefFromUrl('http://127.0.0.1:54321'), undefined);
});

test('redacts every configured secret from failures', () => {
  assert.equal(
    redactSecrets('key=secret password=hunter2', ['secret', 'hunter2']),
    'key=[redacted] password=[redacted]',
  );
});
