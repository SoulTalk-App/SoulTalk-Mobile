/**
 * so-5zrq: ColdOpenContext — flips true once the LoadingScreen overlay
 * has fully faded out (inside the withTiming finish callback, via runOnJS
 * in Navigation/App.tsx). Screens that want to gate a cold-open entrance
 * animation on overlay dismissal subscribe here rather than on their own
 * mount, so the animation is actually visible to the user.
 */
import { createContext, useContext } from 'react';

export const ColdOpenContext = createContext(false);

/** Returns true once the cold-open overlay has finished fading out. */
export const useColdOpenRevealed = () => useContext(ColdOpenContext);
