# Terraform Configuration Files

## Structure

```
terraform/
├── main.tf           # Provider configuration
├── variables.tf      # Input variables
├── outputs.tf        # Output values
├── networking.tf     # VPC, subnets, NAT gateway
├── load_balancer.tf  # ALB and target groups
├── ecs.tf           # ECS cluster, service, task definition
├── ecr.tf           # ECR repository and lifecycle policy
├── terraform.tfvars # Variables (gitignored)
└── bootstrap/
    └── main.tf      # S3 and DynamoDB for state management
```

## How to Use

### First Time Setup

1. **Bootstrap Terraform State**
   ```bash
   cd terraform/bootstrap
   terraform init
   terraform apply
   ```

2. **Update backend config in terraform/main.tf**
   - Replace S3 bucket name with the one created by bootstrap

3. **Initialize Terraform**
   ```bash
   cd ../
   terraform init
   ```

4. **Create terraform.tfvars**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit with your values
   ```

5. **Plan and Apply**
   ```bash
   terraform plan
   terraform apply
   ```

### Ongoing Operations

```bash
# Check current state
terraform state list
terraform state show aws_ecs_service.main

# Update specific resources
terraform apply -target=aws_ecs_service.main

# Destroy resources
terraform destroy

# Refresh state
terraform refresh

# Format code
terraform fmt -recursive

# Validate configuration
terraform validate
```

## Important Variables

- `aws_region`: AWS region (default: us-east-1)
- `container_image`: Docker image URI from ECR (required)
- `desired_count`: Number of ECS tasks (default: 2)
- `container_port`: Application port (default: 3000)

## Outputs

After `terraform apply`, you'll get:

- `alb_dns_name`: Load balancer DNS
- `ecr_repository_url`: ECR repository URL
- `ecs_cluster_name`: ECS cluster name
- `ecs_service_name`: ECS service name

Access your application via the ALB DNS name.
