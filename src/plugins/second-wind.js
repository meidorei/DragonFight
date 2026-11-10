/** Example extension: heal on activation and emit a cosmetic ring on hit. */
export const secondWind = {
  start(ctx){ctx.heal(65);ctx.visual('heal');},
  hit(ctx){ctx.visual('spark');},
  end(){},
};
