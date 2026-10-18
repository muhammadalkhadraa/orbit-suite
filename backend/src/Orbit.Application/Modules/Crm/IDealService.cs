using System;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Common;
using Orbit.Application.Modules.Crm.Dtos;

namespace Orbit.Application.Modules.Crm;

public interface IDealService
{
    Task<PagedResponse<DealDto>> GetDealsAsync(DealFilterRequest filter, CancellationToken cancellationToken = default);
    Task<DealDto> GetDealByIdAsync(Guid dealId, CancellationToken cancellationToken = default);
    Task<DealDto> CreateDealAsync(CreateDealRequest request, CancellationToken cancellationToken = default);
    Task<DealDto> UpdateDealAsync(Guid dealId, UpdateDealRequest request, CancellationToken cancellationToken = default);
    Task<DealDto> UpdateDealStageAsync(Guid dealId, UpdateDealStageRequest request, CancellationToken cancellationToken = default);
    Task DeleteDealAsync(Guid dealId, CancellationToken cancellationToken = default);
    Task<DealMetricsDto> GetDealMetricsAsync(CancellationToken cancellationToken = default);
}
