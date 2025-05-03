import { ExternalTokenizer } from "@lezer/lr";
import {
  gridMultiWordName as gridMultiWordNameToken,
  multiWordName as multiWordNameToken,
  unit as unitToken,
} from "./chefflow.grammar.terms";
import { knownUnits } from "../units";

const OPEN_PAREN = 40;
const COMMA = 44;
const COLON = 58;
const AT = 64;
const ENDS = [-1, 10, COMMA, COLON, AT];
const SPACE = [9, 11, 12, 13, 32, 133, 160];

export const baseMultiWordName = (token: number, ends: number[]) =>
  new ExternalTokenizer((input) => {
    let { next } = input;

    if (next == -1 || SPACE.includes(next) || ends.includes(next)) return;

    let text = "";

    let numEndingSpaces = 0;
    while (!ends.includes(next)) {
      if (text) text += " ";
      while (!ends.includes(next) && !SPACE.includes(next)) {
        text += String.fromCharCode(next);
        input.advance();
        next = input.next;
      }

      numEndingSpaces = 0;
      while (!ends.includes(next) && SPACE.includes(next)) {
        input.advance();
        next = input.next;
        numEndingSpaces++;
      }

      if (knownUnits.has(text)) {
        input.acceptToken(unitToken, -numEndingSpaces);
        return;
      }
    }

    input.acceptToken(token, -numEndingSpaces);
  });

export const multiWordName = baseMultiWordName(multiWordNameToken, ENDS);
export const gridMultiWordName = baseMultiWordName(gridMultiWordNameToken, ENDS.concat(OPEN_PAREN));
