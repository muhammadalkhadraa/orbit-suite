using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Modules.Support;
using Orbit.Application.Modules.Support.Dtos;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/tickets")]
public class TicketsController : ControllerBase
{
    private readonly ITicketService _ticketService;

    public TicketsController(ITicketService ticketService)
    {
        _ticketService = ticketService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<SupportTicketDto>>>> GetTickets(
        [FromQuery] TicketFilterRequest filter,
        CancellationToken cancellationToken)
    {
        var result = await _ticketService.GetTicketsAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResponse<SupportTicketDto>>.Ok(result));
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<ApiResponse<TicketMetricsDto>>> GetMetrics(CancellationToken cancellationToken)
    {
        var result = await _ticketService.GetTicketMetricsAsync(cancellationToken);
        return Ok(ApiResponse<TicketMetricsDto>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<SupportTicketDto>>> GetTicketById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _ticketService.GetTicketByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<SupportTicketDto>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<SupportTicketDto>>> CreateTicket(
        [FromBody] CreateTicketRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _ticketService.CreateTicketAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetTicketById), new { id = result.Id }, ApiResponse<SupportTicketDto>.Ok(result, "Support ticket created successfully."));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<SupportTicketDto>>> UpdateTicket(
        Guid id,
        [FromBody] UpdateTicketRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _ticketService.UpdateTicketAsync(id, request, cancellationToken);
        return Ok(ApiResponse<SupportTicketDto>.Ok(result, "Support ticket updated successfully."));
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<ApiResponse<SupportTicketDto>>> UpdateTicketStatus(
        Guid id,
        [FromBody] UpdateTicketStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _ticketService.UpdateTicketStatusAsync(id, request, cancellationToken);
        return Ok(ApiResponse<SupportTicketDto>.Ok(result, $"Support ticket transitioned to {result.Status}."));
    }

    [HttpPost("{id}/comments")]
    public async Task<ActionResult<ApiResponse<TicketCommentDto>>> AddComment(
        Guid id,
        [FromBody] AddTicketCommentRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _ticketService.AddCommentAsync(id, request, cancellationToken);
        return Ok(ApiResponse<TicketCommentDto>.Ok(result, "Ticket note recorded."));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteTicket(Guid id, CancellationToken cancellationToken)
    {
        await _ticketService.DeleteTicketAsync(id, cancellationToken);
        return Ok(ApiResponse<string>.Ok("Support ticket deleted.", "Ticket removed."));
    }
}
