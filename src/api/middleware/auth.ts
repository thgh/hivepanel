import { Request, Response } from 'express'

import { str62 } from '@/lib/random'
import { checkAuth, state, swarm } from '@/lib/state'

const SESSION = 'hive-session'

// if (!state.swarmAt) await isSwarmManager()
export async function authMiddleware(
  req: Request,
  res: Response,
  next: () => void
) {
  if (req.method === 'POST' && req.url === '/auth/logout') {
    res.clearCookie(SESSION)
    return res.json({ message: 'Logged out' })
  }

  const sessionId = req.cookies[SESSION]
  if (sessionId) {
    const sessionString = swarm.get(`hive.session.${sessionId}`)
    if (sessionString) {
      const session: { email: string } = JSON.parse(sessionString)
      if (req.method === 'PATCH' && req.url === '/auth/user') {
        let { username, password } = req.body
        if (!username && !password) return res.json({ message: 'No changes' })
        console.log('update user', username, password, session.email)
        if (!username) username = session.email
        if (!password) password = swarm.users.get(session.email)
        // Memory
        swarm.users.set(username, password)
        // Persist
        swarm.set(`hive.panel.user.${username}`, password)
        if (username !== session.email)
          swarm.set(`hive.panel.user.${session.email}`, '')
        return res.json({ message: 'User updated', username })
      }

      // @ts-expect-error consider using express-session?
      req.session = session
      return next()
    }
    console.log(req.url, 'invalid session', sessionId)
  }

  if (req.method === 'POST' && req.url === '/auth/login') {
    if (!req.body.email) req.body.email = 'admin'
    const { email, password } = req.body
    await checkAuth()
    const data = swarm.users.get(email)
    // TODO: bcrypt
    if (data && data === password) {
      const sessionId = str62(20)
      swarm.set(`hive.session.${sessionId}`, JSON.stringify({ email }))
      res.cookie(SESSION, sessionId, {
        httpOnly: true,
        path: '/',
        sameSite: 'strict',
        secure: req.protocol === 'https',
      })
      return res.json({ message: 'Logged in', sessionId, email })
    } else {
      return res.status(400).json({ message: 'Invalid credentials' })
    }
  }

  // Get initial credentials
  swarm.users.get('admin')

  return res.status(401).json({ status: 401, message: 'Unauthorized' })

  // if ()

  const label = swarm.get('hive.panel.user.admin')
  res.json(state)
}

function stringifyUser(user: string) {
  return [`hive.user.${user}`]
}
