import pino from 'pino'

let logger: pino.Logger
let initialized = false

type ChildLoggerMap = {
  [key: string]: pino.Logger
}

const childLoggers: ChildLoggerMap = {}

// type PinoOpts =  pino.LoggerOptions | pino.DestinationStream

/** Logger singleton provider.
 * Returns The logger if it is initialized.
 * Otherwise initialize the pino logger.
 * If
 * @param optsOrChild Options for pino.
 * @param transport Transports for pino.
 * @return pino.Logger
 */
function log(
  optsOrChild?: pino.LoggerOptions | string,
  transport?: pino.DestinationStream
): pino.Logger {
  if (typeof optsOrChild === 'string') {
    const child = optsOrChild
    if (childLoggers[child]) {
      return childLoggers[child]
    } else {
      childLoggers[child] = logger.child({ name: child })
    }

    return childLoggers[child]
  }

  if (!initialized) {
    const opts = optsOrChild
    if (opts) {
      if (transport) {
        logger = pino(opts, transport)
      }
      logger = pino(opts)
    } else {
      logger = pino()
    }

    initialized = true
  }

  return logger
}

export { log }
