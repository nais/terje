import { V1ObjectMeta, V1Role } from "@kubernetes/client-node";
import { getResourceTypeFromSelfLink } from "../helpers";
import { addResourceToRole, createRole } from "./creator";
import { add, del } from "./reducer";
import { RoleState } from "./types";

const role: V1Role = createRole('aura', 'default')
const state: RoleState = { 'default': { 'aura': role } }
const objectMeta: V1ObjectMeta = new V1ObjectMeta()
objectMeta.name = "resourceName"
objectMeta.namespace = "default"
objectMeta.selfLink = "/api/v1/namespaces/default/pods/resourceName"
objectMeta.labels = { 'team': 'aura', 'managed-by': 'terje' }

test('test adding resource to existing role', () => {
    const expectedRole = addResourceToRole(Object.assign({}, role), 'pods', 'resourceName')
    const expectedState = { 'default': { 'aura': expectedRole } }

    expect(add(state, objectMeta)).toEqual(expectedState)
})

test('test adding resource to new role', () => {
    const expectedRole = addResourceToRole(Object.assign({}, role), 'pods', 'resourceName')
    const expectedState = { 'default': { 'aura': expectedRole } }

    expect(add({}, objectMeta)).toEqual(expectedState)
})

test('test adding resource to new role when other role in same namespace already created', () => {
    const nonDefaultObjectMeta = Object.assign(objectMeta, {
        namespace: 'nondefault'
    })
    const nonDefaultRole: V1Role = Object.assign(role, {
        metadata: Object.assign(role.metadata, {
            namespace: 'nondefault',
        })
    })

    const expectedRole = addResourceToRole(nonDefaultRole, 'pods', 'resourceName')
    const expectedState = {
        'default': { 'aura': role },
        'nondefault': { 'aura': expectedRole },
    }

    expect(add(state, nonDefaultObjectMeta)).toEqual(expectedState)
    expect(add(state, nonDefaultObjectMeta)).toEqual(expectedState)
})

test('test deleting existing resource removes it from the state', () => {
    const roleWithResources = addResourceToRole(Object.assign({}, role), getResourceTypeFromSelfLink(objectMeta.selfLink), objectMeta.name)
    const roleWithoutResources = Object.assign({}, role)
    const stateWithRoleWithResources = {
        'default': { 'aura': roleWithResources },
    }
    const expectedState = {
        'default': { 'aura': roleWithoutResources }
    }

    expect(del(stateWithRoleWithResources, objectMeta)).toEqual(expectedState)
})

test('test deleting non-existing resource does nothing', () => {
    const roleWithResources = addResourceToRole(Object.assign({}, role), getResourceTypeFromSelfLink(objectMeta.selfLink), objectMeta.name + "other")
    const stateWithRoleWithResources = {
        'default': { 'aura': roleWithResources },
    }

    const expectedState = Object.assign({}, stateWithRoleWithResources)

    expect(del(stateWithRoleWithResources, objectMeta)).toEqual(expectedState)
})