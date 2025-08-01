#!/bin/bash
echo "📊 Carousel Application Status"
echo "=============================="
echo ""

# Check minikube status
echo "🖥️  Minikube Status:"
minikube status || echo "❌ Minikube not running"
echo ""

# Check namespace
echo "📦 Namespace:"
kubectl get namespace carousel 2>/dev/null || echo "❌ Carousel namespace not found"
echo ""

# Check pods
echo "🚀 Pods:"
kubectl get pods -n carousel 2>/dev/null || echo "❌ No pods found"
echo ""

# Check services
echo "🌐 Services:"
kubectl get services -n carousel 2>/dev/null || echo "❌ No services found"
echo ""

# Check ingress
echo "🔗 Ingress:"
kubectl get ingress -n carousel 2>/dev/null || echo "❌ No ingress found"