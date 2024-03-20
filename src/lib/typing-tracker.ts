import { UiohookKey, UiohookKeyboardEvent } from 'uiohook-napi'
import KeyMap from '@/lib/keys.json'
import { snippetDb } from './snippet-search.js'

export class TypingTracker {
  private snippetPrefix: string = 's/'
  private _isSnippet: boolean = false
  matcher: string = ''
  private currentKeys: string[] = []
  private curstorPosition: number = 0 // 0-based index

  addKey(key: string) {
    this.currentKeys.splice(this.curstorPosition, 0, key)
    this.curstorPosition++
  }

  removeKey() {
    this.currentKeys.splice(this.curstorPosition - 1, 1)
    this.curstorPosition--
  }

  moveCursor(direction: 'left' | 'right') {
    if (direction === 'left') {
      this.curstorPosition--
    } else {
      this.curstorPosition++
    }
  }

  removeLikeDelete() {
    // on string  "text" if cursor is at position 2
    // we want to remove the "x" character
    // so we want to remove the character at position 1
    // so we need to remove the character at position cursor - 1
    console.log('old', this.getWord())
    this.currentKeys.splice(this.curstorPosition, 1)
    this.validIfissSnippetAfterRemove()
    console.log('new', this.getWord())
  }

  removeLikeBackspace() {
    // on string  "text" if cursor is at position 2
    // we want to remove the "t" character
    // so we want to remove the character at position 2
    // so we need to remove the character at position cursor
    console.log('backspace in ', this.getWord())
    this.currentKeys.splice(this.curstorPosition - 1, 1)
    this.curstorPosition--
    console.log('result', this.getWord())
    this.validIfissSnippetAfterRemove()
    // when we remove the character at the cursor position
    // the cursor position should be decreased by 1
  }

  validIfissSnippetAfterRemove() {
    if (!this.getWord().includes(this.snippetPrefix)) {
      console.log('not a snippet anymore')
      this.clear()
    }
  }

  onDelete() {
    if (this.isCursorOnStart() || this.isEmpty()) {
      return
    }
    this.removeLikeDelete()
  }

  isEmpty() {
    return this.currentKeys.length === 0
  }

  isCursorOnStart() {
    return this.curstorPosition === 0 && this.currentKeys.length === 0
  }

  isCursorOnEnd() {
    return this.curstorPosition === this.currentKeys.length
  }

  backspace() {
    // if there is no key to delete or cursor is at the beginning
    if (this.isEmpty() || this.isCursorOnStart()) {
      console.log('empty or start')
      return
    }
    this.removeLikeBackspace()
  }

  move(direction: 'left' | 'right') {
    switch (direction) {
      case 'left':
        if (this.curstorPosition !== 0) this.curstorPosition--
        break
      case 'right':
        if (this.curstorPosition <= this.currentKeys.length)
          this.curstorPosition++
        break
    }
    const start = this.currentKeys.slice(
      0,
      this.curstorPosition - 1 > 0 ? this.curstorPosition - 1 : 0
    )
    const end = this.currentKeys.slice(this.curstorPosition)
    console.log('current', [...start, '|', ...end].join(''))
  }

  getWord() {
    return this.currentKeys.join('')
  }

  private showResults() {
    console.log('snippet ended', this.getWord())
    const result = snippetDb.search(this.getWord())
    if (result[0]?.item.command === this.getWord()) {
      console.log('found')
      console.log('result', result)
    } else {
      console.log('not found')
      console.log('result', result)
    }
  }

  clear() {
    if (this.isSnippet) this.showResults()
    console.log('[clear]')
    this.currentKeys = []
    this.curstorPosition = 0
    this._isSnippet = false
    this.matcher = ''
  }

  get cursor() {
    return this.curstorPosition
  }
  get isSnippet() {
    return this._isSnippet
  }

  validMatcher() {
    if (this.matcher === this.snippetPrefix) {
      this._isSnippet = true
      this.matcher = ''
      Array.from(this.snippetPrefix).forEach((key) => {
        this.addKey(key)
      })
      console.log('snippet started')
    }
    return true
  }

  static createListener() {
    const keyboradTracker = new TypingTracker()

    return function (e: UiohookKeyboardEvent) {
      try {
        if (
          e.keycode === UiohookKey.Space ||
          e.keycode === 3612 ||
          e.keycode === UiohookKey.Enter
        ) {
          keyboradTracker.clear()
          return
        }

        if (e.keycode === UiohookKey.Backspace && keyboradTracker.isSnippet) {
          console.log('space or enter')

          keyboradTracker.backspace()
          return
        }

        if (e.keycode === UiohookKey.Delete && keyboradTracker.isSnippet) {
          keyboradTracker.onDelete()
          return
        }

        if (e.keycode === UiohookKey.ArrowLeft && keyboradTracker.isSnippet) {
          keyboradTracker.move('left')
          return
        }

        if (e.keycode === UiohookKey.ArrowRight && keyboradTracker.isSnippet) {
          keyboradTracker.move('right')
          return
        }

        if (keyboradTracker.isSnippet) {
          //@ts-expect-error - Property 'keycode' does not exist on type 'KeyboardEvent'
          const key: string = KeyMap[e.keycode].toLocaleLowerCase()
          if (key.length === 1) keyboradTracker.addKey(key)
        }
        //@ts-expect-error - Property 'keycode' does not exist on type 'KeyboardEvent'
        keyboradTracker.matcher += KeyMap[e.keycode].toLocaleLowerCase()
        keyboradTracker.validMatcher()
      } catch (error) {
        console.error(error)
      }
    }
  }
}
