import type { SessionManager } from '../controllers/SessionManager'

export type ClientOptions = {
    session?: SessionManager
    /**
     * Shows the browser and the actions being taken to perform webscraping
     * 
     * @default false
     */
    showNavigator?: boolean
    /**
     * Total number of pages to be processed in parallel
     * 
     * @default 1
     */
    concurrentJobs?: number
    /**
     * This limits the time for the next job request, I don't recommend decreasing this to less than 3000 ms
     * 
     * @default 3000
     */
    timeout?: number
}