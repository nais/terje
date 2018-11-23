import { V1Role } from '@kubernetes/client-node';
import { addResourceToRole, createRole, removeResourceFromRole, ruleTemplate } from './creator';
import { AssertionError } from 'assert';
import deepEqual = require('deep-equal');

const team = "unittest"
const namespace = 'namespace'

test('test created role has correct metadata', () => {
    const role: V1Role = createRole(team, namespace)

    expect(role.metadata.name).toMatch(team)
    expect(role.metadata.namespace).toMatch(namespace)
})

test('test rules get added to role with no previous rules', () => {
    const role: V1Role = createRole(team, namespace)
    const resourceType = 'applications'
    const resourceName = 'resourceName'

    let newRole = addResourceToRole(role, resourceType, resourceName)

    expect(newRole.rules[0].resources[0]).toMatch(resourceType)
    expect(newRole.rules[0].resourceNames[0]).toMatch(resourceName)
})

test('test rules get added to role with existing rules of same resourceType', () => {
    const role: V1Role = createRole(team, namespace)
    const resourceType = 'applications'
    const firstResourceName = 'firstResourceName'
    const secondResourceName = 'secondResourceName'

    let newRole = addResourceToRole(role, resourceType, firstResourceName)
    newRole = addResourceToRole(newRole, resourceType, secondResourceName)

    expect(newRole.rules[0].resources[0]).toMatch(resourceType)
    expect(newRole.rules[0].resourceNames[0]).toMatch(firstResourceName)
    expect(newRole.rules[0].resourceNames[1]).toMatch(secondResourceName)
})

test('test rules get added to role with existing rules of different resourceType', () => {
    const role: V1Role = createRole(team, namespace)
    const firstResourceType = 'applications'
    const secondResourceType = 'configmaps'
    const resourceName = 'resourceName'

    let newRole = addResourceToRole(role, firstResourceType, resourceName)
    newRole = addResourceToRole(newRole, secondResourceType, resourceName)

    expect(newRole.rules[0].resources[0]).toMatch(firstResourceType)
    expect(newRole.rules[1].resources[0]).toMatch(secondResourceType)
    expect(newRole.rules[0].resourceNames[0]).toMatch(resourceName)
    expect(newRole.rules[1].resourceNames[0]).toMatch(resourceName)
})

test('test adding already existing rule changes nothing and return correct bool', () => {
    const role: V1Role = createRole(team, namespace)
    const resourceType = 'applications'
    const resourceName = 'resourceName'

    let newRole = addResourceToRole(role, resourceType, resourceName)
    expect(newRole.rules).toHaveLength(1)
    expect(newRole.rules[0].resourceNames).toHaveLength(1)
    expect(newRole.rules[0].resources).toHaveLength(1)

    newRole = addResourceToRole(role, resourceType, resourceName)
    expect(newRole.rules).toHaveLength(1)
    expect(newRole.rules[0].resourceNames).toHaveLength(1)
    expect(newRole.rules[0].resources).toHaveLength(1)
})

test('test removing resource from role', () => {
    const resourceType = 'applications'
    const resourceName = 'resourceName'
    const resourceName2 = 'resourceName2'
    let role = createRole(team, namespace)

    role = addResourceToRole(role, resourceType, resourceName)
    role = addResourceToRole(role, resourceType, resourceName2)
    role = removeResourceFromRole(role, resourceType, resourceName)

    expect(role.rules).toHaveLength(1)
    expect(role.rules[0].resourceNames).toHaveLength(1)
    expect(role.rules[0].resources).toHaveLength(1)

    expect(role.rules[0].resources[0]).toEqual(resourceType)
    expect(role.rules[0].resourceNames[0]).toEqual(resourceName2)
})

test('test removing last resource from role', () => {
    const resourceType = 'applications'
    const resourceName = 'resourceName'

    let role = createRole(team, namespace)

    role = addResourceToRole(role, resourceType, resourceName)
    role = removeResourceFromRole(role, resourceType, resourceName)

    expect(role.rules).toHaveLength(0)
})

test('test removing resource from role when multiple resourceTypes', () => {
    const resourceType = 'applications'
    const resourceType2 = 'configmaps'
    const resourceName = 'resourceName'

    let role = createRole(team, namespace)

    role = addResourceToRole(role, resourceType, resourceName)
    role = addResourceToRole(role, resourceType2, resourceName)
    role = removeResourceFromRole(role, resourceType, resourceName)

    expect(role.rules).toHaveLength(1)
    expect(role.rules[0].resources[0]).toEqual(resourceType2)
    expect(role.rules[0].resourceNames[0]).toEqual(resourceName)
})

test('ruleTemplate applies correct apiGroup and verbs', () => {
    const resourceName = 'resourceName'
    let role = createRole(team, namespace)

    for (let key in ruleTemplate) {
        role = addResourceToRole(role, key, resourceName)
        expect(role.rules[role.rules.length - 1].apiGroups).toEqual(ruleTemplate[key]['apiGroup'])
        expect(role.rules[role.rules.length - 1].verbs).toEqual(ruleTemplate[key]['verbs'])
    }
})