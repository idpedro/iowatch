import { EventEmitter } from 'node:events'

const fromEvent = <T>(target: EventEmitter, eventName: string) => {
  let _listener: any
  return new ReadableStream({
    start(controller) {
      _listener = (e: T) => {
        controller.enqueue(e)
      }
      target.on(eventName, _listener.bind(_listener))
    },
    cancel() {
      console.log('cancel')
      target.off(eventName, _listener)
    },
  })
}

const interval = (ms: number) => {
  let _intervalId: NodeJS.Timeout
  return new ReadableStream({
    start(controller) {
      _intervalId = setInterval(() => {
        controller.enqueue(Date.now())
      }, ms)
    },
    cancel() {
      clearInterval(_intervalId)
    },
  })
}

const map = <T, U>(fn: (data: T) => U) => {
  return new TransformStream({
    transform(chunk, controller) {
      console.log('map', chunk)
      controller.enqueue(fn.bind(fn)(chunk))
    },
  })
}

const merge = (streams: (ReadableStream | TransformStream)[]) => {
  return new ReadableStream({
    async start(controller) {
      for (const stream of streams) {
        const reader = (
          (stream as TransformStream)?.readable || stream
        ).getReader()
        async function read() {
          const { value, done } = await reader.read()
          if (done) return
          // verifica se a stream ja encerrou
          if (!controller.desiredSize) return

          controller.enqueue(value)

          return read()
        }

        read()
      }
    },
  })
}

const switchMap = <T>(
  fn: (data: T) => (ReadableStream | TransformStream)[],
  options = { pairwise: true }
) => {
  return new TransformStream({
    // mousedown
    transform(chunk, controller) {
      const stream = fn.bind(fn)(chunk)

      const reader = (
        (stream as unknown as TransformStream)?.readable || stream
      ).getReader()
      async function read() {
        // mousemove
        const { value, done } = await reader.read()
        if (done) return
        const result = options.pairwise ? [chunk, value] : value
        controller.enqueue(result)

        return read()
      }

      return read()
    },
  })
}

const takeUntil = (stream: ReadableStream | TransformStream) => {
  const readAndTerminate = async (
    stream: ReadableStream | TransformStream,
    controller: TransformStreamDefaultController
  ) => {
    const reader = ((stream as TransformStream).readable || stream).getReader()
    const { value } = await reader.read()
    controller.enqueue(value)
    controller.terminate()
  }

  return new TransformStream({
    start(controller) {
      readAndTerminate(stream, controller)
    },
    transform(chunk, controller) {
      controller.enqueue(chunk)
    },
  })
}

export { fromEvent, interval, map, merge, switchMap, takeUntil }
