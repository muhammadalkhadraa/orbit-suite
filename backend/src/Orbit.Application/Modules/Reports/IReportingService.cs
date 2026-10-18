using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Modules.Reports.Dtos;

namespace Orbit.Application.Modules.Reports;

public interface IReportingService
{
    Task<ExecutiveDashboardDto> GetExecutiveOverviewAsync(DateTime? fromDateUtc, DateTime? toDateUtc, CancellationToken cancellationToken = default);
    Task<ReportExportDto> ExportReportAsync(ReportExportRequest request, CancellationToken cancellationToken = default);
    Task<List<ReportExportHistoryDto>> GetExportHistoryAsync(CancellationToken cancellationToken = default);
}
