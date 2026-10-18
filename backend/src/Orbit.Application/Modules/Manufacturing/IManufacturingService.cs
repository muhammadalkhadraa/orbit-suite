using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Common;
using Orbit.Application.Modules.Manufacturing.Dtos;

namespace Orbit.Application.Modules.Manufacturing;

public interface IManufacturingService
{
    Task<PagedResponse<WorkOrderDto>> GetWorkOrdersAsync(WorkOrderFilterRequest filter, CancellationToken cancellationToken = default);
    Task<WorkOrderDto> GetWorkOrderByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<WorkOrderDto> CreateWorkOrderAsync(CreateWorkOrderRequest request, CancellationToken cancellationToken = default);
    Task<WorkOrderDto> UpdateWorkOrderAsync(Guid id, UpdateWorkOrderRequest request, CancellationToken cancellationToken = default);
    Task<WorkOrderDto> UpdateWorkOrderStatusAsync(Guid id, UpdateWorkOrderStatusRequest request, CancellationToken cancellationToken = default);
    Task DeleteWorkOrderAsync(Guid id, CancellationToken cancellationToken = default);

    Task<List<BillOfMaterialsDto>> GetBillsOfMaterialsAsync(CancellationToken cancellationToken = default);
    Task<BillOfMaterialsDto> GetBomByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<BillOfMaterialsDto> CreateBomAsync(CreateBomRequest request, CancellationToken cancellationToken = default);

    Task<ManufacturingMetricsDto> GetManufacturingMetricsAsync(CancellationToken cancellationToken = default);
}
