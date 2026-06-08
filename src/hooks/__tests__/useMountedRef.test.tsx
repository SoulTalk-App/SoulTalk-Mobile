import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useMountedRef } from '../useMountedRef';

// so-pw5d: minimal contract test for the mountedRef primitive. The hook
// must (a) start true once effects run, (b) flip to false on unmount.
// That's the entire surface area; consumers (rn_features) own correctness
// of the call-site guard.

describe('useMountedRef', () => {
  it('reports mounted=true while the component is mounted', () => {
    let observedRef: { current: boolean } | null = null;

    const Probe: React.FC = () => {
      observedRef = useMountedRef();
      return null;
    };

    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(<Probe />);
    });

    expect(observedRef).not.toBeNull();
    expect(observedRef!.current).toBe(true);

    act(() => {
      renderer!.unmount();
    });
  });

  it('flips mountedRef.current to false on unmount, and the ref stays readable after', () => {
    let observedRef: { current: boolean } | null = null;

    const Probe: React.FC = () => {
      observedRef = useMountedRef();
      return null;
    };

    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(<Probe />);
    });

    expect(observedRef!.current).toBe(true);

    act(() => {
      renderer!.unmount();
    });

    // After unmount the cleanup runs synchronously; a deferred async
    // continuation that captured the ref earlier should see false here.
    expect(observedRef!.current).toBe(false);
  });

  it('returns a stable ref object across renders', () => {
    const seenRefs: Array<{ current: boolean }> = [];

    const Probe: React.FC<{ tick: number }> = () => {
      seenRefs.push(useMountedRef());
      return null;
    };

    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(<Probe tick={0} />);
    });
    act(() => {
      renderer!.update(<Probe tick={1} />);
    });
    act(() => {
      renderer!.update(<Probe tick={2} />);
    });

    expect(seenRefs.length).toBe(3);
    expect(seenRefs[1]).toBe(seenRefs[0]);
    expect(seenRefs[2]).toBe(seenRefs[0]);

    act(() => {
      renderer!.unmount();
    });
  });
});
