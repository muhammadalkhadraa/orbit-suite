using System;
using System.Collections.Generic;
using Orbit.Domain.Enums;

namespace Orbit.Application.Modules.Reports.Dtos;

public class ExecutiveDashboardDto
{
    public ExecutiveFinancialSummary Financial { get; set; } = new();
    public ExecutiveSalesSummary Sales { get; set; } = new();
    public ExecutiveSupportSummary Support { get; set; } = new();
    public ExecutiveInventorySummary Inventory { get; set; } = new();
    public ExecutiveManufacturingSummary Manufacturing { get; set; } = new();
    public ExecutiveWorkforceSummary Workforce { get; set; } = new();

    public List<MonthlyFinancialTrendItem> RevenueTrend { get; set; } = new();
    public List<SalesStageFunnelItem> PipelineFunnel { get; set; } = new();
    public List<DepartmentDistributionItem> DepartmentDistribution { get; set; } = new();
    public List<CategoryInventoryDistributionItem> InventoryDistribution { get; set; } = new();
}

public class ExecutiveFinancialSummary
{
    public decimal TotalInvoiced { get; set; }
    public decimal TotalCollected { get; set; }
    public decimal OutstandingAr { get; set; }
    public decimal OverdueAr { get; set; }
    public decimal CollectionRate { get; set; }
    public int InvoiceCount { get; set; }
}

public class ExecutiveSalesSummary
{
    public decimal TotalPipelineValue { get; set; }
    public decimal WeightedPipelineValue { get; set; }
    public decimal WonRevenue { get; set; }
    public decimal WinRatePercent { get; set; }
    public int ActiveDealsCount { get; set; }
}

public class ExecutiveSupportSummary
{
    public int TotalTickets { get; set; }
    public int OpenTickets { get; set; }
    public int ResolvedTickets { get; set; }
    public int UrgentTickets { get; set; }
    public decimal ResolutionRatePercent { get; set; }
}

public class ExecutiveInventorySummary
{
    public decimal TotalValuation { get; set; }
    public int TotalSkus { get; set; }
    public decimal TotalUnitsOnHand { get; set; }
    public int LowStockCount { get; set; }
}

public class ExecutiveManufacturingSummary
{
    public int TotalWorkOrders { get; set; }
    public int ActiveWorkOrders { get; set; }
    public int CompletedWorkOrders { get; set; }
    public decimal TotalUnitsTarget { get; set; }
    public decimal TotalUnitsProduced { get; set; }
    public decimal ProductionYieldRatePercent { get; set; }
}

public class ExecutiveWorkforceSummary
{
    public int TotalEmployees { get; set; }
    public int PresentToday { get; set; }
    public decimal AttendanceRatePercent { get; set; }
    public int OnLeaveToday { get; set; }
    public int PendingLeaveRequests { get; set; }
}

public class MonthlyFinancialTrendItem
{
    public string Month { get; set; } = string.Empty;
    public decimal Invoiced { get; set; }
    public decimal Collected { get; set; }
}

public class SalesStageFunnelItem
{
    public string Stage { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal TotalValue { get; set; }
}

public class DepartmentDistributionItem
{
    public string DepartmentName { get; set; } = string.Empty;
    public int EmployeeCount { get; set; }
}

public class CategoryInventoryDistributionItem
{
    public string Category { get; set; } = string.Empty;
    public int SkuCount { get; set; }
    public decimal Valuation { get; set; }
}

public class ReportExportRequest
{
    public ReportType ReportType { get; set; } = ReportType.ExecutiveOverview;
    public ExportFormat Format { get; set; } = ExportFormat.Csv;
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
}

public class ReportExportDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public ReportType ReportType { get; set; }
    public ExportFormat Format { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int RecordCount { get; set; }
    public decimal FileSizeKb { get; set; }
    public DateTime GeneratedAtUtc { get; set; }
}

public class ReportExportHistoryDto
{
    public Guid Id { get; set; }
    public ReportType ReportType { get; set; }
    public string Title { get; set; } = string.Empty;
    public ExportFormat Format { get; set; }
    public string? GeneratedByEmployeeName { get; set; }
    public int RecordCount { get; set; }
    public decimal FileSizeKb { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
