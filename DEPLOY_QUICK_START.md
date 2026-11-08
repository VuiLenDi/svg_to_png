# Quick Start - Deploy to AWS

Hướng dẫn nhanh để triển khai SVG-to-PNG converter lên AWS.

## 📋 Prerequisites

- AWS Account với `dev-sso` profile cấu hình
- Terraform >= 1.0
- AWS CLI v2
- Docker (để build images)
- Git

## ⚡ 3 Steps to Deploy

### Step 1: Login to AWS SSO
```bash
aws sso login --profile dev-sso
```

Verify login:
```bash
aws sts get-caller-identity --profile dev-sso
```

### Step 2: Deploy Infrastructure
```bash
cd terraform

# Validate
AWS_PROFILE=dev-sso terraform validate

# Review plan
AWS_PROFILE=dev-sso terraform plan

# Apply (takes 3-5 minutes)
AWS_PROFILE=dev-sso terraform apply -auto-approve
```

### Step 3: Push Docker Image
```bash
# Get ECR repository URL
REPO_URL=$(AWS_PROFILE=dev-sso terraform output -raw ecr_repository_url)

# Login to ECR
aws ecr get-login-password --region us-east-1 --profile dev-sso | \
  docker login --username AWS --password-stdin $REPO_URL

# Build and push
docker build -t svg-to-png:latest .
docker tag svg-to-png:latest $REPO_URL:latest
docker push $REPO_URL:latest
```

## 🌐 Access Your Application

After deployment, get the load balancer URL:

```bash
AWS_PROFILE=dev-sso terraform output -raw alb_dns_name
```

Open in browser: `http://{ALB_DNS_NAME}`

## 📊 Monitor Status

```bash
# Check ECS tasks
AWS_PROFILE=dev-sso aws ecs describe-services \
  --cluster svg-to-png-cluster \
  --services svg-to-png-service

# View logs
AWS_PROFILE=dev-sso aws logs tail /ecs/svg-to-png --follow

# Update service with new image
AWS_PROFILE=dev-sso aws ecs update-service \
  --cluster svg-to-png-cluster \
  --service svg-to-png-service \
  --force-new-deployment
```

## 🗑️ Cleanup

```bash
AWS_PROFILE=dev-sso terraform destroy -auto-approve
```

---

📖 See [AWS_SSO_SETUP.md](AWS_SSO_SETUP.md) for detailed documentation.
