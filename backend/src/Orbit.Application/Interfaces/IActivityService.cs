using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Modules.Hr.Dtos;

namespace Orbit.Application.Interfaces;

public interface IActivityService
{
    Task<UserActivityStatusDto> ExecuteActionAsync(ActivityActionRequest request, CancellationToken cancellationToken = default);
    Task<UserActivityStatusDto> GetMyStatusAsync(CancellationToken cancellationToken = default);
    Task<List<LiveEmployeeActivityDto>> GetMyHistoryAsync(int days = 30, CancellationToken cancellationToken = default);
    Task<LiveMonitorResponse> GetLiveMonitorAsync(CancellationToken cancellationToken = default);
    Task<ActivityReportResponse> GetActivityReportAsync(ActivityReportFilter filter, CancellationToken cancellationToken = default);
    Task HeartbeatAsync(CancellationToken cancellationToken = default);
}
