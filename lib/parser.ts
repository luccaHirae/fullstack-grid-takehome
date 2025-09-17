import { FormulaAst, CellAddress, toCellAddress } from '@/types';

// Token types for lexer
export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'CELL_REF'
  | 'RANGE'
  | 'FUNCTION'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'COLON'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

// Tokenizer/Lexer
export class Lexer {
  private input: string;
  private pos: number = 0;
  private cached: Token | null = null;

  constructor(input: string) {
    this.input = input;
  }

  nextToken(): Token {
    if (this.cached) {
      const t = this.cached;
      this.cached = null;
      return t;
    }
    const s = this.input;
    const len = s.length;
    // Skip whitespace
    while (this.pos < len && /\s/.test(s[this.pos]!)) this.pos++;
    if (this.pos >= len) return { type: 'EOF', value: '', pos: this.pos };
    const start = this.pos;
    const ch = s[this.pos]!;

    // Single char tokens
    if (ch === '(') {
      this.pos++;
      return { type: 'LPAREN', value: '(', pos: start };
    }
    if (ch === ')') {
      this.pos++;
      return { type: 'RPAREN', value: ')', pos: start };
    }
    if (ch === ',') {
      this.pos++;
      return { type: 'COMMA', value: ',', pos: start };
    }
    if (ch === ':') {
      this.pos++;
      return { type: 'COLON', value: ':', pos: start };
    }

    // String literal (double quotes)
    if (ch === '"') {
      this.pos++; // consume opening
      let value = '';
      while (this.pos < len) {
        const c = s[this.pos]!;
        if (c === '"') {
          this.pos++;
          break;
        }
        // simple escape for double quotes "
        if (c === '\\' && s[this.pos + 1] === '"') {
          value += '"';
          this.pos += 2;
          continue;
        }
        value += c;
        this.pos++;
      }
      return { type: 'STRING', value, pos: start };
    }

    // Number (integer or decimal)
    if (
      /^[0-9]$/.test(ch) ||
      (ch === '.' && /[0-9]/.test(s[this.pos + 1] || ''))
    ) {
      let num = '';
      let dotSeen = false;
      while (this.pos < len) {
        const c = s[this.pos]!;
        if (c === '.') {
          if (dotSeen) break;
          dotSeen = true;
          num += c;
          this.pos++;
        } else if (/[0-9]/.test(c)) {
          num += c;
          this.pos++;
        } else {
          break;
        }
      }
      return { type: 'NUMBER', value: num, pos: start };
    }

    // Operator (multi-char first)
    const two = s.substring(this.pos, this.pos + 2);
    if (['<=', '>=', '<>'].includes(two)) {
      this.pos += 2;
      return { type: 'OPERATOR', value: two, pos: start };
    }
    if ('+-*/^<>= '.includes(ch)) {
      this.pos++;
      if (ch === ' ') return this.nextToken();
      return { type: 'OPERATOR', value: ch, pos: start };
    }

    // Identifiers: function names, booleans, cell refs (with optional $)
    if (ch === '$' || /[A-Za-z_]/.test(ch)) {
      let ident = '';
      while (this.pos < len) {
        const c = s[this.pos]!;
        if (/[A-Za-z0-9_$]/.test(c)) {
          ident += c;
          this.pos++;
        } else {
          break;
        }
      }
      // Check if looks like a cell ref pattern possibly with $ markers followed by letters then optional $ then digits
      if (/^(\$)?[A-Za-z]+(\$)?[0-9]+$/.test(ident)) {
        return { type: 'CELL_REF', value: ident.toUpperCase(), pos: start };
      }
      const upper = ident.toUpperCase();
      if (upper === 'TRUE' || upper === 'FALSE') {
        return { type: 'BOOLEAN', value: upper, pos: start } as any; // boolean token (map later)
      }
      // Treat as function/identifier
      return { type: 'FUNCTION', value: upper, pos: start };
    }

    throw new Error(`Unexpected character '${ch}' at ${this.pos}`);
  }

  peek(): Token {
    if (!this.cached) this.cached = this.nextToken();
    return this.cached;
  }
}

// Parser (Pratt parser or Shunting-yard recommended)
export class Parser {
  private lexer: Lexer;
  private current: Token; // may be EOF

