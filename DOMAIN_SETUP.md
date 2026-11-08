# Domain & HTTPS Setup Guide

## 📋 Current Status

- ✅ **HTTPS Listener**: Configured on port 443 with svg2png.vuilendi.com certificate
- ✅ **HTTP to HTTPS Redirect**: Port 80 → 443 (HTTP 301)
- ✅ **Certificate**: ISSUED for `svg2png.vuilendi.com`
- ✅ **Application**: 2/2 ECS tasks running, responding HTTP/2 200 OK
- ✅ **DNS**: A record configured (ssl certificate validated)

## 🔗 URL Access

### Available URLs

```bash
# Production Domain (HTTPS)
https://svg2png.vuilendi.com
→ HTTP/2 200 OK ✅

# ALB Direct (via DNS name)
https://<ALB_DNS_NAME>
→ HTTP/2 200 OK ✅ (certificate mismatch but accessible)
```

## 📋 Infrastructure Setup

✅ **VPC**: Multi-AZ networking in us-east-1
✅ **Application Load Balancer**: Public-facing with HTTPS listener
✅ **ECS Cluster**: svg-to-png-cluster with 2 tasks
✅ **ACM Certificate**: ISSUED for svg2png.vuilendi.com
✅ **Terraform**: Infrastructure as Code managed

## 🛠️ Configuration

### Environment Variables

For Terraform to work, set these environment variables:

```bash
# Docker image in ECR (required for deployment)
export TF_VAR_container_image="<AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/svg-to-png:v3"

# ACM Certificate ARN (required for HTTPS)
export TF_VAR_acm_certificate_arn="arn:aws:acm:us-east-1:<AWS_ACCOUNT_ID>:certificate/<CERTIFICATE_ID>"

# AWS Profile for authentication
export AWS_PROFILE=dev-sso
```

### Verify Deployment

```bash
# Check ECS service
AWS_PROFILE=dev-sso aws ecs describe-services \
  --cluster svg-to-png-cluster \
  --services svg-to-png-service \
  --region us-east-1

# Check ALB
AWS_PROFILE=dev-sso aws elbv2 describe-load-balancers \
  --region us-east-1 --query 'LoadBalancers[?LoadBalancerName==`svg-to-png-alb`]'

# Check certificate
AWS_PROFILE=dev-sso aws acm list-certificates \
  --region us-east-1 \
  --query 'CertificateSummaryList[?DomainName==`svg2png.vuilendi.com`]'

# Test HTTPS
curl -vI https://svg2png.vuilendi.com
```

## 🔐 HTTPS Redirect Flow

```
┌─────────────────────┐
│  Client Request     │
│  http://domain.com  │
└──────────────┬──────┘
               │
               v
        ┌─────────────┐
        │  Port 80    │
        │  HTTP ALB   │
        │  Listener   │
        └─────────────┘
               │ Redirect (HTTP 301)
               │ Location: https://domain.com
               v
        ┌─────────────┐
        │  Port 443   │
        │  HTTPS ALB  │
        │  Listener   │
        │ + ACM Cert  │
        └─────────────┘
               │ Forward to ECS tasks
               v
        ┌──────────────────┐
        │  ECS Tasks       │
        │  Port 3000       │
        │  (Application)   │
        └──────────────────┘
```

## ⚙️ Terraform Configuration

The infrastructure is defined in `terraform/` directory:

- `main.tf` - Backend configuration, version constraints
- `variables.tf` - Input variable definitions
- `terraform.tfvars` - Variable values (excluded from git)
- `networking.tf` - VPC, subnets, security groups
- `load_balancer.tf` - ALB, listeners, target groups
- `ecs.tf` - ECS cluster, service, task definitions
- `ecr.tf` - ECR repository for container images
- `outputs.tf` - Output values after deployment

## 📚 Documentation

- `AWS_CICD_SETUP.md` - Complete AWS setup guide
- `AWS_SSO_SETUP.md` - AWS SSO configuration
- `DEPLOY_QUICK_START.md` - Quick start guide
- `terraform/README.md` - Terraform-specific documentation

## 🔗 Secrets Management

⚠️ **NEVER commit secrets to git**

Use environment variables for all sensitive values:
- `TF_VAR_container_image` - ECR image URI
- `TF_VAR_acm_certificate_arn` - Certificate ARN
- `AWS_PROFILE` - AWS CLI profile
- AWS credentials - via AWS CLI SSO or credentials file

For CI/CD, use GitHub Secrets or AWS Secrets Manager.

## ✅ Verification Checklist

- [x] VPC created with multi-AZ subnets
- [x] Application Load Balancer configured
- [x] HTTPS listener with ACM certificate
- [x] HTTP → HTTPS redirect enabled
- [x] ECS cluster and service running
- [x] Container images in ECR
- [x] Domain pointing to ALB
- [x] Certificate validated and ISSUED
- [x] Application responding on HTTPS

## 🚀 Ready for Production

Application URL: **https://svg2png.vuilendi.com**

Status: 🟢 **LIVE & OPERATIONAL**
