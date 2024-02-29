export const port = parseInt(process.env.PORT || '80')
export const devPort = parseInt(process.env.PORT || '23088')

/** @example panel.example.org */
export const HOST = process.env.HOST || ''
/** @example https://panel.example.org */
export const URL = process.env.URL || 'http://' + (HOST || 'localhost') //+ (port === 80 ? '' : ':' + port)

export const version = '0.0.1-dev'
export const buildDate = '0001-01-01T01:01:01Z'
