### kubectl delete -k ./kubernetes
### kubectl apply -f ./kubernetes
### and kubectl port-forward -n finance-manager service/client-spa 3000:3000
### and kubectl port-forward -n finance-manager service/resource-server 3001:3001
### and kubectl port-forward -n finance-manager svc/keycloak-service 8080:8080


### kubectl delete pv mongodb-docker-pv mongodb-pv postgres-docker-pv postgres-pv

### kubectl delete pvc --all -n finance-manager