import { createOrUpdateRole, keepRolesInSync, fetchRoles, syncRoles } from './sagas'
import { call, select } from 'redux-saga/effects'
import { createRole } from "./creator"
import { KubeConfig, RbacAuthorization_v1Api, V1RoleList } from "@kubernetes/client-node"

import parentLogger from "../logger"
import { selectRoleState } from './types'

const logger = parentLogger.child({ module: 'sagas.test' })

const team = 'unittest'
const namespace = 'namespace'
const mockRole = createRole(team, namespace)

const mockRoleList = new V1RoleList()
mockRoleList.items = [mockRole]

const kubeConfig = new KubeConfig()
kubeConfig.loadFromDefault()
const rbacApi = kubeConfig.makeApiClient(RbacAuthorization_v1Api)

test('test keep roles in sync', () => {
    const mockState = { 'namespace': { 'team': mockRole } }
    const mockClusterState = [mockRole]
    const gen = keepRolesInSync()

    expect(gen.next().value).toEqual(
        select(selectRoleState)
    )

    expect(gen.next(mockState).value).toEqual(
        call(fetchRoles)
    )

    expect(gen.next(mockClusterState).value).toEqual(
        call(syncRoles, mockClusterState, mockState)
    )

    expect(gen.next().value).toBeDefined() // delay

    // Should start on the beginning as it's a while(true) loop
    expect(gen.next().value).toEqual(
        select(selectRoleState)
    )
})

test('test fetch roles saga', () => {
    const mockRoleListResponse = { body: mockRoleList }

    const gen = fetchRoles()
    expect(gen.next().value).toEqual(
        call([rbacApi, rbacApi.listRoleForAllNamespaces])
    )

    expect(gen.next(mockRoleListResponse).value).toEqual(
        [mockRole]
    )

    expect(gen.next().done).toBe(true)
})

test('test create or update role saga', () => {
    const mockRoleResponse = {
        response: {
            statusCode: 200,
        },
        body: mockRole
    }

    const gen = createOrUpdateRole(mockRole)
    expect(gen.next().value).toEqual(
        call([rbacApi, rbacApi.replaceNamespacedRole], `nais:team:${team}`, namespace, mockRole)
    )

    expect(gen.next(mockRoleResponse).value).toBeDefined() // delay

    expect(gen.next().value).toEqual(
        true
    )

    expect(gen.next().done).toBe(true)
})

test('test create or update role saga error handling', () => {
    const mockRoleResponse = {
        response: {
            statusCode: 401,
            statusMessage: "Unauthorized"
        }
    }

    const gen = createOrUpdateRole(mockRole)
    expect(gen.next().value).toEqual(
        call([rbacApi, rbacApi.replaceNamespacedRole], `nais:team:${team}`, namespace, mockRole)
    )

    expect(gen.next(mockRoleResponse).value).toBeDefined() // delay

    expect(gen.next().value).toEqual(
        false
    )

    expect(gen.next().done).toBe(true)
})
