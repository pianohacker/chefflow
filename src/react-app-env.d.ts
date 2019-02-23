/// <reference types="react-scripts" />

// Type definitions for remark-parse v4.0.0
// Project: https://github.com/wooorm/remark/tree/master/packages/remark-parse
// Definitions by: 3846masa <https://github.com/3846masa>
// Definitions:

declare module 'remark-parse' {
  import * as Unist from 'unist';
  import * as unified from 'unified';

  namespace RemarkParse {
    interface Add {
      (node: Unist.Node, parent?: Unist.Node): Unist.Node;
      test(): Unist.Point;
      reset(node: Unist.Node, parent?: Unist.Node): Unist.Node;
    }

    interface Eat {
      (subvalue: string): RemarkParse.Add;
      now(): Unist.Point;
    }

    interface Locator {
      (value: string, fromIndex: number): number;
    }

    interface Tokenizer {
      (
        this: RemarkParse.ParserInstance,
        eat: RemarkParse.Eat,
        value: string,
        silent?: boolean
      ): Unist.Node | boolean | undefined;
      locator?: Locator;
      onlyAtStart?: boolean;
      notInBlock?: boolean;
      notInList?: boolean;
      notInLink?: boolean;
    }

    interface ParserInstance {
      tokenizeBlock(
        this: RemarkParse.ParserInstance,
        subvalue: string,
        now: Unist.Point
      ): Unist.Node[];
      tokenizeInline(
        this: RemarkParse.ParserInstance,
        subvalue: string,
        now: Unist.Point
      ): Unist.Node[];
      blockTokenizers: { [key: string]: Tokenizer };
      blockMethods: string[];
      inlineTokenizers: { [key: string]: Tokenizer };
      inlineMethods: string[];
    }

    interface Parser {
      prototype: {
        tokenizeBlock(
          this: RemarkParse.ParserInstance,
          subvalue: string,
          now: Unist.Point
        ): Unist.Node[];
        tokenizeInline(
          this: RemarkParse.ParserInstance,
          subvalue: string,
          now: Unist.Point
        ): Unist.Node[];
        blockTokenizers: { [key: string]: Tokenizer };
        blockMethods: string[];
        inlineTokenizers: { [key: string]: Tokenizer };
        inlineMethods: string[];
      };
    }
  }

  interface RemarkParse {
    (this: unified.Processor, options?: unknown): unified.Transformer;
    Parser: RemarkParse.Parser;
  }

  var RemarkParse: RemarkParse;
  export = RemarkParse;
}
