import { createServer } from './index'
import { port } from './lib/env'

// Default port in dev is 23088
createServer(port)

// Listen for termination signals allows Ctrl+C in docker run
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))
