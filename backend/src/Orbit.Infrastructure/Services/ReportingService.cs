using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Reports;
using Orbit.Application.Modules.Reports.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;

namespace Orbit.Infrastructure.Services;

public class ReportingService : IReportingService
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public ReportingService(
        IApplicationDbContext context,
        ITenantContext tenantContext,
        ICurrentUserService currentUserService,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserService = currentUserService;
        _auditService = auditService;
    }

    public async Task<ExecutiveDashboardDto> GetExecutiveOverviewAsync(
        DateTime? fromDateUtc,
        DateTime? toDateUtc,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;

        // 1. Financial Analytics
        var invoices = await _context.Invoices
            .Where(i => i.Status != InvoiceStatus.Void)
            .ToListAsync(cancellationToken);

        var totalInvoiced = invoices.Sum(i => i.TotalAmount);
        var totalCollected = invoices.Sum(i => i.AmountPaid);
        var outstandingAr = invoices.Sum(i => i.BalanceDue);
        var overdueAr = invoices
            .Where(i => i.DueDateUtc < now && i.BalanceDue > 0)
            .Sum(i => i.BalanceDue);
        var collectionRate = totalInvoiced > 0
            ? Math.Round((totalCollected / totalInvoiced) * 100m, 1)
            : 0m;

        // 2. Sales Pipeline Analytics
        var deals = await _context.Deals.ToListAsync(cancellationToken);
        var openDeals = deals.Where(d => d.Stage != DealStage.ClosedWon && d.Stage != DealStage.ClosedLost).ToList();
        var totalPipeline = openDeals.Sum(d => d.Amount);
        var weightedPipeline = openDeals.Sum(d => d.Amount * (d.Probability / 100m));
        var wonDeals = deals.Where(d => d.Stage == DealStage.ClosedWon).ToList();
        var lostDeals = deals.Where(d => d.Stage == DealStage.ClosedLost).ToList();
        var wonRevenue = wonDeals.Sum(d => d.Amount);
        var closedTotal = wonDeals.Count + lostDeals.Count;
        var winRate = closedTotal > 0
            ? Math.Round(((decimal)wonDeals.Count / closedTotal) * 100m, 1)
            : 0m;

        // 3. Support & Incident SLA
        var tickets = await _context.SupportTickets.ToListAsync(cancellationToken);
        var totalTickets = tickets.Count;
        var openTickets = tickets.Count(t => t.Status == TicketStatus.Open || t.Status == TicketStatus.Pending);
        var resolvedTickets = tickets.Count(t => t.Status == TicketStatus.Resolved || t.Status == TicketStatus.Closed);
        var urgentTickets = tickets.Count(t => t.Priority == TicketPriority.Urgent && (t.Status == TicketStatus.Open || t.Status == TicketStatus.Pending));
        var resRate = totalTickets > 0
            ? Math.Round(((decimal)resolvedTickets / totalTickets) * 100m, 1)
            : 0m;

        // 4. Multi-Location Inventory
        var products = await _context.Products.Include(p => p.Inventories).ToListAsync(cancellationToken);
        var totalValuation = products.Sum(p => p.Inventories.Sum(inv => inv.QuantityOnHand) * p.UnitCost);
        var totalUnitsOnHand = products.Sum(p => p.Inventories.Sum(inv => inv.QuantityOnHand));
        var lowStockCount = products.Count(p => p.Inventories.Sum(inv => inv.QuantityOnHand) <= p.ReorderLevel);

        // 5. Manufacturing Operations
        var workOrders = await _context.WorkOrders.ToListAsync(cancellationToken);
        var totalOrders = workOrders.Count;
        var activeOrders = workOrders.Count(w => w.Status == WorkOrderStatus.Planned || w.Status == WorkOrderStatus.InProgress);
        var completedOrders = workOrders.Count(w => w.Status == WorkOrderStatus.Completed);
        var targetUnits = workOrders.Sum(w => w.QuantityTarget);
        var producedUnits = workOrders.Sum(w => w.QuantityProduced);
        var yieldRate = targetUnits > 0
            ? Math.Round((producedUnits / targetUnits) * 100m, 1)
            : 0m;

        // 6. Workforce & Attendance
        var totalEmployees = await _context.Employees.CountAsync(e => e.IsActive, cancellationToken);
        var todayAttendance = await _context.AttendanceLogs.Where(a => a.Date == today).ToListAsync(cancellationToken);
        var presentToday = todayAttendance.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late);
        var attRate = totalEmployees > 0
            ? Math.Round(((decimal)presentToday / totalEmployees) * 100m, 1)
            : 0m;
        var onLeaveToday = todayAttendance.Count(a => a.Status == AttendanceStatus.OnLeave);
        var pendingLeaves = await _context.LeaveRequests.CountAsync(r => r.Status == LeaveStatus.Pending, cancellationToken);

        // Breakdowns
        // Monthly trend (last 6 months)
        var monthlyTrend = new List<MonthlyFinancialTrendItem>();
        for (int i = 5; i >= 0; i--)
        {
            var mDate = today.AddMonths(-i);
            var mLabel = mDate.ToString("MMM yyyy", CultureInfo.InvariantCulture);
            var mInv = invoices.Where(x => x.CreatedAtUtc.Year == mDate.Year && x.CreatedAtUtc.Month == mDate.Month).Sum(x => x.TotalAmount);
            var mCol = invoices.Where(x => x.CreatedAtUtc.Year == mDate.Year && x.CreatedAtUtc.Month == mDate.Month).Sum(x => x.AmountPaid);
            monthlyTrend.Add(new MonthlyFinancialTrendItem { Month = mLabel, Invoiced = mInv, Collected = mCol });
        }

        // Sales Stage Funnel
        var funnel = Enum.GetValues<DealStage>()
            .Select(stage => new SalesStageFunnelItem
            {
                Stage = stage.ToString(),
                Count = deals.Count(d => d.Stage == stage),
                TotalValue = deals.Where(d => d.Stage == stage).Sum(d => d.Amount)
            })
            .ToList();

        // Department Distribution
        var deptDistribution = await _context.Departments
            .Include(d => d.Employees)
            .Select(d => new DepartmentDistributionItem
            {
                DepartmentName = d.Name,
                EmployeeCount = d.Employees.Count(e => e.IsActive)
            })
            .ToListAsync(cancellationToken);

        // Inventory Distribution by Category
        var invCategoryDist = products
            .GroupBy(p => p.Category)
            .Select(g => new CategoryInventoryDistributionItem
            {
                Category = g.Key.ToString(),
                SkuCount = g.Count(),
                Valuation = g.Sum(p => p.Inventories.Sum(inv => inv.QuantityOnHand) * p.UnitCost)
            })
            .ToList();

        return new ExecutiveDashboardDto
        {
            Financial = new ExecutiveFinancialSummary
            {
                TotalInvoiced = totalInvoiced,
                TotalCollected = totalCollected,
                OutstandingAr = outstandingAr,
                OverdueAr = overdueAr,
                CollectionRate = collectionRate,
                InvoiceCount = invoices.Count
            },
            Sales = new ExecutiveSalesSummary
            {
                TotalPipelineValue = totalPipeline,
                WeightedPipelineValue = weightedPipeline,
                WonRevenue = wonRevenue,
                WinRatePercent = winRate,
                ActiveDealsCount = openDeals.Count
            },
            Support = new ExecutiveSupportSummary
            {
                TotalTickets = totalTickets,
                OpenTickets = openTickets,
                ResolvedTickets = resolvedTickets,
                UrgentTickets = urgentTickets,
                ResolutionRatePercent = resRate
            },
            Inventory = new ExecutiveInventorySummary
            {
                TotalValuation = totalValuation,
                TotalSkus = products.Count,
                TotalUnitsOnHand = totalUnitsOnHand,
                LowStockCount = lowStockCount
            },
            Manufacturing = new ExecutiveManufacturingSummary
            {
                TotalWorkOrders = totalOrders,
                ActiveWorkOrders = activeOrders,
                CompletedWorkOrders = completedOrders,
                TotalUnitsTarget = targetUnits,
                TotalUnitsProduced = producedUnits,
                ProductionYieldRatePercent = yieldRate
            },
            Workforce = new ExecutiveWorkforceSummary
            {
                TotalEmployees = totalEmployees,
                PresentToday = presentToday,
                AttendanceRatePercent = attRate,
                OnLeaveToday = onLeaveToday,
                PendingLeaveRequests = pendingLeaves
            },
            RevenueTrend = monthlyTrend,
            PipelineFunnel = funnel,
            DepartmentDistribution = deptDistribution,
            InventoryDistribution = invCategoryDist
        };
    }

    public async Task<ReportExportDto> ExportReportAsync(ReportExportRequest request, CancellationToken cancellationToken = default)
    {
        var currentEmployee = await GetCurrentEmployeeAsync(cancellationToken);
        var timestamp = DateTime.UtcNow;
        var dateStamp = timestamp.ToString("yyyyMMdd_HHmmss");

        string title;
        string fileName;
        string content;
        string mimeType;
        int recordCount = 0;

        switch (request.ReportType)
        {
            case ReportType.FinancialSummary:
                title = "Financial Invoices & Receivables Ledger";
                var invoices = await _context.Invoices.Include(i => i.Customer).ToListAsync(cancellationToken);
                recordCount = invoices.Count;

                if (request.Format == ExportFormat.Csv)
                {
                    fileName = $"Invoices_Ledger_{dateStamp}.csv";
                    mimeType = "text/csv";
                    var sb = new StringBuilder();
                    sb.AppendLine("InvoiceNumber,CustomerName,IssueDate,DueDate,TotalAmount,AmountPaid,BalanceDue,Status,Currency");
                    foreach (var inv in invoices)
                    {
                        sb.AppendLine($"\"{inv.InvoiceNumber}\",\"{inv.Customer?.CompanyName}\",{inv.IssueDateUtc:yyyy-MM-dd},{inv.DueDateUtc:yyyy-MM-dd},{inv.TotalAmount:F2},{inv.AmountPaid:F2},{inv.BalanceDue:F2},{inv.Status},\"{inv.Currency}\"");
                    }
                    content = sb.ToString();
                }
                else
                {
                    fileName = $"Invoices_Ledger_{dateStamp}.json";
                    mimeType = "application/json";
                    content = JsonSerializer.Serialize(invoices.Select(i => new
                    {
                        i.InvoiceNumber,
                        Customer = i.Customer?.CompanyName,
                        IssueDate = i.IssueDateUtc,
                        DueDate = i.DueDateUtc,
                        i.TotalAmount,
                        i.AmountPaid,
                        i.BalanceDue,
                        Status = i.Status.ToString(),
                        i.Currency
                    }), new JsonSerializerOptions { WriteIndented = true });
                }
                break;

            case ReportType.SalesPipeline:
                title = "CRM Deals & Opportunities Pipeline Report";
                var deals = await _context.Deals.Include(d => d.Customer).Include(d => d.AssignedEmployee).ToListAsync(cancellationToken);
                recordCount = deals.Count;

                if (request.Format == ExportFormat.Csv)
                {
                    fileName = $"Deals_Pipeline_{dateStamp}.csv";
                    mimeType = "text/csv";
                    var sb = new StringBuilder();
                    sb.AppendLine("Title,Customer,AssignedRepresentative,Amount,Currency,Stage,Probability,ExpectedCloseDate");
                    foreach (var d in deals)
                    {
                        var rep = d.AssignedEmployee != null ? $"{d.AssignedEmployee.FirstName} {d.AssignedEmployee.LastName}".Trim() : "Unassigned";
                        sb.AppendLine($"\"{d.Title}\",\"{d.Customer?.CompanyName}\",\"{rep}\",{d.Amount:F2},\"{d.Currency}\",{d.Stage},{d.Probability}%,{d.ExpectedCloseDateUtc:yyyy-MM-dd}");
                    }
                    content = sb.ToString();
                }
                else
                {
                    fileName = $"Deals_Pipeline_{dateStamp}.json";
                    mimeType = "application/json";
                    content = JsonSerializer.Serialize(deals.Select(d => new
                    {
                        d.Title,
                        Customer = d.Customer?.CompanyName,
                        Representative = d.AssignedEmployee != null ? $"{d.AssignedEmployee.FirstName} {d.AssignedEmployee.LastName}".Trim() : "Unassigned",
                        d.Amount,
                        d.Currency,
                        Stage = d.Stage.ToString(),
                        d.Probability,
                        ExpectedCloseDate = d.ExpectedCloseDateUtc
                    }), new JsonSerializerOptions { WriteIndented = true });
                }
                break;

            case ReportType.InventoryValuation:
                title = "Multi-Location Inventory Valuation & Stock Report";
                var products = await _context.Products.Include(p => p.Inventories).ThenInclude(inv => inv.Branch).ToListAsync(cancellationToken);
                recordCount = products.Count;

                if (request.Format == ExportFormat.Csv)
                {
                    fileName = $"Inventory_Valuation_{dateStamp}.csv";
                    mimeType = "text/csv";
                    var sb = new StringBuilder();
                    sb.AppendLine("SKU,ProductName,Category,UnitCost,UnitPrice,TotalOnHand,Valuation,ReorderLevel");
                    foreach (var p in products)
                    {
                        var onHand = p.Inventories.Sum(i => i.QuantityOnHand);
                        var val = onHand * p.UnitCost;
                        sb.AppendLine($"\"{p.Sku}\",\"{p.Name}\",{p.Category},{p.UnitCost:F2},{p.UnitPrice:F2},{onHand},{val:F2},{p.ReorderLevel}");
                    }
                    content = sb.ToString();
                }
                else
                {
                    fileName = $"Inventory_Valuation_{dateStamp}.json";
                    mimeType = "application/json";
                    content = JsonSerializer.Serialize(products.Select(p => new
                    {
                        p.Sku,
                        p.Name,
                        Category = p.Category.ToString(),
                        p.UnitCost,
                        p.UnitPrice,
                        TotalOnHand = p.Inventories.Sum(i => i.QuantityOnHand),
                        Valuation = p.Inventories.Sum(i => i.QuantityOnHand) * p.UnitCost,
                        p.ReorderLevel
                    }), new JsonSerializerOptions { WriteIndented = true });
                }
                break;

            case ReportType.SupportSla:
                title = "Customer Support & SLA Resolution Incident Log";
                var tickets = await _context.SupportTickets.Include(t => t.Customer).Include(t => t.AssignedEmployee).ToListAsync(cancellationToken);
                recordCount = tickets.Count;

                if (request.Format == ExportFormat.Csv)
                {
                    fileName = $"Support_Tickets_{dateStamp}.csv";
                    mimeType = "text/csv";
                    var sb = new StringBuilder();
                    sb.AppendLine("TicketNumber,Subject,Customer,Priority,Category,Status,CreatedAtUtc,ResolvedAtUtc");
                    foreach (var t in tickets)
                    {
                        sb.AppendLine($"\"{t.TicketNumber}\",\"{t.Subject}\",\"{t.Customer?.CompanyName}\",{t.Priority},{t.Category},{t.Status},{t.CreatedAtUtc:yyyy-MM-dd},{t.ResolvedAtUtc:yyyy-MM-dd}");
                    }
                    content = sb.ToString();
                }
                else
                {
                    fileName = $"Support_Tickets_{dateStamp}.json";
                    mimeType = "application/json";
                    content = JsonSerializer.Serialize(tickets.Select(t => new
                    {
                        t.TicketNumber,
                        t.Subject,
                        Customer = t.Customer?.CompanyName,
                        Priority = t.Priority.ToString(),
                        Category = t.Category.ToString(),
                        Status = t.Status.ToString(),
                        t.CreatedAtUtc,
                        t.ResolvedAtUtc
                    }), new JsonSerializerOptions { WriteIndented = true });
                }
                break;

            case ReportType.WorkforceAttendance:
            default:
                title = "HR Workforce Attendance & Roster Log";
                var attendance = await _context.AttendanceLogs.Include(a => a.Employee).ThenInclude(e => e.Department).ToListAsync(cancellationToken);
                recordCount = attendance.Count;

                if (request.Format == ExportFormat.Csv)
                {
                    fileName = $"Workforce_Attendance_{dateStamp}.csv";
                    mimeType = "text/csv";
                    var sb = new StringBuilder();
                    sb.AppendLine("EmployeeNumber,EmployeeName,Department,Date,CheckInUtc,CheckOutUtc,TotalHours,Status,WorkLocation");
                    foreach (var a in attendance)
                    {
                        var name = a.Employee != null ? $"{a.Employee.FirstName} {a.Employee.LastName}".Trim() : "Unknown";
                        sb.AppendLine($"\"{a.Employee?.EmployeeNumber}\",\"{name}\",\"{a.Employee?.Department?.Name}\",{a.Date:yyyy-MM-dd},{a.CheckInTimeUtc:HH:mm},{a.CheckOutTimeUtc:HH:mm},{a.TotalHours},{a.Status},\"{a.WorkLocation}\"");
                    }
                    content = sb.ToString();
                }
                else
                {
                    fileName = $"Workforce_Attendance_{dateStamp}.json";
                    mimeType = "application/json";
                    content = JsonSerializer.Serialize(attendance.Select(a => new
                    {
                        EmployeeNumber = a.Employee?.EmployeeNumber,
                        EmployeeName = a.Employee != null ? $"{a.Employee.FirstName} {a.Employee.LastName}".Trim() : "Unknown",
                        Department = a.Employee?.Department?.Name,
                        Date = a.Date.ToString("yyyy-MM-dd"),
                        CheckIn = a.CheckInTimeUtc?.ToString("HH:mm"),
                        CheckOut = a.CheckOutTimeUtc?.ToString("HH:mm"),
                        a.TotalHours,
                        Status = a.Status.ToString(),
                        a.WorkLocation
                    }), new JsonSerializerOptions { WriteIndented = true });
                }
                break;
        }

        var bytes = Encoding.UTF8.GetByteCount(content);
        var sizeKb = Math.Round((decimal)bytes / 1024m, 2);

        var history = new ReportExportHistory
        {
            TenantId = _tenantContext.CurrentTenantId ?? Guid.Empty,
            ReportType = request.ReportType,
            Title = title,
            Format = request.Format,
            GeneratedByEmployeeId = currentEmployee?.Id,
            RecordCount = recordCount,
            FileSizeKb = sizeKb,
            ParametersJson = JsonSerializer.Serialize(request)
        };

        _context.ReportExports.Add(history);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("Export", "Report", history.Id.ToString(), $"Exported {request.ReportType} as {request.Format} ({recordCount} records, {sizeKb} KB).", cancellationToken);

        return new ReportExportDto
        {
            Id = history.Id,
            Title = title,
            ReportType = request.ReportType,
            Format = request.Format,
            FileName = fileName,
            MimeType = mimeType,
            Content = content,
            RecordCount = recordCount,
            FileSizeKb = sizeKb,
            GeneratedAtUtc = timestamp
        };
    }

    public async Task<List<ReportExportHistoryDto>> GetExportHistoryAsync(CancellationToken cancellationToken = default)
    {
        return await _context.ReportExports
            .Include(r => r.GeneratedByEmployee)
            .OrderByDescending(r => r.CreatedAtUtc)
            .Take(30)
            .Select(r => new ReportExportHistoryDto
            {
                Id = r.Id,
                ReportType = r.ReportType,
                Title = r.Title,
                Format = r.Format,
                GeneratedByEmployeeName = r.GeneratedByEmployee != null
                    ? $"{r.GeneratedByEmployee.FirstName} {r.GeneratedByEmployee.LastName}".Trim()
                    : null,
                RecordCount = r.RecordCount,
                FileSizeKb = r.FileSizeKb,
                CreatedAtUtc = r.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }

    private async Task<EmployeeProfile?> GetCurrentEmployeeAsync(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userId)) return null;

        return await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == userId, cancellationToken);
    }
}
