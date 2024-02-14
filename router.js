/**
 * @param {string} pathname 
 * @param {Array.<{path: string, component: *}>} routes 
 */
export function getMatchedRoutes (pathname, routes) {
    let catchAllRoute = null

    for(const route of routes) {
        if (route.path === "/*") catchAllRoute = route
        if (route.path === pathname) return { ...route, query: {}}

        if (route.path.includes("/:")) {
            let idx = 0
            let pathTokens = pathname.split("/")
            let routeTokens = route.path.split(/\//)
            while (idx < routeTokens.length) {
                const currentVar = routeTokens[idx]
                if (currentVar[0] === ":") {
                    const newRoute = routeTokens.slice(0, idx + 1)
                    newRoute[idx] = pathTokens[idx]
                    if (pathname.startsWith(newRoute.join("/"))) {
                        routeTokens[idx] = pathTokens[idx]
                    }
                    if (pathname === newRoute.join("/")) {
                        return { 
                            ...route,
                            query: {
                                [currentVar.substring(1)]: pathTokens[idx]
                            }
                        }
                    }
                    if (pathTokens[idx] === undefined) break;
                }
                idx++;
            }
        }
    }

    return catchAllRoute ? ({...catchAllRoute, query: {}}) : null
}
