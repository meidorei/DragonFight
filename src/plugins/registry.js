import {secondWind} from './second-wind.js';
/** SkillPlugin hooks receive a restricted context, never the mutable world object.
 * start(ctx, params), update(ctx, params), hit(ctx, params), end(ctx, params).
 * Registration is explicit; JSON cannot choose arbitrary JS URLs.
 */
export const skillPlugins = Object.freeze({'second-wind':secondWind});
