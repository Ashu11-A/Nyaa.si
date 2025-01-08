import UserAgent from 'user-agents'

type SessionOptions = {
  /**
   * @link https://www.npmjs.com/package/user-agents
   */
  userAgentOptions?: Partial<UserAgent['data']>
  /**
   * If not defined, it will generate a userAgent on every call (recommended)
   */
  defaultUserAgent?: string
}

export class SessionManager {
  private sessions = new Map<string, string>()

  constructor (private options?: SessionOptions) {}

  create (id: string, filter?: SessionOptions['userAgentOptions']): string {
    const session = this.options?.defaultUserAgent ?? new UserAgent(this.options?.userAgentOptions ?? filter).toString()

    this.sessions.set(id, session)
    return session
  }

  get (id: string) {
    return this.sessions.get(id)
  }

  createOrGet (id: string, filter?: SessionOptions['userAgentOptions']) {
    const session = this.get(id)
    if (session) return session

    return this.create(id, filter)
  }

  clear (id: string) {
    return this.sessions.delete(id)
  }
}