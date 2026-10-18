using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Modules.Finance;
using Orbit.Application.Modules.Finance.Dtos;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/finance/invoices")]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;

    public InvoicesController(IInvoiceService invoiceService)
    {
        _invoiceService = invoiceService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<InvoiceDto>>>> GetInvoices(
        [FromQuery] InvoiceFilterRequest filter,
        CancellationToken cancellationToken)
    {
        var result = await _invoiceService.GetInvoicesAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResponse<InvoiceDto>>.Ok(result));
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<ApiResponse<FinancialMetricsDto>>> GetMetrics(CancellationToken cancellationToken)
    {
        var result = await _invoiceService.GetFinancialMetricsAsync(cancellationToken);
        return Ok(ApiResponse<FinancialMetricsDto>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> GetInvoiceById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _invoiceService.GetInvoiceByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<InvoiceDto>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> CreateInvoice(
        [FromBody] CreateInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _invoiceService.CreateInvoiceAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetInvoiceById), new { id = result.Id }, ApiResponse<InvoiceDto>.Ok(result, "Draft invoice created successfully."));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> UpdateInvoice(
        Guid id,
        [FromBody] UpdateInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _invoiceService.UpdateInvoiceAsync(id, request, cancellationToken);
        return Ok(ApiResponse<InvoiceDto>.Ok(result, "Invoice updated successfully."));
    }

    [HttpPost("{id}/issue")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> IssueInvoice(Guid id, CancellationToken cancellationToken)
    {
        var result = await _invoiceService.IssueInvoiceAsync(id, cancellationToken);
        return Ok(ApiResponse<InvoiceDto>.Ok(result, $"Invoice '{result.InvoiceNumber}' issued to client."));
    }

    [HttpPost("{id}/void")]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> VoidInvoice(Guid id, CancellationToken cancellationToken)
    {
        var result = await _invoiceService.VoidInvoiceAsync(id, cancellationToken);
        return Ok(ApiResponse<InvoiceDto>.Ok(result, $"Invoice '{result.InvoiceNumber}' voided."));
    }

    [HttpPost("{id}/payments")]
    public async Task<ActionResult<ApiResponse<PaymentRecordDto>>> RecordPayment(
        Guid id,
        [FromBody] RecordPaymentRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _invoiceService.RecordPaymentAsync(id, request, cancellationToken);
        return Ok(ApiResponse<PaymentRecordDto>.Ok(result, $"Payment of {result.Amount:C} successfully recorded."));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteInvoice(Guid id, CancellationToken cancellationToken)
    {
        await _invoiceService.DeleteInvoiceAsync(id, cancellationToken);
        return Ok(ApiResponse<string>.Ok("Draft invoice deleted.", "Invoice removed."));
    }
}
