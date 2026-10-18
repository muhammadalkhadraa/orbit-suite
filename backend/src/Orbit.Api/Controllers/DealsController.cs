using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Modules.Crm;
using Orbit.Application.Modules.Crm.Dtos;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/deals")]
public class DealsController : ControllerBase
{
    private readonly IDealService _dealService;

    public DealsController(IDealService dealService)
    {
        _dealService = dealService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<DealDto>>>> GetDeals(
        [FromQuery] DealFilterRequest filter,
        CancellationToken cancellationToken)
    {
        var result = await _dealService.GetDealsAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResponse<DealDto>>.Ok(result));
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<ApiResponse<DealMetricsDto>>> GetMetrics(CancellationToken cancellationToken)
    {
        var result = await _dealService.GetDealMetricsAsync(cancellationToken);
        return Ok(ApiResponse<DealMetricsDto>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<DealDto>>> GetDealById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _dealService.GetDealByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<DealDto>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<DealDto>>> CreateDeal(
        [FromBody] CreateDealRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _dealService.CreateDealAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetDealById), new { id = result.Id }, ApiResponse<DealDto>.Ok(result, "Deal opportunity created successfully."));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<DealDto>>> UpdateDeal(
        Guid id,
        [FromBody] UpdateDealRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _dealService.UpdateDealAsync(id, request, cancellationToken);
        return Ok(ApiResponse<DealDto>.Ok(result, "Deal opportunity updated successfully."));
    }

    [HttpPatch("{id}/stage")]
    public async Task<ActionResult<ApiResponse<DealDto>>> UpdateDealStage(
        Guid id,
        [FromBody] UpdateDealStageRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _dealService.UpdateDealStageAsync(id, request, cancellationToken);
        return Ok(ApiResponse<DealDto>.Ok(result, $"Deal stage transitioned to {result.Stage}."));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteDeal(Guid id, CancellationToken cancellationToken)
    {
        await _dealService.DeleteDealAsync(id, cancellationToken);
        return Ok(ApiResponse<string>.Ok("Deal deleted successfully.", "Deal opportunity removed."));
    }
}
