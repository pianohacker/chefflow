export function range(start: number, stop?: number, step: number = 1) {
  if (stop == null) {
    stop = start;
    start = 0;
  }

  return [...Array(stop - start).keys()].map((i) => start + i * step);
}
