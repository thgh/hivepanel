const { createServer } = require('./index.cjs')

const port = parseInt(process.env.PORT || '80')
createServer(port)

// Listen for termination signals allows Ctrl+C in docker run
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))
