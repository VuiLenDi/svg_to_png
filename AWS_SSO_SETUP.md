# AWS SSO Setup for SVG-to-PNG CI/CD

## ✅ Hoàn thành

- [x] AWS SSO profile `dev-sso` đã cấu hình
- [x] Terraform bootstrap: S3 bucket + DynamoDB table tạo thành công
- [x] Terraform main backend cấu hình với S3
- [x] Tất cả 35 AWS resources sẵn sàng deploy

## 📋 AWS Account Information

```
Account ID: <ACCOUNT_ID>
Region: us-east-1
Profile: dev-sso
SSO Start URL: https://vuilendi-sso.awsapps.com/start
```

## 🔧 Terraform State Management

### S3 Bucket
- **Name**: `svg-to-png-terraform-state-<ACCOUNT_ID>`
- **Versioning**: Enabled
- **Encryption**: AES256
- **Public Access**: Blocked

### DynamoDB Table
- **Name**: `terraform-locks`
- **Billing Mode**: Pay-per-request
- **Point-in-time Recovery**: Enabled

## 📦 Infrastructure to Deploy (35 Resources)

### Networking (8 resources)
- VPC: `10.0.0.0/16`
- Public Subnets: `10.0.1.0/24`, `10.0.2.0/24` (2 AZs)
- Private Subnets: `10.0.10.0/24`, `10.0.11.0/24` (2 AZs)
- Internet Gateway
- NAT Gateways (2x)
- Route Tables (3x)

### Load Balancer (4 resources)
- Application Load Balancer
- Target Group (port 3000)
- ALB Listener (port 80 → 3000)
- Security Groups (ALB + ECS tasks)

### Container Registry (2 resources)
- ECR Repository: `svg-to-png`
- Lifecycle Policy: Keep 10 tagged images, remove untagged after 7 days

### ECS Fargate (11 resources)
- ECS Cluster with CloudWatch Container Insights
- Task Definition (cpu: 256, memory: 512)
- ECS Service (Fargate)
- CloudWatch Log Group: `/ecs/svg-to-png`
- IAM Roles & Policies (execution + task roles)
- Auto Scaling (min: 2, max: 4 tasks)
  - CPU policy: Target 70%
  - Memory policy: Target 80%

### Security (4 resources)
- ALB Security Group (80, 443 from 0.0.0.0/0)
- ECS Tasks Security Group (port 3000 from ALB)
- S3 Public Access Block
- IAM Policies

### Monitoring (1 resource)
- CloudWatch Log Group with 30-day retention

## 🚀 Next Steps

### 1. Verify AWS SSO Login
```bash
aws sts get-caller-identity --profile dev-sso
```

Expected output:
```
Account: <ACCOUNT_ID>
UserId: ...
Arn: arn:aws:sts::<ACCOUNT_ID>:assumed-role/AWSAdministratorAccess/...
```

### 2. Apply Terraform Configuration

```bash
cd terraform

# Validate
AWS_PROFILE=dev-sso terraform validate

# Plan
AWS_PROFILE=dev-sso terraform plan

# Apply
AWS_PROFILE=dev-sso terraform apply -auto-approve
```

This will take ~3-5 minutes to provision all resources.

### 3. Get Application Endpoint

After apply completes, get the ALB DNS name:

```bash
AWS_PROFILE=dev-sso terraform output alb_dns_name
```

Your application will be available at: `http://{ALB_DNS_NAME}`

### 4. Build & Push Docker Image to ECR

```bash
# Get ECR repository URL
AWS_PROFILE=dev-sso terraform output ecr_repository_url

# Login to ECR
aws ecr get-login-password --region us-east-1 --profile dev-sso | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build Docker image
docker build -t svg-to-png:latest .

# Tag image
docker tag svg-to-png:latest <ACCOUNT_ID><ECR_IMAGE>

# Push to ECR
docker push <ACCOUNT_ID><ECR_IMAGE>

# Update ECS service with new image
AWS_PROFILE=dev-sso aws ecs update-service \
  --cluster svg-to-png-cluster \
  --service svg-to-png-service \
  --force-new-deployment
```

