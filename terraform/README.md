# Terraform Configuration Files

## Structure

```text
terraform/
├── main.tf           # Provider configuration
├── variables.tf      # Input variables
├── outputs.tf        # Output values
├── networking.tf     # VPC, subnets, and VPC endpoints
├── load_balancer.tf  # ALB and target groups
├── ecs.tf           # ECS cluster, service, task definition
├── ecr.tf           # ECR repository and lifecycle policy
├── terraform.tfvars # Variables (gitignored)
└── bootstrap/
   └── main.tf      # S3 state bucket
```

## How to Use

### First Time Setup

1. **Bootstrap Terraform State**

   ```bash
   cd terraform/bootstrap
   terraform init
   terraform apply
   ```

2. **Verify the backend config in terraform/main.tf**
   - Confirm the S3 bucket matches the name created by bootstrap

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
- `ecs_scheduled_scaling_enabled`: Enable weekday ECS scheduled scaling (default: `true`)
- `ecs_schedule_timezone`: IANA timezone for scheduled actions (default: `Asia/Ho_Chi_Minh`)
- `ecs_scale_up_schedule` / `ecs_scale_down_schedule`: AWS cron expressions (default: 14:00 / 17:00, Monday–Friday)
- `ecs_active_min_capacity`: Minimum number of tasks during scheduled hours (default: `1`; autoscaling maximum remains `4`)
- `interface_endpoint_services`: Interface endpoints created in each private subnet AZ (defaults to `ecr.api`, `ecr.dkr`, and `logs`). Add only services the workload uses, such as `secretsmanager`, `ssm`, `sqs`, or `sns`.

## ECS Scheduled Scaling

By default, the ECS service scales to at least one task at 14:00 and to zero at 17:00, Monday through Friday, in `Asia/Ho_Chi_Minh`. CPU and memory target tracking can scale the service up to four tasks while it is active. The weekday scale-down schedule leaves it at zero through the weekend. Terraform ignores ECS `desired_count` drift so it does not undo changes made by Application Auto Scaling.

To disable the schedule, set `ecs_scheduled_scaling_enabled = false`. Customize the timezone, AWS cron expressions, or active minimum capacity with the variables above. Scheduled actions run at their next scheduled time after being created or changed; applying Terraform does not immediately reconcile the service to the current time window.

## State Locking

Terraform state is stored in S3 and locked with the S3-native `.tflock` file (`use_lockfile = true`). The root configuration requires Terraform 1.10 or later. The AWS role needs `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` access to the state lock file. The legacy DynamoDB lock table has been removed.

## Private Subnet Egress and Cost

Private subnets use S3 and DynamoDB gateway endpoints, which have no hourly endpoint charge. Interface endpoints for ECR API, ECR Docker, and CloudWatch Logs are created in both private subnet AZs so ECS tasks use endpoints in their own AZ. Interface endpoints are billed per endpoint AZ and may also have data processing charges; each additional service in `interface_endpoint_services` adds one endpoint in each AZ.

NAT gateways and their Elastic IPs are not created. ECS tasks can reach the configured AWS endpoints, but they cannot access arbitrary public internet destinations. If the application needs public internet egress, use an explicit egress design and include its cost in the deployment plan.

## Outputs

After `terraform apply`, you'll get:

- `alb_dns_name`: Load balancer DNS
- `ecr_repository_url`: ECR repository URL
- `ecs_cluster_name`: ECS cluster name
- `ecs_service_name`: ECS service name

Access your application via the ALB DNS name.
