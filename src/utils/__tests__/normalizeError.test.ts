/**
 * so-n30r: normalizeError contract pins.
 *
 * Primary concern: gateway/proxy bodies (nginx 502/503/504 HTML) must
 * NEVER reach the user as error copy. Secondary: 5xx bodies from
 * FastAPI (JSON {detail}) are also suppressed — server errors always
 * surface as FIVE_XX_FALLBACK. 4xx user-safe detail is preserved.
 */

import normalizeError from '../normalizeError';

const FIVE_XX = 'Something went wrong on our end. Please try again.';
const NETWORK = 'Connection problem. Check your internet and try again.';
const DEFAULT = 'Something went wrong. Please try again.';

/** Build a minimal axios-like error with a response body. */
function axiosErr(status: number, data: unknown, message?: string) {
  return { response: { status, data }, message: message ?? `Request failed with status code ${status}` };
}

/** Build an axios-like network error (no response). */
function networkErr(message = 'Network Error') {
  return { message, code: 'ERR_NETWORK' };
}

// ── 5xx — gateway / server errors ───────────────────────────────────────────

describe('5xx errors always return FIVE_XX_FALLBACK', () => {
  it('502 with HTML nginx body', () => {
    const err = axiosErr(502, '<html><body>502 Bad Gateway</body></html>');
    expect(normalizeError(err)).toBe(FIVE_XX);
  });

  it('503 with plaintext body', () => {
    const err = axiosErr(503, 'Service Unavailable');
    expect(normalizeError(err)).toBe(FIVE_XX);
  });

  it('504 with HTML body', () => {
    const err = axiosErr(504, '<!doctype html><html>Gateway Timeout</html>');
    expect(normalizeError(err)).toBe(FIVE_XX);
  });

  it('500 with JSON detail — server body is NOT shown to users', () => {
    const err = axiosErr(500, { detail: 'Internal server error details' });
    expect(normalizeError(err)).toBe(FIVE_XX);
  });

  it('500 with no body', () => {
    const err = axiosErr(500, null);
    expect(normalizeError(err)).toBe(FIVE_XX);
  });
});

// ── 4xx — user-safe BE detail preserved ──────────────────────────────────────

describe('4xx errors surface user-safe BE detail', () => {
  it('400 with string detail returns detail', () => {
    const err = axiosErr(400, { detail: 'Bad thing happened' });
    expect(normalizeError(err)).toBe('Bad thing happened');
  });

  it('422 with Pydantic array detail joins messages', () => {
    const err = axiosErr(422, {
      detail: [
        { msg: 'field required', loc: ['body', 'email'], type: 'missing' },
        { msg: 'invalid value', loc: ['body', 'age'], type: 'value_error' },
      ],
    });
    expect(normalizeError(err)).toBe('field required; invalid value');
  });

  it('409 with string detail returns detail', () => {
    const err = axiosErr(409, { detail: 'Already exists' });
    expect(normalizeError(err)).toBe('Already exists');
  });
});

// ── Status-copy for known codes ───────────────────────────────────────────────

describe('STATUS_COPY for known status codes', () => {
  it('401', () => {
    const err = axiosErr(401, null);
    expect(normalizeError(err)).toBe('Your session has expired. Please log in again.');
  });

  it('403', () => {
    const err = axiosErr(403, null);
    expect(normalizeError(err)).toBe("You don't have permission to do that.");
  });

  it('404', () => {
    const err = axiosErr(404, null);
    expect(normalizeError(err)).toBe("We couldn't find that.");
  });

  it('409 with no detail falls back to STATUS_COPY', () => {
    const err = axiosErr(409, null);
    expect(normalizeError(err)).toBe('That action is no longer valid — please refresh.');
  });

  it('429', () => {
    const err = axiosErr(429, null);
    expect(normalizeError(err)).toBe("You're doing that a bit too fast. Please wait a moment.");
  });
});

// ── Network / no-response errors ─────────────────────────────────────────────

describe('network / no-response errors return NETWORK_FALLBACK', () => {
  it('no response at all (network drop)', () => {
    expect(normalizeError(networkErr())).toBe(NETWORK);
  });

  it('ECONNABORTED code', () => {
    expect(normalizeError({ message: 'timeout', code: 'ECONNABORTED' })).toBe(NETWORK);
  });

  it('timeout message', () => {
    expect(normalizeError({ message: 'timeout of 10000ms exceeded', code: undefined })).toBe(NETWORK);
  });
});

// ── Raw axios string interception ────────────────────────────────────────────

describe('raw axios string messages are suppressed', () => {
  it('"Request failed with status code 502" string → DEFAULT', () => {
    expect(normalizeError('Request failed with status code 502')).toBe(DEFAULT);
  });

  it('"Request failed with status code 503" string → DEFAULT', () => {
    expect(normalizeError('Request failed with status code 503')).toBe(DEFAULT);
  });
});

// ── extractDetail HTML / length hardening ────────────────────────────────────

describe('extractDetail HTML / length guards (defense-in-depth)', () => {
  it('4xx response with HTML body is rejected → 4xx fallback', () => {
    // In practice FastAPI never returns HTML on 4xx; this tests the guard.
    const err = axiosErr(400, '<html>Something</html>');
    expect(normalizeError(err)).toBe(DEFAULT);
  });

  it('data string longer than 200 chars is rejected', () => {
    const longStr = 'x'.repeat(201);
    const err = axiosErr(400, longStr);
    expect(normalizeError(err)).toBe(DEFAULT);
  });

  it('data string of exactly 200 chars is accepted', () => {
    const okStr = 'a'.repeat(200);
    const err = axiosErr(400, okStr);
    expect(normalizeError(err)).toBe(okStr);
  });
});
