#!/bin/bash -e
#
# Generate commands to clean up (cluster)roles and -rolebindings created by TERJE.
# Additionally deletes the actual roles and rolebindings required
# by the TERJE deployment.

function k {
    echo "kubectl $*"
}

echo "#!/bin/sh"

k --namespace nais delete deploy terje
k --namespace nais delete secret terje
k delete clusterrole nais:team
k delete clusterrole terje
k delete clusterrolebinding terje
k delete clusterrolebinding view:terje
k delete clusterrolebinding -l "managed-by=terje"

namespaces=`kubectl get namespace -l "terje=enabled" -o jsonpath="{.items[*].metadata.name}"`
for ns in $namespaces; do
    k delete role --namespace $ns -l "managed-by=terje"
    k delete rolebinding --namespace $ns -l "managed-by=terje"
done
