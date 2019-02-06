/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* Based on @sergeche's work in his emmet plugin */

import { TextDocument, Position, Range } from 'vscode-languageserver-protocol'

export function comparePosition(position: Position, other: Position): number {
  if (position.line > other.line) return 1
  if (other.line == position.line && position.character > other.character) return 1
  if (other.line == position.line && position.character == other.character) return 0
  return -1
}

/**
 * A stream reader for VSCode's `TextDocument`
 * Based on @emmetio/stream-reader and @emmetio/atom-plugin
 */
export class DocumentStreamReader {
  private document: TextDocument
  private start: Position
  private _eof: Position
  private _sof: Position
  public pos: Position
  private _eol: string

  constructor(document: TextDocument, pos?: Position, limit?: Range) {

    this.document = document
    this.start = this.pos = pos ? pos : Position.create(0, 0)
    this._sof = limit ? limit.start : Position.create(0, 0)
    this._eof = limit ? limit.end : Position.create(document.lineCount - 1, this._lineLength(this.document.lineCount - 1))
    this._eol = `\n`
  }

	/**
	 * Returns true only if the stream is at the start of the file.
	 */
  sof(): boolean {
    return comparePosition(this.pos, this._sof) <= 0
  }

	/**
	 * Returns true only if the stream is at the end of the file.
	 */
  eof(): boolean {
    return comparePosition(this.pos, this._eof) >= 0
  }

	/**
	 * Creates a new stream instance which is limited to given range for given document
	 */
  limit(start: Position, end: Position): DocumentStreamReader {
    return new DocumentStreamReader(this.document, start, Range.create(start, end))
  }

	/**
	 * Returns the next character code in the stream without advancing it.
	 * Will return NaN at the end of the file.
	 */
  peek(): number {
    if (this.eof()) {
      return NaN
    }
    const line = this.getline(this.pos.line)
    return this.pos.character < line.length ? line.charCodeAt(this.pos.character) : this._eol.charCodeAt(0)
  }

  getline(line: number): string {
    let content = this.document.getText()
    let lines = content.split('\n')
    return lines[line] || ''
  }

	/**
	 * Returns the next character in the stream and advances it.
	 * Also returns NaN when no more characters are available.
	 */
  next(): number {
    if (this.eof()) {
      return NaN
    }
    const line = this.getline(this.pos.line)
    let code: number
    if (this.pos.character < line.length) {
      code = line.charCodeAt(this.pos.character)
      this.pos = Position.create(this.pos.line, this.pos.character + 1)
    } else {
      code = this._eol.charCodeAt(this.pos.character - line.length)
      this.pos = Position.create(this.pos.line + 1, this.pos.character)
    }

    if (this.eof()) {
      // restrict pos to eof, if in case it got moved beyond eof
      this.pos = Position.create(this._eof.line, this._eof.character)
    }

    return code
  }

	/**
	 * Backs up the stream n characters. Backing it up further than the
	 * start of the current token will cause things to break, so be careful.
	 */
  backUp(n: number) {
    let row = this.pos.line
    let column = this.pos.character
    column -= (n || 1)

    while (row >= 0 && column < 0) {
      row--
      column += this._lineLength(row)
    }

    this.pos = row < 0 || column < 0
      ? Position.create(0, 0)
      : Position.create(row, column)

    return this.peek()
  }

	/**
	 * Get the string between the start of the current token and the
	 * current stream position.
	 */
  current(): string {
    return this.substring(this.start, this.pos)
  }

	/**
	 * Returns contents for given range
	 */
  substring(from: Position, to: Position): string {
    return this.document.getText(Range.create(from, to))
  }

	/**
	 * Creates error object with current stream state
	 */
  error(message: string): Error {
    const err = new Error(`${message} at row ${this.pos.line}, column ${this.pos.character}`)

    return err
  }

	/**
	 * Returns line length of given row, including line ending
	 */
  _lineLength(row: number): number {
    const line = this.getline(row)
    return line.length
  }

	/**
	 * `match` can be a character code or a function that takes a character code
	 * and returns a boolean. If the next character in the stream 'matches'
	 * the given argument, it is consumed and returned.
	 * Otherwise, `false` is returned.
	 */
  eat(match: number | Function): boolean {
    const ch = this.peek()
    const ok = typeof match === 'function' ? match(ch) : ch === match

    if (ok) {
      this.next()
    }

    return ok
  }

	/**
	 * Repeatedly calls <code>eat</code> with the given argument, until it
	 * fails. Returns <code>true</code> if any characters were eaten.
	 */
  eatWhile(match: number | Function): boolean {
    const start = this.pos
    while (!this.eof() && this.eat(match)) { }
    return comparePosition(this.pos, start) != 0
  }
}