### 5. Monitor Deployment

```bash
# Watch ECS tasks
AWS_PROFILE=dev-sso aws ecs list-tasks --cluster svg-to-png-cluster

# Check service status
AWS_PROFILE=dev-sso aws ecs describe-services \
  --cluster svg-to-png-cluster \
  --services svg-to-png-service

# View logs
AWS_PROFILE=dev-sso aws logs tail /ecs/svg-to-png --follow
```

## 📊 Monitoring & Debugging

### CloudWatch Logs
```bash
# Real-time logs
AWS_PROFILE=dev-sso aws logs tail /ecs/svg-to-png --follow

# Errors only
AWS_PROFILE=dev-sso aws logs filter-log-events \
  --log-group-name /ecs/svg-to-png \
  --filter-pattern "ERROR"
```

### ECS Health Checks
```bash
# Get target health
AWS_PROFILE=dev-sso aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -json | jq -r '.alb_target_group_arn.value')
```

### Auto Scaling
```bash
# Check scaling policies
AWS_PROFILE=dev-sso aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs
```

## 🔐 Security Best Practices

✅ Implemented:
- VPC with private subnets for ECS tasks
- NAT Gateway for outbound traffic
- Security groups with least privilege
- S3 encryption + versioning
- DynamoDB point-in-time recovery
- ECR image scanning
- IAM roles with least privilege
- CloudWatch Logs encryption

## 💰 Cost Optimization

To reduce costs:

1. **Use Fargate Spot** (save ~70%):
   ```hcl
   # In terraform/ecs.tf, update capacity_providers:
   capacity_providers = ["FARGATE_SPOT"]
   ```

2. **Reduce desired count**:
   ```hcl
   desired_count = 1  # In terraform.tfvars
   ```

3. **Shorter log retention**:
   ```hcl
   retention_in_days = 7  # In terraform/ecs.tf
   ```

## 🧹 Cleanup

To destroy all AWS resources:

```bash
AWS_PROFILE=dev-sso terraform destroy
```

Note: S3 bucket and DynamoDB table (bootstrap) will remain. Delete manually if needed:

```bash
aws s3 rb s3://svg-to-png-terraform-state-<ACCOUNT_ID> --profile dev-sso
aws dynamodb delete-table --table-name terraform-locks --profile dev-sso --region us-east-1
```

## 📝 Useful AWS CLI Commands

```bash
# List all resources
AWS_PROFILE=dev-sso aws ec2 describe-resources

# Get VPC details
AWS_PROFILE=dev-sso aws ec2 describe-vpcs --filters "Name=tag:Project,Values=svg-to-png"

# Monitor ALB
AWS_PROFILE=dev-sso aws elbv2 describe-load-balancers

# Check ECR images
AWS_PROFILE=dev-sso aws ecr describe-images --repository-name svg-to-png

# Cost estimation
AWS_PROFILE=dev-sso aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-12-31 --granularity MONTHLY --metrics "BlendedCost"
```

## ⚠️ Troubleshooting

### "The pending authorization to retrieve an SSO token has expired"
Re-login:
```bash
aws sso login --profile dev-sso
```

### Terraform state locked
If Terraform is stuck:
```bash
AWS_PROFILE=dev-sso aws dynamodb delete-item \
  --table-name terraform-locks \
  --key '{"LockID":{"S":"prod/terraform.tfstate"}}'
```

### ECS tasks not starting
```bash
# Check task definition
AWS_PROFILE=dev-sso aws ecs describe-task-definition \
  --task-definition svg-to-png

# Check stopped tasks
AWS_PROFILE=dev-sso aws ecs describe-tasks \
  --cluster svg-to-png-cluster \
  --tasks $(aws ecs list-tasks --cluster svg-to-png-cluster --desired-status STOPPED --query 'taskArns[0]')
```

## 📚 Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/latest/userguide/)
