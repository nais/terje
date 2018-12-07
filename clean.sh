#!/bin/bash -e
#
# Generate commands to clean up (cluster)roles and -rolebindings created by TERJE.
# Additionally deletes the actual roles and rolebindings required
# by the TERJE deployment.

function k {
    echo "kubectl $*"
}

echo "#!/bin/sh"

k delete clusterrole nais:team
k delete clusterrole terje
k delete clusterrolebinding terje
k delete clusterrolebinding view:terje

crb=`kubectl get clusterrolebinding | grep -E "^nais:team" | awk '{print $1}'`
for b in $crb; do
    k delete clusterrolebinding $b
done

namespaces=`kubectl get namespace -l "terje=enabled" | awk '{print $1}'`
for ns in $namespaces; do
    roles=`kubectl get role --namespace $ns | grep -E "^nais:team" | awk '{print $1}'`
    rolebindings=`kubectl get rolebinding --namespace $ns | grep -E "^nais:team" | awk '{print $1}'`
    for r in $roles; do
        k delete --namespace $ns role $r
    done
    for r in $rolebindings; do
        k delete --namespace $ns rolebinding $r
    done
done
