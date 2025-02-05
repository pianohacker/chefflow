import { ExternalTokenizer } from "@lezer/lr";
import { multiWordName as multiWordNameToken, unit as unitToken } from "./chefflow.grammar.terms";
import { knownUnits } from "../units";

const COMMA = 44;
const COLON = 58;
const AT = 64;
const ENDS = [-1, 10, COMMA, COLON, AT];
const SPACE = [9, 11, 12, 13, 32, 133, 160];

export const multiWordName = new ExternalTokenizer((input) => {
  let { next } = input;

  if (next == -1 || SPACE.includes(next) || ENDS.includes(next)) return;

  let text = "";

  let numEndingSpaces = 0;
  let lastWordEnd = input.pos;
  while (!ENDS.includes(next)) {
    if (text) text += " ";
    while (!ENDS.includes(next) && !SPACE.includes(next)) {
      text += String.fromCharCode(next);
      input.advance();
      next = input.next;
      lastWordEnd = input.pos;
    }

    numEndingSpaces = 0;
    while (!ENDS.includes(next) && SPACE.includes(next)) {
      input.advance();
      next = input.next;
      numEndingSpaces++;
    }

    if (knownUnits.has(text)) {
      input.acceptToken(unitToken, -numEndingSpaces);
      return;
    }
  }

  input.acceptToken(multiWordNameToken, -numEndingSpaces);
});
