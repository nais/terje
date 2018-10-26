import {V1ObjectMeta, V1PolicyRule, V1Role} from '@kubernetes/client-node'
import {createObjectMeta, ensureManagedByTerje} from "../helpers"

function createInitialPolicyRule(resourceType: string, resourceName: string): V1PolicyRule {
    let rule: V1PolicyRule = new V1PolicyRule()

    rule.apiGroups = ['*']
    rule.verbs = ['*']
    rule.resources = [resourceType]
    rule.resourceNames = [resourceName]

    return rule
}

export function addResourceToRole(role: V1Role, resourceType: string, resourceName: string): V1Role {
    // If no rules exist at all in the role.
    if (!(role.rules)) {
        role.rules = [createInitialPolicyRule(resourceType, resourceName)]
        return role
    }

    // If the resourceType is already present, just add the resource name to the list
    for (let i = 0; i < role.rules.length; i++) {
        if (role.rules[i].resources.indexOf(resourceType) > -1) {
            // Already exists
            if (role.rules[i].resourceNames.indexOf(resourceName) > -1) {
                return role
            } else {
                role.rules[i].resourceNames.push(resourceName)
                return role
            }
        }
    }

    // If above for loop did not exit, that means this resource type is new for this role and the role already has other rules. Add new rule.
    role.rules.push(createInitialPolicyRule(resourceType, resourceName))
    role.metadata = ensureManagedByTerje(role.metadata)

    return role
}

export function createRole(team: string, namespace: string): V1Role {
    let role: V1Role = new V1Role()

    role.metadata = createObjectMeta("nais:team:" + team, namespace)

    return role
}

export function removeResourceFromRole(role: V1Role, resourceType: string, resourceName: string): V1Role {
    role.rules = role.rules.map((policyRule) => {
        if (policyRule.resources.indexOf(resourceType) > -1) {
            policyRule.resourceNames = policyRule.resourceNames.filter((n) => (n !== resourceName))
            return policyRule
        } else {
            return policyRule
        }
    }).filter((policyRule) => {
        return (policyRule.resourceNames.length > 0)
    })

    return role
}