  constructor(input: string) {
    this.lexer = new Lexer(input);
    this.current = this.lexer.nextToken();
  }

  parse(): FormulaAst {
    const isEmpty = this.current.type === 'EOF';
    if (isEmpty) {
      return { type: 'number', value: 0 }; // empty formula fallback
    }
    const expr = this.parseExpression();
    // After expression consume any trailing whitespace tokens already handled; ensure EOF
    if (this.current.type !== 'EOF') {
      throw new Error('Unexpected trailing input');
    }
    return expr;
  }

  private parseExpression(minPrecedence: number = 0): FormulaAst {
    let left = this.parsePrimary();
    while (this.current.type === 'OPERATOR') {
      const op = this.current.value;
      const prec = PRECEDENCE[op];
      if (prec === undefined || prec < minPrecedence) break;
      this.advance();
      // Right associative for ^ only
      const nextMin = op === '^' ? prec : prec + 1;
      const right = this.parseExpression(nextMin);
      left = { type: 'binary', op: op as any, left, right };
    }
    return left;
  }

  private parsePrimary(): FormulaAst {
    const tok = this.current;
    switch (tok.type) {
      case 'NUMBER': {
        this.advance();
        return { type: 'number', value: parseFloat(tok.value) };
      }
      case 'STRING': {
        this.advance();
        return { type: 'string', value: tok.value };
      }
      case 'FUNCTION': {
        const name = tok.value;
        this.advance();
        if (this.current.type === 'LPAREN') return this.parseFunction(name);
        // Treat bare identifier without () as error for now
        throw new Error(`Unexpected identifier ${name}`);
      }
      case 'BOOLEAN': {
        const val = tok.value.toUpperCase() === 'TRUE';
        this.advance();
        return { type: 'boolean', value: val };
      }
      case 'CELL_REF': {
        // Might be range start
        const first = tok.value;
        this.advance();
        if (this.current.type === 'COLON') {
          this.advance();
          const afterColon = this.current; // capture to avoid overly narrow type
          if (afterColon.type !== 'CELL_REF')
            throw new Error('Range end must be cell reference');
          const second = afterColon.value;
          this.advance();
          return { type: 'range', start: first as any, end: second as any };
        }
        // Parse absolute markers
        const m = first.match(/^(\$)?([A-Z]+)(\$)?(\d+)$/)!;
        const [, colAbs, _letters, rowAbs, _digits] = m;
        return {
          type: 'ref',
          address: first as any,
          absolute: { col: !!colAbs, row: !!rowAbs },
        };
      }
      case 'LPAREN': {
        this.advance();
        const inner = this.parseExpression();
        if (this.current.type !== 'RPAREN') throw new Error('Missing )');
        this.advance();
        return inner;
      }
      case 'OPERATOR': {
        if (tok.value === '-') {
          // unary minus
          this.advance();
          const operand = this.parsePrimary();
          return { type: 'unary', op: '-', operand };
        }
        throw new Error(`Unexpected operator ${tok.value}`);
      }
      default:
        throw new Error(`Unexpected token ${tok.type}`);
    }
  }

  private parseFunction(name: string): FormulaAst {
    this.expect('LPAREN');
    const args: FormulaAst[] = [];
    if (this.current.type !== 'RPAREN') {
      while (true) {
        args.push(this.parseExpression());
        if (this.current.type === 'COMMA') {
          this.advance();
          continue;
        }
        break;
      }
    }
    this.expect('RPAREN');
    return { type: 'function', name, args };
  }

  private advance(): void {
    this.current = this.lexer.nextToken();
  }

  private expect(type: TokenType): void {
    if (this.current.type !== type) {
      throw new Error(`Expected ${type} but got ${this.current.type}`);
    }
    this.advance();
  }
}

// Operator precedence table
export const PRECEDENCE: Record<string, number> = {
  '=': 1,
  '<>': 1,
  '<': 2,
  '<=': 2,
  '>': 2,
  '>=': 2,
  '+': 3,
  '-': 3,
  '*': 4,
  '/': 4,
  '^': 5,
};

// Helper to parse a formula string
export function parseFormula(input: string): FormulaAst {
  const parser = new Parser(input);
  return parser.parse();
}
