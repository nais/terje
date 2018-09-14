import {V1ObjectMeta, V1PolicyRule, V1Role} from '@kubernetes/client-node';

import parentLogger from "../logger";

const logger = parentLogger.child({module: 'role'});

function createInitialPolicyRule(resourceType: string, resourceName: string): V1PolicyRule {
    let rule: V1PolicyRule = new V1PolicyRule();

    rule.apiGroups = ['*'];
    rule.verbs = ['*'];
    rule.resources = [resourceType];
    rule.resourceNames = [resourceName];

    return rule;
}

export function addResourceToRole(role: V1Role, resourceType: string, resourceName: string): V1Role {
    // If no rules exist at all in the role.
    if (!(role.rules)) {
        role.rules = [createInitialPolicyRule(resourceType, resourceName)];
        return role;
    }

    // If the resourceType is already present, just add the resource name to the list
    for (let i = 0; i < role.rules.length; i++) {
        if (role.rules[i].resources.indexOf(resourceType) > -1) {
            // Already exists
            if (role.rules[i].resourceNames.indexOf(resourceName) > -1) {
                return role;
            } else {
                role.rules[i].resourceNames.push(resourceName);
                return role;
            }
        }
    }

    // If above for loop did not exit, that means this resource type is new for this role and the role already has other rules. Add new rule.
    role.rules.push(createInitialPolicyRule(resourceType, resourceName));
    return ensureManagedByTerje(role)
}

export function createRole(name: string, namespace: string): V1Role {
    let role: V1Role = new V1Role();

    role.metadata = new V1ObjectMeta();
    role.metadata.name = name;
    role.metadata.namespace = namespace;

    return ensureManagedByTerje(role);
}

export function ensureManagedByTerje(role: V1Role): V1Role {
    if (!(role.metadata.labels)) {
        role.metadata.labels = {"managed-by": "Terje"};
    } else {
        role.metadata.labels["managed-by"] = "Terje";
    }

    return role;
}

export function removeResourceFromRole(role: V1Role, resourceType: string, resourceName: string): V1Role {
    role.rules = role.rules.map((policyRule) => {
        if (policyRule.resources.indexOf(resourceType) > -1) {
            policyRule.resourceNames = policyRule.resourceNames.filter((n) => (n !== resourceName));
            return policyRule
        } else {
            return policyRule
        }
    }).filter((policyRule) => {
        return (policyRule.resourceNames.length > 0)
    });

    return role;
}
