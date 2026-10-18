using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Modules.Manufacturing;
using Orbit.Application.Modules.Manufacturing.Dtos;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/manufacturing")]
public class ManufacturingController : ControllerBase
{
    private readonly IManufacturingService _manufacturingService;

    public ManufacturingController(IManufacturingService manufacturingService)
    {
        _manufacturingService = manufacturingService;
    }

    [HttpGet("work-orders")]
    public async Task<ActionResult<ApiResponse<PagedResponse<WorkOrderDto>>>> GetWorkOrders(
        [FromQuery] WorkOrderFilterRequest filter,
        CancellationToken cancellationToken)
    {
        var result = await _manufacturingService.GetWorkOrdersAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResponse<WorkOrderDto>>.Ok(result));
    }

    [HttpGet("work-orders/{id}")]
    public async Task<ActionResult<ApiResponse<WorkOrderDto>>> GetWorkOrderById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _manufacturingService.GetWorkOrderByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<WorkOrderDto>.Ok(result));
    }

    [HttpPost("work-orders")]
    public async Task<ActionResult<ApiResponse<WorkOrderDto>>> CreateWorkOrder(
        [FromBody] CreateWorkOrderRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _manufacturingService.CreateWorkOrderAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetWorkOrderById), new { id = result.Id }, ApiResponse<WorkOrderDto>.Ok(result, "Work order created successfully."));
    }

    [HttpPut("work-orders/{id}")]
    public async Task<ActionResult<ApiResponse<WorkOrderDto>>> UpdateWorkOrder(
        Guid id,
        [FromBody] UpdateWorkOrderRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _manufacturingService.UpdateWorkOrderAsync(id, request, cancellationToken);
        return Ok(ApiResponse<WorkOrderDto>.Ok(result, "Work order updated successfully."));
    }

    [HttpPatch("work-orders/{id}/status")]
    public async Task<ActionResult<ApiResponse<WorkOrderDto>>> UpdateWorkOrderStatus(
        Guid id,
        [FromBody] UpdateWorkOrderStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _manufacturingService.UpdateWorkOrderStatusAsync(id, request, cancellationToken);
        return Ok(ApiResponse<WorkOrderDto>.Ok(result, "Work order status transitioned successfully."));
    }

    [HttpDelete("work-orders/{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteWorkOrder(Guid id, CancellationToken cancellationToken)
    {
        await _manufacturingService.DeleteWorkOrderAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null, "Work order deleted successfully."));
    }

    [HttpGet("boms")]
    public async Task<ActionResult<ApiResponse<List<BillOfMaterialsDto>>>> GetBillsOfMaterials(CancellationToken cancellationToken)
    {
        var result = await _manufacturingService.GetBillsOfMaterialsAsync(cancellationToken);
        return Ok(ApiResponse<List<BillOfMaterialsDto>>.Ok(result));
    }

    [HttpGet("boms/{id}")]
    public async Task<ActionResult<ApiResponse<BillOfMaterialsDto>>> GetBomById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _manufacturingService.GetBomByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<BillOfMaterialsDto>.Ok(result));
    }

    [HttpPost("boms")]
    public async Task<ActionResult<ApiResponse<BillOfMaterialsDto>>> CreateBom(
        [FromBody] CreateBomRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _manufacturingService.CreateBomAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetBomById), new { id = result.Id }, ApiResponse<BillOfMaterialsDto>.Ok(result, "Bill of Materials created successfully."));
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<ApiResponse<ManufacturingMetricsDto>>> GetMetrics(CancellationToken cancellationToken)
    {
        var result = await _manufacturingService.GetManufacturingMetricsAsync(cancellationToken);
        return Ok(ApiResponse<ManufacturingMetricsDto>.Ok(result));
    }
}
