interface resourceTypesToNamesMap { [resourceType: string]: string[] }
interface resourcesMap { [team: string]: { [namespace: string]: resourceTypesToNamesMap} }
