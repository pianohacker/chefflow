import { getMeasureKind, MeasureKind } from "convert";

type UnitKind = MeasureKind.Mass | MeasureKind.Volume;
export const MassUnitKind = getMeasureKind("g");
export const VolumeUnitKind = getMeasureKind("mL");

type UnitMap = Record<string, [UnitKind, string]>;

function makeUnitMap(kind: UnitKind, input: string): UnitMap {
  const map = Object.fromEntries(
    input
      .split("\n")
      .filter((l) => !!l.trim())
      .map((line): [string, [UnitKind, string]] => {
        const [from, to] = line.split(/\s*:\s*/, 2);

        return [from.trim(), [kind, to.trim()]];
      }),
  );

  return {
    ...map,
    ...Object.fromEntries(Object.values(map).map(([kind, to]) => [to, [kind, to]])),
  };
}

export const unitMap = {
  ...makeUnitMap(
    MassUnitKind,
    `
    milligram: mg
    milligrams: mg
    gram: g
    grams: g
    kilogram: kg
    kilograms: kg
    ounce: oz
    ounces: oz
    pound: lb
    pounds: lb
    `,
  ),
  ...makeUnitMap(
    VolumeUnitKind,
    `
    ml: mL
    milliliter: mL
    milliliters: mL
    liter: L
    liters: L
    litre: L
    litres: L
    fluid ounce: fl oz
    fluid ounces: fl oz
    teaspoon: tsp
    teaspoons: tsp
    tbsp: Tbsp
    tablespoon: Tbsp
    tablespoons: Tbsp
    cups: cup
    pts: pt
    pint: pt
    pints: pt
    qts: qt
    quart: qt
    quarts: qt
    gals: gal
    gallon: gal
    gallons: gal
    `,
  ),
};

export const knownUnits = new Set(Object.keys(unitMap));
export const canonUnits = Object.values(unitMap).map(([, to]) => to);
