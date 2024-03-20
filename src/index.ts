import { uIOhook } from 'uiohook-napi'
import { TypingTracker } from '@/lib/typing-tracker.js'

uIOhook.addListener(
  'keydown',
  TypingTracker.createListener().bind(TypingTracker)
)

uIOhook.start()
