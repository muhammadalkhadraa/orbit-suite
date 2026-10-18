using System;
using Orbit.Domain.Enums;

namespace Orbit.Application.Modules.Crm.Dtos;

public class DealDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Title { get; set; } = string.Empty;

    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;

    public Guid? AssignedEmployeeId { get; set; }
    public string? AssignedEmployeeName { get; set; }

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";

    public DealStage Stage { get; set; }
    public string StageName => Stage.ToString();
    public int Probability { get; set; }

    public DateTime? ExpectedCloseDateUtc { get; set; }
    public DateTime? ClosedAtUtc { get; set; }

    public string? LostReason { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class CreateDealRequest
{
    public string Title { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public DealStage Stage { get; set; } = DealStage.Lead;
    public int? Probability { get; set; }
    public DateTime? ExpectedCloseDateUtc { get; set; }
    public string? Notes { get; set; }
}

public class UpdateDealRequest
{
    public string Title { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public DealStage Stage { get; set; }
    public int Probability { get; set; }
    public DateTime? ExpectedCloseDateUtc { get; set; }
    public string? LostReason { get; set; }
    public string? Notes { get; set; }
}

public class UpdateDealStageRequest
{
    public DealStage Stage { get; set; }
    public int? Probability { get; set; }
    public string? LostReason { get; set; }
}

public class DealFilterRequest
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public Guid? CustomerId { get; set; }
    public Guid? AssignedEmployeeId { get; set; }
    public DealStage? Stage { get; set; }
    public string? Search { get; set; }
}

public class DealMetricsDto
{
    public decimal TotalPipelineValue { get; set; }
    public decimal WeightedPipelineValue { get; set; }
    public decimal WonValue { get; set; }
    public decimal LostValue { get; set; }
    public int OpenDealsCount { get; set; }
    public int WonDealsCount { get; set; }
    public int LostDealsCount { get; set; }
    public int TotalDealsCount { get; set; }
    public double WinRatePercentage { get; set; }
}
