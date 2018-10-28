import { V1RoleBinding, V1RoleRef, V1Subject } from '@kubernetes/client-node';
import { createObjectMeta } from "../helpers";

function createRoleRef(teamName: string): V1RoleRef {
    const ref: V1RoleRef = new V1RoleRef()

    ref.name = 'nais:team:' + teamName
    ref.apiGroup = 'rbac.authorization.k8s.io'
    ref.kind = 'Role'

    return ref
}

function createSubject(subjectId: string, kind: string) {
    const subject = new V1Subject()

    subject.name = subjectId
    subject.kind = kind
    subject.apiGroup = 'rbac.authorization.k8s.io'

    return subject
}

export function createRoleBindingResource(team: string, groupId: string, namespace: string): V1RoleBinding {
    const roleBinding: V1RoleBinding = new V1RoleBinding()

    const machineUser = createSubject(team, 'User')
    const teamGroup = createSubject(groupId, 'Group')

    roleBinding.metadata = createObjectMeta('nais:team:' + team, namespace)
    roleBinding.roleRef = createRoleRef(team)
    roleBinding.subjects = [machineUser, teamGroup]

    return roleBinding
}
