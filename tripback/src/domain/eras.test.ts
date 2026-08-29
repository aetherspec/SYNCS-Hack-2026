import { describe, expect, it } from 'vitest';

import { extractSignificantEraEvents } from './eras';

describe('extractSignificantEraEvents', () => {
  it('combines a construction range and excludes a later heritage listing', () => {
    const events = extractSignificantEraEvents(
      'It was designed by E. Henderson and built from 1927 to 1928 by H. W. Thompson Ltd. It was added to the New South Wales State Heritage Register on 2 April 1999.',
    );

    expect(events).toEqual([
      {
        year: '1928',
        title: 'Built 1927–1928',
        detail:
          'It was designed by E. Henderson and built from 1927 to 1928 by H. W. Thompson Ltd.',
      },
    ]);
  });

  it('keeps distinct event-backed dates', () => {
    const events = extractSignificantEraEvents(
      'The theatre opened in 1892. It was rebuilt after a fire in 1931.',
    );
    expect(events.map((event) => event.year)).toEqual(['1892', '1931']);
  });
});
