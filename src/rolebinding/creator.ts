import { V1RoleBinding, V1RoleRef, V1Subject } from '@kubernetes/client-node';
import { createObjectMeta } from "../helpers";

function createRoleRef(roleName: string, roleType: string): V1RoleRef {
    const ref: V1RoleRef = new V1RoleRef()

    ref.name = roleName
    ref.apiGroup = 'rbac.authorization.k8s.io'
    ref.kind = roleType

    return ref
}

function createSubject(subjectId: string, kind: string) {
    const subject = new V1Subject()

    subject.name = subjectId
    subject.kind = kind
    subject.apiGroup = 'rbac.authorization.k8s.io'

    return subject
}

export function createRoleBindingResource(roleBindingName: string, roleName: string, roleType: string, subjects: {name: string, type: string}[], namespace: string): V1RoleBinding {
    const roleBinding: V1RoleBinding = new V1RoleBinding()

    roleBinding.metadata = createObjectMeta(roleBindingName, namespace)
    roleBinding.roleRef = createRoleRef(roleName, roleType)
    roleBinding.subjects = subjects.map(subject => createSubject(subject.name, subject.type))

    return roleBinding
}

export function createClusterRoleBindingResource(clusterRoleBindingName: string, roleName: string, roleType: string, subjects: {name: string, type: string}[]): V1RoleBinding {
    const roleBinding: V1RoleBinding = new V1RoleBinding()

    roleBinding.metadata = createObjectMeta(clusterRoleBindingName)
    roleBinding.roleRef = createRoleRef(roleName, roleType)
    roleBinding.subjects = subjects.map(subject => createSubject(subject.name, subject.type))

    return roleBinding
}