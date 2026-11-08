# AWS CI/CD Infrastructure with Terraform

Tài liệu này mô tả cách thiết lập và triển khai SVG-to-PNG converter trên AWS sử dụng Terraform và GitHub Actions.

## Architecture Overview

```
GitHub Actions → ECR → ECS (Fargate)
                    ↓
                 ALB → CloudWatch Logs
```

### Các thành phần AWS:

- **ECR (Elastic Container Registry)**: Lưu trữ Docker images
- **ECS (Elastic Container Service)**: Chạy containers trên Fargate
- **ALB (Application Load Balancer)**: Phân phối traffic
- **VPC/Networking**: Private subnets cho ECS tasks, public subnets cho ALB
- **CloudWatch**: Logging và monitoring
- **Auto Scaling**: Tự động scale dựa trên CPU/Memory

## Prerequisites

- AWS Account với quyền IAM cần thiết
- Terraform >= 1.0
- Docker (để build images locally)
- Git
- GitHub repository

## Setup Instructions

### 1. Bootstrap Terraform State (One-time)

Trước tiên, tạo S3 bucket và DynamoDB table để lưu trữ Terraform state:

```bash
cd terraform/bootstrap
terraform init
terraform plan
terraform apply
```

Lưu lại tên S3 bucket và DynamoDB table name để sử dụng ở bước tiếp theo.

### 2. Cấu hình AWS Credentials

Set up AWS credentials trên máy local:

```bash
aws configure
```

Hoặc dùng environment variables:

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

### 3. Cấu hình Terraform Backend

Cập nhật file `terraform/main.tf` với S3 bucket name từ bootstrap:

```hcl
backend "s3" {
  bucket         = "svg-to-png-terraform-state-YOUR_ACCOUNT_ID"
  key            = "prod/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "terraform-locks"
}
```

### 4. Tạo terraform.tfvars

Copy template và chỉnh sửa:

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Chỉnh sửa `terraform/terraform.tfvars`:

```hcl
aws_region       = "us-east-1"
project_name     = "svg-to-png"
environment      = "production"
app_name         = "svg-to-png-converter"
container_port   = 3000
desired_count    = 2
container_image  = "123456789.dkr.ecr.us-east-1.amazonaws.com/svg-to-png:latest"
```

### 5. Initialize Terraform

```bash
cd terraform
terraform init
```

### 6. Review và Apply Terraform Plan

```bash
terraform plan
terraform apply
```

Lưu lại các outputs như ALB DNS name và ECR repository URL.

### 7. Setup GitHub Secrets

Thêm secrets sau vào GitHub repository settings (Settings → Secrets and variables → Actions):

- `AWS_ROLE_TO_ASSUME`: ARN của IAM role cho GitHub Actions (sử dụng OIDC)

Hoặc sử dụng AWS credentials trực tiếp (không khuyến nghị):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### 8. Build và Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t svg-to-png:latest .

# Tag image
docker tag svg-to-png:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/svg-to-png:latest

# Push image
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/svg-to-png:latest
```

## CI/CD Workflow

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

Workflow này tự động chạy khi push hoặc tạo pull request:

#### Jobs:

1. **build**: 
   - Checkout code
   - Setup Node.js
   - Install dependencies
   - Run linter (nếu có)
   - Run tests (nếu có)
   - Build project (nếu có)

2. **terraform-plan** (chỉ khi PR):
   - Configure AWS credentials
   - Initialize Terraform
   - Tạo Terraform plan
   - Comment plan result vào PR

3. **terraform-apply** (chỉ khi push to main):
   - Configure AWS credentials
   - Initialize Terraform
   - Apply Terraform changes

## Monitoring & Logs

### CloudWatch Logs

```bash
# View logs
aws logs tail /ecs/svg-to-png --follow

# Check recent errors
aws logs filter-log-events --log-group-name /ecs/svg-to-png --filter-pattern "ERROR"
```

### ECS Cluster Status

```bash
# List services
aws ecs list-services --cluster svg-to-png-cluster

# Check service status
aws ecs describe-services --cluster svg-to-png-cluster --services svg-to-png-service

# List tasks
aws ecs list-tasks --cluster svg-to-png-cluster --service-name svg-to-png-service

# Check task details
aws ecs describe-tasks --cluster svg-to-png-cluster --tasks <task-arn>
```

## Scaling Configuration

Auto-scaling được cấu hình dựa trên:

- **CPU Utilization**: Target 70%
- **Memory Utilization**: Target 80%
- **Min tasks**: 2
- **Max tasks**: 4

Chỉnh sửa trong file `terraform/ecs.tf`:

```hcl
resource "aws_appautoscaling_policy" "ecs_policy_cpu" {
  # ...
  target_value = 70.0  # Thay đổi giá trị này
}
```

## Troubleshooting

### ECS Tasks không khởi động

```bash
# Check task logs
aws ecs describe-tasks --cluster svg-to-png-cluster --tasks <task-arn>

# View container logs
aws logs tail /ecs/svg-to-png --follow
```

### ALB health check failed

1. Kiểm tra security group rules
2. Kiểm tra application logs
3. Verify container port trong task definition

### Terraform state lock

Nếu Terraform state bị lock:

```bash
aws dynamodb delete-item \
  --table-name terraform-locks \
  --key '{"LockID":{"S":"prod/terraform.tfstate"}}'
```

## Clean up

Để xóa tất cả resources:

```bash
cd terraform
terraform destroy
```

## Cost Optimization

1. **Fargate Spot Instances**: Sử dụng FARGATE_SPOT để tiết kiệm ~70%
2. **Reserved Capacity**: Sử dụng Capacity Providers
3. **ECR Lifecycle Policy**: Tự động xóa old images
4. **CloudWatch Logs**: Retention = 30 days

## Security Best Practices

- ✅ VPC với private subnets cho ECS tasks
- ✅ NAT Gateway cho outbound traffic
- ✅ Security groups với least privilege
- ✅ S3 encryption cho Terraform state
- ✅ DynamoDB point-in-time recovery
- ✅ Container image scanning
- ✅ IAM roles với least privilege
- ✅ CloudWatch Logs encryption

## Useful Commands

```bash
# View infrastructure status
terraform state list

# Refresh state
terraform refresh

# Destroy specific resource
terraform destroy -target=aws_ecs_service.main

# Format Terraform files
terraform fmt -recursive

# Validate Terraform configuration
terraform validate

# Check Terraform plan JSON output
terraform plan -json

# Apply specific target
terraform apply -target=aws_ecs_task_definition.main
```

## References

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [GitHub Actions](https://docs.github.com/en/actions)
