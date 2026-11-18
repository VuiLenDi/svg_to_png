variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "svg-to-png"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "svg-to-png-converter"
}

variable "container_port" {
  description = "Container port"
  type        = number
  default     = 3000
}

variable "container_image" {
  description = "Docker image URI (pass via TF_VAR_container_image or CI/CD)"
  type        = string
  default     = ""
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 2
}

variable "ecs_scheduled_scaling_enabled" {
  description = "Enable weekday ECS scheduled scaling to zero outside the configured hours"
  type        = bool
  default     = true
}

variable "ecs_schedule_timezone" {
  description = "IANA timezone used by ECS scheduled scaling actions"
  type        = string
  default     = "Asia/Ho_Chi_Minh"
}

variable "ecs_scale_up_schedule" {
  description = "AWS cron expression for scaling ECS up"
  type        = string
  default     = "cron(0 14 ? * MON-FRI *)"
}

variable "ecs_scale_down_schedule" {
  description = "AWS cron expression for scaling ECS down"
  type        = string
  default     = "cron(0 17 ? * MON-FRI *)"
}

variable "ecs_active_min_capacity" {
  description = "Minimum ECS task count during scheduled working hours"
  type        = number
  default     = 1

  validation {
    condition     = var.ecs_active_min_capacity >= 1 && var.ecs_active_min_capacity <= 4
    error_message = "ecs_active_min_capacity must be between 1 and 4."
  }
}

variable "interface_endpoint_services" {
  description = "AWS interface endpoint services to create in every private subnet AZ"
  type        = set(string)
  default     = ["ecr.api", "ecr.dkr", "logs"]
}

variable "domain_name" {
  description = "Custom domain name for the application"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS (pass via TF_VAR_acm_certificate_arn or CI/CD)"
  type        = string
  default     = ""
}
