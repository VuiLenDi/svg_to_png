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
- Terraform >= 1.10.0
- Docker (để build images locally)
- Git
- GitHub repository

## Setup Instructions

### 1. Bootstrap Terraform State (One-time)

Trước tiên, tạo S3 bucket để lưu Terraform state:

```bash
cd terraform/bootstrap
terraform init
terraform plan
terraform apply
```

Lưu lại tên S3 bucket để cấu hình backend. Backend sử dụng S3-native lockfile; bảng DynamoDB lock đã được xóa.

### 2. Cấu hình AWS Credentials

Đăng nhập AWS SSO và dùng profile cho các lệnh Terraform chạy local:

```bash
aws sso login --profile dev-sso
export AWS_PROFILE=dev-sso
```

GitHub Actions dùng credentials tạm thời qua OIDC, không dùng profile local hay access key tĩnh.

### 3. Cấu hình Terraform Backend

Cập nhật file `terraform/main.tf` với S3 bucket name từ bootstrap:

```hcl
backend "s3" {
   bucket       = "svg-to-png-terraform-state-YOUR_ACCOUNT_ID"
   key          = "prod/terraform.tfstate"
   region       = "us-east-1"
   encrypt      = true
   use_lockfile = true
}
```

S3 lockfile requires Terraform 1.10 or later. The backend role must be able to read, write, and delete the `.tflock` object next to the state file.

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
container_image  = "123456789<ECR_IMAGE>"
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

- `AWS_TF_PLAN_ROLE_TO_ASSUME`: ARN của IAM role chỉ dùng cho Terraform plan trên PR nội bộ
- `AWS_TF_APPLY_ROLE_TO_ASSUME`: ARN của IAM role triển khai qua GitHub Environment `production`

Thêm repository variables `TF_CONTAINER_IMAGE` và `ACM_CERTIFICATE_ARN`; workflow ánh xạ chúng sang Terraform variables và dừng nếu thiếu. Không tạo AWS access key tĩnh.

### 8. Build và Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t svg-to-png:latest .

# Tag image
docker tag svg-to-png:latest YOUR_ACCOUNT_ID<ECR_IMAGE>

# Push image
docker push YOUR_ACCOUNT_ID<ECR_IMAGE>
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

Job plan bỏ qua pull request từ fork. Job apply dùng GitHub Environment `production`; giới hạn environment này chỉ cho branch `main` và bật reviewer approval.

## GitHub OIDC IAM Setup

### 1. Add the IAM OIDC provider

Trong AWS IAM → Identity providers, tạo provider nếu chưa có:

- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

### 2. Create separate plan and apply roles

Tạo hai role kiểu **Web identity**. Dùng ARN provider `arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com` trong `Principal.Federated`; thay `<OWNER>/<REPO>` bằng owner/repository GitHub.

Trust policy cho role plan:

```json
{
   "Version": "2012-10-17",
   "Statement": [{
      "Effect": "Allow",
      "Principal": {"Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"},
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {"StringEquals": {
         "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
         "token.actions.githubusercontent.com:sub": "repo:<OWNER>/<REPO>:pull_request"
      }}
   }]
}
```

Trust policy cho role apply dùng GitHub Environment:

```json
{
   "Version": "2012-10-17",
   "Statement": [{
      "Effect": "Allow",
      "Principal": {"Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"},
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {"StringEquals": {
         "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
         "token.actions.githubusercontent.com:sub": "repo:<OWNER>/<REPO>:environment:production"
      }}
   }]
}
```

Repos tạo từ 15/07/2026 hoặc đã bật immutable subject dùng format `repo:<OWNER>@<OWNER_ID>/<REPO>@<REPO_ID>:pull_request` và `repo:<OWNER>@<OWNER_ID>/<REPO>@<REPO_ID>:environment:production`. Trust policy phải khớp subject format của repo.

### 3. Attach permissions

Attach policy S3 này cho cả hai role, thay `<ACCOUNT_ID>`:

```json
{
   "Version": "2012-10-17",
   "Statement": [
      {
         "Effect": "Allow",
         "Action": "s3:ListBucket",
         "Resource": "arn:aws:s3:::svg-to-png-terraform-state-<ACCOUNT_ID>",
         "Condition": {"StringLike": {"s3:prefix": "prod/terraform.tfstate*"}}
      },
      {
         "Effect": "Allow",
         "Action": ["s3:GetObject", "s3:PutObject"],
         "Resource": "arn:aws:s3:::svg-to-png-terraform-state-<ACCOUNT_ID>/prod/terraform.tfstate"
      },
      {
         "Effect": "Allow",
         "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::svg-to-png-terraform-state-<ACCOUNT_ID>/prod/terraform.tfstate.tflock"
      }
   ]
}
```

Role plan cần thêm quyền đọc/describe/list cho các tài nguyên EC2/VPC, ECR, ECS, ELB, IAM, CloudWatch Logs và Application Auto Scaling. Role apply cần quyền create/update/delete cho các dịch vụ Terraform đang quản lý và `iam:PassRole` chỉ cho hai ECS task roles, với điều kiện `iam:PassedToService = ecs-tasks.amazonaws.com`. Giới hạn resource ARN theo project; không gắn `AdministratorAccess`.

### 4. Configure GitHub

Role plan có thể đọc Terraform state và workflow đăng nội dung plan lên PR. Chỉ cấp quyền tạo PR cho contributor đáng tin cậy, không lưu secret trong state, và không bật role plan cho fork PR.

Trong repository Settings → Environments, tạo `production`, chỉ cho phép deployment từ `main` và bật reviewer approval. Trong Settings → Secrets and variables → Actions:

- Repository secrets: `AWS_TF_PLAN_ROLE_TO_ASSUME`, `AWS_TF_APPLY_ROLE_TO_ASSUME`
- Repository variables: `TF_CONTAINER_IMAGE`, `ACM_CERTIFICATE_ARN`

Sau khi workflow chạy thành công, xóa secret cũ `AWS_ROLE_TO_ASSUME`.

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
terraform force-unlock <LOCK_ID>
```

Chỉ force-unlock sau khi xác nhận không còn lần chạy Terraform nào đang hoạt động.

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
- ✅ S3-native state locking with Terraform 1.10+
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
